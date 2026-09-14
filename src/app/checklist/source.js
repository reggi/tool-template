import { ValidationError, clone, createId } from "../../core/index.js";
import { validateState } from "./state.js";

export function parseSource(source, previousState) {
  if (typeof source !== "string") throw new ValidationError("Source must be text.", "$source");
  const previousByLabel = new Map(previousState.items.map((item) => [item.label, item]));
  const labels = source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (labels.length > 1000) throw new ValidationError("At most 1,000 source rows are supported.", "$source");
  const seen = new Set();
  const items = labels.map((label, index) => {
    if (seen.has(label)) throw new ValidationError(`Duplicate label "${label}".`, `$source:${index + 1}`);
    seen.add(label);
    return previousByLabel.get(label) || { id: createId("item"), label };
  });
  return validateState({ ...clone(previousState), items });
}

export function serializeSource(state) {
  return state.items.map((item) => item.label).join("\n");
}

export function renderSourcePreview({ container, state }) {
  const list = document.createElement("ol");
  list.className = "preview-list";
  state.items.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item.label;
    list.append(row);
  });
  if (!state.items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "The parsed project has no items.";
    container.append(empty);
    return;
  }
  container.append(list);
}
