import { ValidationError, createId } from "../../core/index.js";

export const SCHEMA_VERSION = 1;

function requireObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Expected an object.", path);
  }
}

function requireText(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Expected non-empty text.", path);
  }
}

export function createState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: [
      { id: createId("item"), label: "Write the primary task" },
      { id: createId("item"), label: "Define durable state" },
      { id: createId("item"), label: "Map actions to commands" },
    ],
    settings: { density: "comfortable" },
  };
}

export function validateState(candidate) {
  requireObject(candidate, "$");
  if (candidate.schemaVersion !== SCHEMA_VERSION) {
    throw new ValidationError(`Expected schemaVersion ${SCHEMA_VERSION}; received ${String(candidate.schemaVersion)}.`, "$.schemaVersion");
  }
  if (!Array.isArray(candidate.items)) throw new ValidationError("Expected an array.", "$.items");
  if (candidate.items.length > 1000) throw new ValidationError("At most 1,000 items are supported.", "$.items");

  const ids = new Set();
  const labels = new Set();
  const items = candidate.items.map((item, index) => {
    const path = `$.items[${index}]`;
    requireObject(item, path);
    requireText(item.id, `${path}.id`);
    requireText(item.label, `${path}.label`);
    const label = item.label.trim();
    if (ids.has(item.id)) throw new ValidationError(`Duplicate item ID "${item.id}".`, `${path}.id`);
    if (labels.has(label)) throw new ValidationError(`Duplicate item label "${label}".`, `${path}.label`);
    ids.add(item.id);
    labels.add(label);
    return { id: item.id, label };
  });

  requireObject(candidate.settings, "$.settings");
  if (!["comfortable", "compact"].includes(candidate.settings.density)) {
    throw new ValidationError('Expected "comfortable" or "compact".', "$.settings.density");
  }
  return { schemaVersion: SCHEMA_VERSION, items, settings: { density: candidate.settings.density } };
}

export function migrateState(candidate) {
  if (candidate?.schemaVersion === SCHEMA_VERSION) return validateState(candidate);
  throw new ValidationError(
    `Schema version ${String(candidate?.schemaVersion)} is unsupported. This application supports version ${SCHEMA_VERSION}.`,
    "$.schemaVersion",
  );
}
