import { ValidationError } from "../errors.js";

export function tokenize(input) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaping = false;
  for (const character of input.trim()) {
    if (escaping) {
      current += character === "n" ? "\n" : character;
      escaping = false;
    } else if (character === "\\") {
      escaping = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else current += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += character;
    }
  }
  if (escaping || quote) throw new ValidationError("Unclosed quote or escape.", "$command");
  if (current) tokens.push(current);
  return tokens;
}

export function parseCommand(input, definitions, context) {
  const [name, ...args] = tokenize(input);
  const definition = definitions.find((entry) => entry.name === name || entry.aliases?.includes(name));
  if (!definition) throw new ValidationError(`Unknown command "${name || ""}".`, "$command");
  return { definition, payload: definition.parse(args, context), input };
}

export function exactArguments(name, args, count) {
  if (args.length !== count) {
    throw new ValidationError(`${name} expects ${count} argument${count === 1 ? "" : "s"}; received ${args.length}.`, "$command");
  }
}

export function historyEntry({ input, origin, status = "succeeded", result = "", now = new Date().toISOString(), createId }) {
  let normalized = null;
  try {
    const [command, ...args] = tokenize(input);
    normalized = command ? { command, arguments: args } : null;
  } catch {
    normalized = null;
  }
  return { id: createId("command"), timestamp: now, origin, input, normalized, status, result };
}
