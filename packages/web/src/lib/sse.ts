"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "./store";

export function useSSE(projectId: number | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const setSseConnected = useAppStore((s) => s.setSseConnected);

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
      console.log("run.started", JSON.parse(e.data));
    });

    es.addEventListener("run.output", (e) => {
      console.log("run.output", JSON.parse(e.data));
    });

    es.addEventListener("run.finished", (e) => {
      console.log("run.finished", JSON.parse(e.data));
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [projectId, setSseConnected]);
}
