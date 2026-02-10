interface TaskDrawerProps {
  show: boolean;
  onClose: () => void;
  taskForm: { title: string; description: string; writeScope: string };
  onFormChange: (form: { title: string; description: string; writeScope: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function TaskDrawer({
  show,
  onClose,
  taskForm,
  onFormChange,
  onSubmit,
  isSubmitting,
}: TaskDrawerProps) {
  return (
    <>
      {/* Drawer Backdrop */}
      {show && (
        <div className="fixed inset-0 bg-black/55 z-40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-[500px] max-w-[92vw] border-l z-50 flex flex-col transition-transform duration-150 ${show ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "#252526", borderColor: "#3c3c3c" }}
      >
        <div className="h-11 px-3 flex items-center gap-2.5 border-b" style={{ borderColor: "#3c3c3c" }}>
          <div className="text-[13px] font-semibold">タスク作成</div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border"
            style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
          >
            閉じる
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex-1 overflow-auto p-3" style={{ background: "#1b1b1b" }}>
          <div className="mb-3">
            <label className="block text-xs text-[#a0a0a0] mb-1.5">タイトル（必須）</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => onFormChange({ ...taskForm, title: e.target.value })}
              className="w-full px-2.5 py-2 text-[13px] rounded-md border outline-none"
              style={{ background: "#111", borderColor: "#3c3c3c", color: "#d4d4d4" }}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#a0a0a0] mb-1.5">説明</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => onFormChange({ ...taskForm, description: e.target.value })}
              className="w-full px-2.5 py-2 text-[13px] rounded-md border outline-none resize-y"
              style={{ background: "#111", borderColor: "#3c3c3c", color: "#d4d4d4", minHeight: 90 }}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#a0a0a0] mb-1.5">書き込みスコープ（必須）</label>
            <input
              type="text"
              value={taskForm.writeScope}
              onChange={(e) => onFormChange({ ...taskForm, writeScope: e.target.value })}
              className="w-full px-2.5 py-2 text-[13px] rounded-md border outline-none font-mono"
              style={{ background: "#111", borderColor: "#3c3c3c", color: "#d4d4d4" }}
              placeholder="src/**, tests/**"
              required
            />
            <p className="text-xs text-[#a0a0a0] mt-1.5">
              個人情報/秘密情報をAIから隠す場合は除外パターン（設定）を使用
            </p>
          </div>
        </form>
        <div className="h-15 px-3 flex items-center justify-end gap-2.5 border-t" style={{ borderColor: "#3c3c3c", background: "#252526" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border"
            style={{ background: "#2d2d2d", borderColor: "#3c3c3c", color: "#d4d4d4" }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer border disabled:opacity-50"
            style={{ background: "#0e639c", borderColor: "rgba(255,255,255,0.12)", color: "#d4d4d4" }}
          >
            {isSubmitting ? "..." : "作成"}
          </button>
        </div>
      </div>
    </>
  );
}

