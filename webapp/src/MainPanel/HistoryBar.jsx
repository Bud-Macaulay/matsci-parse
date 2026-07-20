export default function HistoryBar({ undoStack, onUndo, onRedo, redoDisabled }) {
  return (
    <div className="px-6 py-2 flex items-center justify-between gap-3 border-b">
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!undoStack.length}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          disabled={redoDisabled}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          Redo
        </button>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-gray-600 overflow-x-auto max-w-[85%]">
        HISTORY:
        {undoStack.slice(-6).map((h, i) => (
          <div
            key={h.timestamp || i}
            className="px-2 py-2 bg-gray-50 border-r whitespace-nowrap"
            title={h.label || h.action}
          >
            {h.label || h.action || "edit"}
          </div>
        ))}
      </div>
    </div>
  );
}
