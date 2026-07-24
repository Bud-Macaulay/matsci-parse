let globalId = 0;
let globalListener = null;

export function showToast(message, variant = "error") {
  if (globalListener) {
    globalListener({ id: ++globalId, message, variant });
  }
}

export function registerToastListener(listener) {
  globalListener = listener;
}

export function unregisterToastListener() {
  globalListener = null;
}
