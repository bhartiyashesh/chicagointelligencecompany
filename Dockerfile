FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY agent.py agent_base.py supply_chain_agent.py report_generator.py supply_chain_report_generator.py ./
COPY server/ server/
COPY tools/ tools/

# Create directories for runtime data
RUN mkdir -p scratchpad reports cache uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start server
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
