import { create } from "zustand";

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
}

export const useAppStore = create<AppState>((set) => ({
  currentProjectId: null,
  setCurrentProject: (id) => set({ currentProjectId: id }),

  selectedRunId: null,
  setSelectedRun: (id) => set({ selectedRunId: id }),

  sseConnected: false,
  setSseConnected: (connected) => set({ sseConnected: connected }),
}));
