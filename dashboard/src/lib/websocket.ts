"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentEvent } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export function useAgentWebSocket(
  runId: string | null,
  onEvent: (event: AgentEvent) => void
) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const onEventRef = useRef(onEvent);
  const gotStreamEnd = useRef(false);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!runId || runId === "demo") return;

    const ws = new WebSocket(`${WS_BASE}/ws/${runId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      setDisconnected(false);
      retriesRef.current = 0;
    };

    ws.onmessage = (evt) => {
      try {
        const event: AgentEvent = JSON.parse(evt.data);
        if (event.type === "ping") return;
        if (event.type === "stream_end") gotStreamEnd.current = true;
        onEventRef.current(event);
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setError("WebSocket error");
    };

    ws.onclose = (evt) => {
      setConnected(false);
      wsRef.current = null;

      // If we already got stream_end, the run completed successfully — don't reconnect
      if (gotStreamEnd.current) return;

      // Reconnect if not a clean close and we haven't exhausted retries
      if (evt.code !== 1000 && retriesRef.current < 3) {
        retriesRef.current++;
        setTimeout(connect, 2000 * retriesRef.current);
      } else if (evt.code !== 1000) {
        // All retries exhausted — signal disconnection so UI can show "start new analysis"
        setDisconnected(true);
        onEventRef.current({
          type: "api_error",
          error: "Connection lost. The server may have restarted. Start a new analysis.",
          fatal: true,
        });
      }
    };
  }, [runId]);

  useEffect(() => {
    gotStreamEnd.current = false;
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected, error, disconnected };
}
