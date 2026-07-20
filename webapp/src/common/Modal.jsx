import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md",
}) {
  const backdropRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} mx-4 flex flex-col max-h-[80vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-4 py-2.5 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}

        <div className="px-4 py-3 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-4 py-2.5 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ModalButton({ children, onClick, variant = "primary", ...rest }) {
  const base = "px-3 py-1.5 text-sm rounded-md transition";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    cancel: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]}`}
      {...rest}
    >
      {children}
    </button>
  );
}
