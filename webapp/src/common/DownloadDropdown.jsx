import { useState, useRef, useEffect } from "react";

export function DownloadIcon({ size = 14, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generic download icon button with a dropdown menu.
 *
 * Each item is `{ key, label, filename, serialize: () => string }`.
 */
export default function DownloadDropdown({
  items,
  menuClassName = "w-28",
  title = "Download",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const handleDownload = (item) => {
    downloadFile(item.serialize(), item.filename);
    setOpen(false);
  };

  // close the dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center px-2.5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 hover:cursor-pointer transition shadow-sm"
        title={title}
      >
        <DownloadIcon />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute right-0 mt-1 ${menuClassName} bg-white border rounded-md shadow-md z-50`}
        >
          <ul className="py-1">
            {items.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => handleDownload(item)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
