import { ValidationError } from "./errors.js";

const requiredFunctions = [
  ["state", "create"],
  ["state", "validate"],
  ["state", "migrate"],
  ["source", "parse"],
  ["source", "serialize"],
  ["source", "renderPreview"],
  ["workspace", "render"],
  ["project", "renderPreview"],
  ["actions", "reduce"],
  ["actions", "describe"],
  ["actions", "toCommand"],
];

export function defineApplication(application) {
  for (const [group, name] of requiredFunctions) {
    if (typeof application[group]?.[name] !== "function") {
      throw new ValidationError(`Application contract requires ${group}.${name}().`, `$.${group}.${name}`);
    }
  }
  if (!application.id || !application.title || !application.storageKey) {
    throw new ValidationError("Application id, title, and storageKey are required.", "$application");
  }
  if (!Array.isArray(application.commands)) throw new ValidationError("Application commands must be an array.", "$.commands");
  return Object.freeze(application);
}
