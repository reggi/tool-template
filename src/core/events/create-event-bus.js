export function createEventBus(root, listeners = []) {
  const subscribers = new Set(listeners.filter(Boolean));

  function emit(type, detail = {}) {
    const event = { type, timestamp: new Date().toISOString(), ...detail };
    subscribers.forEach((listener) => listener(event));
    root.dispatchEvent(new CustomEvent(`html-tool:${type}`, { bubbles: true, detail: event }));
    return event;
  }

  root.addEventListener("click", (browserEvent) => {
    const control = browserEvent.target.closest("button");
    if (!control || !root.contains(control)) return;
    emit("control", {
      control: control.dataset.control || control.id || control.textContent.trim(),
      element: control,
      browserEvent,
    });
  }, true);

  return {
    emit,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };
}
