const STORAGE_KEY = "matsci_saved_structures";

export function loadSavedStructures() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveSavedStructures(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
