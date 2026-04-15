import { cifToStructure, structureToCif } from "matsci-parse";
import { useHotkey } from "@tanstack/react-hotkeys";

import SidePanel from "./SidePanel";
import MainPanel from "./MainPanel";

import { useStore } from "@tanstack/react-store";
import { appStore, actions } from "./store/appStore";

export default function App() {
  const tabs = useStore(appStore, (s) => s.tabs);
  const activeTabId = useStore(appStore, (s) => s.activeTabId);
  const autosave = useStore(appStore, (s) => s.autosave);

  const activeTab = tabs.find((t) => t.id === activeTabId);

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
    <div className="flex h-screen overflow-hidden">
      <SidePanel
        autosave={autosave}
        setAutosave={actions.setAutosave}
        structure={activeTab?.structure ?? null}
        structureToCif={structureToCif}
        cifToStructure={cifToStructure}
        onLoadStructure={(parsed, meta) => actions.createTab(parsed, meta)}
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
                onClick={() => actions.setActiveTab(tab.id)}
                className="px-3 py-2 text-sm"
              >
                {tab.name}
              </button>

              <button
                onClick={() => actions.closeTab(tab.id)}
                className="px-2 mr-1 text-gray-400 hover:text-red-500 hover:bg-red-300 rounded-md"
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
    </div>
  );
}
