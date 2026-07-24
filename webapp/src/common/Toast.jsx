import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  registerToastListener,
  unregisterToastListener,
} from "./toastStore";

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    registerToastListener((toast) => {
      setToasts((prev) => [...prev, toast]);
    });
    return () => {
      unregisterToastListener();
    };
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (!toasts.length) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>,
    document.body,
  );
}

function Toast({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = {
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 shadow-lg text-sm flex items-start gap-3 transition-all duration-300 ${colors[toast.variant] || colors.error} ${exiting ? "opacity-0 translate-y-2" : "opacity-100"}`}
    >
      <span className="flex-1 break-words">{toast.message}</span>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(onDismiss, 300);
        }}
        className="text-current opacity-50 hover:opacity-100 text-lg leading-none mt-[-2px]"
      >
        &times;
      </button>
    </div>
  );
}
