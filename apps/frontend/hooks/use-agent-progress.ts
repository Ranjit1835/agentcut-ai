"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentStatus {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  confidence: number | null;
  summary: string | null;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
}

const AGENT_NAMES = [
  "ingest",
  "transcript",
  "story",
  "cut",
  "broll",
  "caption",
  "effects",
  "quality",
  "render",
] as const;

const INITIAL_AGENTS: AgentStatus[] = AGENT_NAMES.map((name) => ({
  name,
  status: "pending",
  confidence: null,
  summary: null,
  progressPercent: 0,
  startedAt: null,
  completedAt: null,
}));

interface UseAgentProgressReturn {
  agents: AgentStatus[];
  isConnected: boolean;
  error: string | null;
  pipelineStatus: "idle" | "running" | "completed" | "failed";
}

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export function useAgentProgress(
  projectId: string | null
): UseAgentProgressReturn {
  const [agents, setAgents] = useState<AgentStatus[]>(INITIAL_AGENTS);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<
    "idle" | "running" | "completed" | "failed"
  >("idle");

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "pong") return;

      if (data.type === "pipeline_status") {
        setPipelineStatus(data.status);
        return;
      }

      if (data.type === "agent_progress") {
        const { agent_name, status, progress_percent, message, confidence_score, timestamp } = data;

        setAgents((prev) =>
          prev.map((agent) => {
            if (agent.name !== agent_name) return agent;
            return {
              ...agent,
              status,
              progressPercent: progress_percent ?? agent.progressPercent,
              summary: message ?? agent.summary,
              confidence: confidence_score ?? agent.confidence,
              startedAt:
                status === "running" ? timestamp ?? agent.startedAt : agent.startedAt,
              completedAt:
                status === "completed" || status === "failed"
                  ? timestamp ?? agent.completedAt
                  : agent.completedAt,
            };
          })
        );

        // Auto-detect pipeline completion
        if (status === "completed" && agent_name === "render") {
          setPipelineStatus("completed");
        }
        if (status === "failed") {
          setPipelineStatus("failed");
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  const connect = useCallback(() => {
    if (!projectId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const wsUrl = apiUrl.replace(/^http/, "ws") + `/api/v1/ws/${projectId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      retryCountRef.current = 0;
      setPipelineStatus("running");
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      // Reconnect with exponential backoff unless pipeline is done
      if (
        retryCountRef.current < MAX_RETRIES &&
        pipelineStatus === "running"
      ) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
    };
  }, [projectId, handleMessage, pipelineStatus]);

  useEffect(() => {
    connect();

    // Ping keepalive every 30s
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);

    return () => {
      clearInterval(pingInterval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { agents, isConnected, error, pipelineStatus };
}
