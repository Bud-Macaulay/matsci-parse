import { Store } from "@tanstack/store";

export const appStore = new Store({
  tabs: [],
  activeTabId: null,
  autosave: true,
});

export const actions = {
  setAutosave(value) {
    appStore.setState((s) => ({
      ...s,
      autosave: value,
    }));
  },

  createTab(structure, meta = {}) {
    const id = crypto.randomUUID();

    appStore.setState((s) => ({
      ...s,
      tabs: [
        ...s.tabs,
        {
          id,
          name: meta.name ?? "Untitled",
          structure,
          undoStack: [],
        },
      ],
      activeTabId: id,
    }));
  },

  closeTab(id) {
    appStore.setState((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);

      return {
        ...s,
        tabs,
        activeTabId:
          s.activeTabId === id ? (tabs.at(-1)?.id ?? null) : s.activeTabId,
      };
    });
  },

  setActiveTab(id) {
    appStore.setState((s) => ({
      ...s,
      activeTabId: id,
    }));
  },

  updateTab(id, updater) {
    appStore.setState((s) => ({
      ...s,
      tabs: s.tabs.map((t) => (t.id === id ? updater(t) : t)),
    }));
  },
};
