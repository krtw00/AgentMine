import { create } from "zustand";

export interface OutputLine {
  type: "stdout" | "stderr" | "exit" | "system";
  data?: string;
  exitCode?: number;
  timestamp: string;
}

interface AppState {
  // 現在選択中のProject
  currentProjectId: number | null;
  setCurrentProject: (id: number | null) => void;

  // 選択中のRun（詳細パネル表示用）
  selectedRunId: number | null;
  setSelectedRun: (id: number | null) => void;

  // SSE接続状態
  sseConnected: boolean;
  setSseConnected: (connected: boolean) => void;

  // Runのリアルタイム出力バッファ
  runOutputs: Map<number, OutputLine[]>;
  appendRunOutput: (runId: number, line: OutputLine) => void;
  clearRunOutputs: (runId: number) => void;

  // ライブセッション（選択中のparentTaskId）
  activeSessionId: number | null;
  setActiveSessionId: (id: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProjectId: null,
  setCurrentProject: (id) => set({ currentProjectId: id }),

  selectedRunId: null,
  setSelectedRun: (id) => set({ selectedRunId: id }),

  sseConnected: false,
  setSseConnected: (connected) => set({ sseConnected: connected }),

  runOutputs: new Map(),
  appendRunOutput: (runId, line) =>
    set((state) => {
      const next = new Map(state.runOutputs);
      const lines = next.get(runId) ?? [];
      // 最大5000行に制限
      const updated = lines.length >= 5000 ? [...lines.slice(-4000), line] : [...lines, line];
      next.set(runId, updated);
      return { runOutputs: next };
    }),
  clearRunOutputs: (runId) =>
    set((state) => {
      const next = new Map(state.runOutputs);
      next.delete(runId);
      return { runOutputs: next };
    }),

  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
}));
