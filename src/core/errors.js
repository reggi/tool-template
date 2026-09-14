export class ValidationError extends Error {
  constructor(message, path = "$") {
    super(message);
    this.name = "ValidationError";
    this.path = path;
  }
}

export function errorMessage(error) {
  if (error instanceof ValidationError) return `${error.path}: ${error.message}`;
  if (error instanceof SyntaxError) return `JSON: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
