"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore, type OutputLine } from "./store";

export function useSSE(projectId: number | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const setSseConnected = useAppStore((s) => s.setSseConnected);
  const appendRunOutput = useAppStore((s) => s.appendRunOutput);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const url = `/api/events?project_id=${projectId}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setSseConnected(true);
    });

    es.addEventListener("ping", () => {
      // keep-alive
    });

    es.addEventListener("run.started", (e) => {
      const data = JSON.parse(e.data);
      appendRunOutput(data.runId, {
        type: "system",
        data: `実行 #${data.runId} を開始しました`,
        timestamp: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["allRuns", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    });

    es.addEventListener("run.output", (e) => {
      const data = JSON.parse(e.data) as OutputLine & { runId: number };
      appendRunOutput(data.runId, {
        type: data.type,
        data: data.data,
        exitCode: data.exitCode,
        timestamp: data.timestamp,
      });
    });

    es.addEventListener("run.finished", (e) => {
      const data = JSON.parse(e.data);
      appendRunOutput(data.runId, {
        type: "system",
        data: `実行 #${data.runId} が${data.status === "completed" ? "完了" : "失敗"}しました (exitCode: ${data.exitCode})`,
        timestamp: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["allRuns", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    });

    es.addEventListener("run.cancelled", (e) => {
      const data = JSON.parse(e.data);
      appendRunOutput(data.runId, {
        type: "system",
        data: `実行 #${data.runId} がキャンセルされました`,
        timestamp: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["allRuns", projectId] });
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [projectId, setSseConnected, appendRunOutput, queryClient]);
}
