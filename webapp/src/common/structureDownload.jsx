import { useState, useRef, useEffect } from "react";

import {
  structureToXyz,
  structureToPoscar,
  structureToXsf,
  structureToCif,
} from "matsci-parse";

const defaultFormats = [
  { format: "json", label: "JSON" },
  { format: "cif", label: "CIF" },
  { format: "xyz", label: "XYZ" },
  { format: "xsf", label: "XSF" },
  { format: "poscar", label: "VASP" },
];

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

// === Download Helper ===
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

// === Component ===
export default function StructureDownload({ structure, download_formats }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const downloadFormats = download_formats || defaultFormats;

  const handleDownload = (format) => {
    let content = "";
    let filename = "structure";

    if (format === "cif") {
      content = structureToCif(structure);
      filename += ".cif";
    } else if (format === "xyz") {
      content = structureToXyz(structure);
      filename += ".xyz";
    } else if (format === "poscar") {
      content = structureToPoscar(structure);
      filename += ".vasp";
    } else if (format === "xsf") {
      content = structureToXsf(structure);
      filename += ".xsf";
    } else if (format === "json") {
      content = JSON.stringify(structure, null, 2);
      filename += ".json";
    }

    if (content) downloadFile(content, filename);
    setOpen(false);
  };

  // outside click
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
        className="flex items-center justify-center px-2.5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
        title="Download"
      >
        <DownloadIcon />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-1 w-28 bg-white border rounded-md shadow-md z-50">
          <ul className="py-1">
            {downloadFormats.map(({ format, label }) => (
              <li key={format}>
                <button
                  onClick={() => handleDownload(format)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
