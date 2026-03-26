"""
FastAPI server — WebSocket streaming of agent events.

Start: uvicorn server.main:app --reload --port 8000
"""

import asyncio
import json
import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .runner import AgentRunner
from .cache import get_cached_report, save_to_cache, list_cached_reports, clear_expired

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = FastAPI(title="CIC Agent Server")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

runner = AgentRunner()


class AnalyzeRequest(BaseModel):
    company: str
    pitch_context: str | None = None
    analysis_type: str = "diligence"
    force_fresh: bool = False  # Skip cache if true


@app.post("/api/analyze")
async def start_analysis(req: AnalyzeRequest):
    # Check cache first (unless user uploaded a pitch deck or requested fresh)
    if not req.force_fresh and not req.pitch_context:
        # Supply chain reports use 48h TTL, diligence uses 24h
        ttl = 172800 if req.analysis_type == "supply_chain" else 86400
        cache_company = f"{req.analysis_type}:{req.company}" if req.analysis_type != "diligence" else req.company
        cached = get_cached_report(cache_company, ttl=ttl)
        if cached:
            return {
                "run_id": f"cached_{hash(cache_company) & 0xFFFFFF:06x}",
                "company": req.company,
                "cached": True,
                "age_hours": cached["age_hours"],
                "report": cached["report"],
                "report_paths": cached.get("report_paths", {}),
            }

    loop = asyncio.get_event_loop()
    run_id = runner.start_run(req.company, loop, pitch_context=req.pitch_context, analysis_type=req.analysis_type)
    return {"run_id": run_id, "company": req.company, "cached": False}


@app.post("/api/upload-pitch")
async def upload_pitch(file: UploadFile = File(...)):
    """Upload a pitch deck (PDF/TXT/MD). Extracts text content for agent context."""
    if not file.filename:
        return JSONResponse({"error": "No file provided"}, status_code=400)

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".txt", ".md", ".csv"):
        return JSONResponse({"error": f"Unsupported file type: {ext}. Use PDF, TXT, MD, or CSV."}, status_code=400)

    content = await file.read()
    save_path = os.path.join(UPLOADS_DIR, file.filename)
    with open(save_path, "wb") as f:
        f.write(content)

    # Extract text
    extracted = ""
    if ext == ".pdf":
        try:
            import subprocess
            result = subprocess.run(
                ["python3", "-c", f"""
import sys
try:
    import PyPDF2
    reader = PyPDF2.PdfReader('{save_path}')
    text = '\\n'.join(page.extract_text() or '' for page in reader.pages)
    print(text)
except ImportError:
    # Fallback: read raw bytes and extract printable text
    with open('{save_path}', 'rb') as f:
        raw = f.read()
    import re
    text = re.sub(rb'[^\\x20-\\x7e\\n\\r\\t]', b' ', raw).decode('ascii', errors='ignore')
    text = re.sub(r'\\s+', ' ', text).strip()
    print(text[:50000])
"""],
                capture_output=True, text=True, timeout=30
            )
            extracted = result.stdout.strip()[:50000]
        except Exception:
            extracted = f"[PDF uploaded: {file.filename} - {len(content)} bytes. Text extraction unavailable.]"
    else:
        extracted = content.decode("utf-8", errors="ignore")[:50000]

    return {
        "filename": file.filename,
        "size": len(content),
        "extracted_chars": len(extracted),
        "content": extracted,
    }


@app.websocket("/ws/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    run_state = runner.get_run(run_id)
    if not run_state:
        await websocket.close(code=4004, reason="Run not found")
        return

    await websocket.accept()

    try:
        while True:
            try:
                event = await asyncio.wait_for(run_state.queue.get(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({"type": "ping"})
                continue

            if event.get("type") == "__done__":
                await websocket.send_json({"type": "stream_end"})
                break

            await websocket.send_json(event)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@app.get("/api/report/{run_id}")
async def get_report(run_id: str):
    run_state = runner.get_run(run_id)
    if not run_state:
        return JSONResponse({"error": "Run not found"}, status_code=404)
    if not run_state.report:
        return JSONResponse({"error": "Report not ready"}, status_code=202)
    return JSONResponse(run_state.report)


@app.get("/api/download/{run_id}/{fmt}")
async def download_report(run_id: str, fmt: str):
    run_state = runner.get_run(run_id)
    if not run_state:
        return JSONResponse({"error": "Run not found"}, status_code=404)

    path = run_state.report_paths.get(fmt, "")
    if not path or not os.path.exists(path):
        return JSONResponse({"error": f"File not available for format: {fmt}"}, status_code=404)

    media_types = {
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv",
        "json": "application/json",
    }
    return FileResponse(
        path,
        media_type=media_types.get(fmt, "application/octet-stream"),
        filename=os.path.basename(path),
    )


@app.get("/api/download-all/{run_id}")
async def download_all(run_id: str):
    """Download all report files as a ZIP archive."""
    import zipfile
    import tempfile

    run_state = runner.get_run(run_id)
    if not run_state:
        return JSONResponse({"error": "Run not found"}, status_code=404)
    if not run_state.report_paths:
        return JSONResponse({"error": "No reports available"}, status_code=404)

    zip_path = os.path.join(tempfile.gettempdir(), f"cic_{run_id}_reports.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fmt, path in run_state.report_paths.items():
            if path and os.path.exists(path):
                zf.write(path, os.path.basename(path))
        # Also include scratchpad files if agent state is available
        if run_state.agent_state:
            for fn, content in run_state.agent_state.scratchpad.items():
                zf.writestr(f"scratchpad/{fn}", content)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"{run_state.company.replace(' ', '_')}_CIC_Analysis.zip",
    )


@app.get("/api/runs")
async def list_runs():
    return runner.list_runs()


@app.get("/api/cache")
async def list_cache():
    """List all cached reports."""
    return list_cached_reports()


@app.post("/api/cache/clear-expired")
async def clear_cache():
    """Remove expired cache entries."""
    removed = clear_expired()
    return {"removed": removed}


@app.get("/health")
async def health():
    return {"status": "ok"}
