import { Store } from "@tanstack/store";
import { loadSavedStructures, saveSavedStructures } from "../storage/storage";

import {
  toJSON,
  fromJSON,
  findSitesBySpecies,
  replaceSites,
  removeSites,
} from "matsci-parse";
import { parseFileText } from "../common/formats";
import { showToast } from "../common/toastStore";

export const appStore = new Store({
  tabs: [],
  activeTabId: null,
  autosave: true,
  savedStructures: loadSavedStructures(),
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

  async importFile(file) {
    const text = await file.text();

    const { structure } = parseFileText(text);

    const meta = {
      name: `${file.name} (${new Date().toLocaleString()})`,
      source: "file",
    };

    actions.createTab(structure, meta);

    if (appStore.state.autosave) {
      actions.saveStructure(structure, meta.name);
    }

    return structure;
  },

  saveStructure(structure, name) {
    updateSavedStructures((saved) => [
      ...saved,
      {
        id: crypto.randomUUID(),
        name,
        structure: toJSON(structure),
      },
    ]);
  },

  deleteSaved(id) {
    updateSavedStructures((saved) => saved.filter((item) => item.id !== id));
  },

  renameSaved(id, name) {
    updateSavedStructures((saved) =>
      saved.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  },

  bulkReplaceSpecies(oldSp, newSp) {
    let skipped = 0;
    updateSavedStructures((saved) =>
      saved.map((item) => {
        try {
          const structure = fromJSON(item.structure);
          const species = structure.sites.find(
            (s) => s.species.symbol === oldSp,
          )?.species;
          if (!species) return item;
          const indices = findSitesBySpecies(structure, species);
          if (!indices.length) return item;
          const newStructure = replaceSites(
            structure,
            indices.map((i) => ({
              index: i,
              site: { ...structure.sites[i], species: { symbol: newSp } },
            })),
          );
          return { ...item, structure: toJSON(newStructure) };
        } catch {
          skipped++;
          return item;
        }
      }),
    );
    if (skipped) {
      showToast(`${skipped} structure(s) skipped (unparseable)`, "warning");
    }
  },

  bulkRemoveSpecies(sp) {
    let skipped = 0;
    updateSavedStructures((saved) =>
      saved.map((item) => {
        try {
          const structure = fromJSON(item.structure);
          const indices = findSitesBySpecies(structure, { symbol: sp });
          if (!indices.length) return item;
          const newStructure = removeSites(structure, indices);
          return { ...item, structure: toJSON(newStructure) };
        } catch {
          skipped++;
          return item;
        }
      }),
    );
    if (skipped) {
      showToast(`${skipped} structure(s) skipped (unparseable)`, "warning");
    }
  },
};

export function updateSavedStructures(updater) {
  appStore.setState((s) => {
    const savedStructures = updater(s.savedStructures);

    saveSavedStructures(savedStructures);

    return {
      ...s,
      savedStructures,
    };
  });
}
