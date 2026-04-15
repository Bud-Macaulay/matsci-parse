import { useState, useEffect } from "react";
import { cifToStructure, structureToCif } from "matsci-parse";

import { useHotkey } from "@tanstack/react-hotkeys";

import SidePanel from "./SidePanel";
import MainPanel from "./MainPanel";

export default function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [autosave, setAutosave] = useState(true);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const createTab = (structure, meta = {}) => {
    const id = crypto.randomUUID();

    setTabs((prev) => [
      ...prev,
      {
        id,
        name: meta.name ?? "Untitled",
        structure,
        undoStack: [],
      },
    ]);

    setActiveTabId(id);
  };

  const closeTab = (id) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);

      // if we closed active tab, switch intelligently
      if (id === activeTabId) {
        const fallback = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
        setActiveTabId(fallback?.id ?? null);
      }

      return next;
    });
  };

  const updateTab = (id, updater) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const switchTab = (direction) => {
    if (!tabs.length) return;

    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const next =
      direction === "next"
        ? tabs[(idx + 1) % tabs.length]
        : tabs[(idx - 1 + tabs.length) % tabs.length];

    if (next) setActiveTabId(next.id);
  };

  // -------------------------
  // HOTKEYS (centralized)
  // -------------------------

  useHotkey("Mod+1", () => {
    if (tabs[0]) setActiveTabId(tabs[0].id);
  });

  useHotkey("Mod+2", () => {
    if (tabs[1]) setActiveTabId(tabs[1].id);
  });

  useHotkey("Mod+3", () => {
    if (tabs[2]) setActiveTabId(tabs[2].id);
  });

  useHotkey("Mod+4", () => {
    if (tabs[3]) setActiveTabId(tabs[3].id);
  });

  useHotkey("Mod+5", () => {
    if (tabs[4]) setActiveTabId(tabs[4].id);
  });

  useHotkey("Mod+6", () => {
    if (tabs[5]) setActiveTabId(tabs[5].id);
  });

  useHotkey("Mod+7", () => {
    if (tabs[6]) setActiveTabId(tabs[6].id);
  });

  useHotkey("Mod+8", () => {
    if (tabs[7]) setActiveTabId(tabs[7].id);
  });

  useHotkey("Mod+9", () => {
    if (tabs[8]) setActiveTabId(tabs[8].id);
  });

  useHotkey("Mod+]", () => {
    switchTab("next");
  });

  useHotkey("Mod+[", () => {
    switchTab("prev");
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidePanel
        autosave={autosave}
        setAutosave={setAutosave}
        structure={activeTab?.structure ?? null}
        structureToCif={structureToCif}
        cifToStructure={cifToStructure}
        onLoadStructure={(parsed, name) => createTab(parsed, name)}
      />

      <main className="flex-1 flex flex-col h-full bg-gray-50">
        <div className="flex border-b bg-gray-200 overflow-x-auto h-[58px]">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center border-r hover:bg-gray-50 ${
                tab.id === activeTabId ? "bg-blue-200" : ""
              }`}
            >
              <button
                onClick={() => setActiveTabId(tab.id)}
                className="px-3 py-2 text-sm"
              >
                {tab.name}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="px-2 mr-1 text-gray-400 hover:text-red-500 hover:bg-red-300 rounded-md"
                title="Close tab"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <MainPanel
          tab={activeTab}
          updateTab={(fn) => updateTab(activeTabId, fn)}
        />
      </main>
    </div>
  );
}
