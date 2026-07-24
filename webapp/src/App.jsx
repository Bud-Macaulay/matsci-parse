import { useState } from "react";

import { useHotkey } from "@tanstack/react-hotkeys";

import SidePanel from "./SidePanel";
import MainPanel from "./MainPanel";
import ToastContainer from "./common/Toast";
import { showToast } from "./common/toastStore";

import { useStore } from "@tanstack/react-store";
import { appStore, actions } from "./store/appStore";

export default function App() {
  const tabs = useStore(appStore, (s) => s.tabs);
  const activeTabId = useStore(appStore, (s) => s.activeTabId);
  const autosave = useStore(appStore, (s) => s.autosave);
  const [dragging, setDragging] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);

    const files = e.dataTransfer.files;
    if (!files?.length) return;

    for (const file of files) {
      try {
        await actions.importFile(file, { saveOnly: true });
      } catch (err) {
        console.error(err);
        showToast(`${file.name} failed to parse, see console for details`);
      }
    }
  };

  // -------------------------
  // HOTKEYS
  // -------------------------

  useHotkey("Mod+1", () => tabs[0] && actions.setActiveTab(tabs[0].id));
  useHotkey("Mod+2", () => tabs[1] && actions.setActiveTab(tabs[1].id));
  useHotkey("Mod+3", () => tabs[2] && actions.setActiveTab(tabs[2].id));
  useHotkey("Mod+4", () => tabs[3] && actions.setActiveTab(tabs[3].id));
  useHotkey("Mod+5", () => tabs[4] && actions.setActiveTab(tabs[4].id));
  useHotkey("Mod+6", () => tabs[5] && actions.setActiveTab(tabs[5].id));
  useHotkey("Mod+7", () => tabs[6] && actions.setActiveTab(tabs[6].id));
  useHotkey("Mod+8", () => tabs[7] && actions.setActiveTab(tabs[7].id));
  useHotkey("Mod+9", () => tabs[8] && actions.setActiveTab(tabs[8].id));

  useHotkey("Mod+]", () => {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const next = tabs[(idx + 1) % tabs.length];
    if (next) actions.setActiveTab(next.id);
  });

  useHotkey("Mod+[", () => {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    if (prev) actions.setActiveTab(prev.id);
  });

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg px-8 py-5 text-sm font-medium text-blue-700">
            Drop structure files or zip here
          </div>
        </div>
      )}

      <SidePanel
        autosave={autosave}
        setAutosave={actions.setAutosave}
        structure={activeTab?.structure ?? null}
        onLoadStructure={(parsed, meta) => actions.createTab(parsed, meta)}
      />

      <main className="flex-1 flex flex-col h-full bg-gray-50">
        <div className="flex border-b bg-gray-200 overflow-x-auto h-[58px]">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center shrink-0 border-r hover:bg-gray-50 ${
                tab.id === activeTabId ? "bg-blue-200" : ""
              }`}
            >
              <button
                onClick={() => actions.setActiveTab(tab.id)}
                className="px-3 py-2 text-sm"
              >
                {tab.name}
              </button>

              <button
                onClick={() => actions.closeTab(tab.id)}
                className="buttonSimple redNoBg mr-2 text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <MainPanel
          tab={activeTab}
          updateTab={(fn) => actions.updateTab(activeTabId, fn)}
        />
      </main>

      <ToastContainer />
    </div>
  );
}
