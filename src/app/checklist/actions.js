import { ValidationError, clone, createId, quote } from "../../core/index.js";
import { validateState } from "./state.js";

export function reduceAction(state, action, payload = {}) {
  const next = clone(state);
  switch (action) {
    case "checklist.items.add": {
      const label = requireLabel(payload.label);
      if (next.items.some((item) => item.label === label)) throw new ValidationError(`An item named "${label}" already exists.`, "$.label");
      next.items.push({ id: createId("item"), label });
      break;
    }
    case "checklist.items.rename": {
      const item = next.items.find((entry) => entry.id === payload.id);
      if (!item) throw new ValidationError(`Item "${payload.id}" does not exist.`, "$.id");
      item.label = requireLabel(payload.label);
      break;
    }
    case "checklist.items.delete": {
      const index = next.items.findIndex((entry) => entry.id === payload.id);
      if (index < 0) throw new ValidationError(`Item "${payload.id}" does not exist.`, "$.id");
      next.items.splice(index, 1);
      break;
    }
    case "checklist.settings.density.set":
      if (!["comfortable", "compact"].includes(payload.density)) throw new ValidationError("Invalid density.", "$.density");
      next.settings.density = payload.density;
      break;
    default:
      throw new ValidationError(`Unknown application action "${action}".`, "$.action");
  }
  return validateState(next);
}

function requireLabel(value) {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError("Item label is required.", "$.label");
  return value.trim();
}

export function describeAction(action, payload) {
  const descriptions = {
    "checklist.items.add": `Added "${payload.label}".`,
    "checklist.items.rename": `Renamed item ${payload.id}.`,
    "checklist.items.delete": `Deleted item ${payload.id}.`,
    "checklist.settings.density.set": `Density set to ${payload.density}.`,
  };
  return descriptions[action] || "Action completed.";
}

export function actionToCommand(action, payload) {
  const commands = {
    "checklist.items.add": () => `checklist.items.add ${quote(payload.label)}`,
    "checklist.items.rename": () => `checklist.items.rename ${quote(payload.id)} ${quote(payload.label)}`,
    "checklist.items.delete": () => `checklist.items.delete ${quote(payload.id)}`,
    "checklist.settings.density.set": () => `checklist.settings.density.set ${payload.density}`,
  };
  if (!commands[action]) throw new ValidationError(`Action "${action}" has no canonical command.`, "$.action");
  return commands[action]();
}
