import { ValidationError } from "../errors.js";
import { clone, createId } from "../values.js";

export const LIBRARY_SCHEMA_VERSION = 1;
export const PROJECT_DOCUMENT_VERSION = 1;
export const HISTORY_LIMIT = 500;

function requireText(value, path) {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError("Expected non-empty text.", path);
}

export function createProject(application, name, state = application.state.create(), now = new Date().toISOString()) {
  requireText(name, "$.name");
  return {
    id: createId("project"),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    state: application.state.validate(state),
    history: (application.initialCommands || []).map((input, index) => ({
      id: createId("command"),
      timestamp: new Date(Date.parse(now) + index).toISOString(),
      origin: "System",
      input,
      normalized: null,
      status: "suggested",
      result: "Try this command in the console.",
    })),
  };
}

export function validateProject(application, candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ValidationError("Expected a project object.", "$project");
  }
  requireText(candidate.id, "$project.id");
  requireText(candidate.name, "$project.name");
  requireText(candidate.createdAt, "$project.createdAt");
  requireText(candidate.updatedAt, "$project.updatedAt");
  if (!Array.isArray(candidate.history)) throw new ValidationError("Expected an array.", "$project.history");
  return {
    ...clone(candidate),
    name: candidate.name.trim(),
    state: application.state.migrate(candidate.state),
    history: candidate.history.slice(-HISTORY_LIMIT),
  };
}

export function createLibrary(application) {
  const project = createProject(application, application.project.defaultName);
  return { schemaVersion: LIBRARY_SCHEMA_VERSION, activeProjectId: project.id, projects: [project] };
}

export function validateLibrary(application, candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ValidationError("Expected a library object.", "$library");
  }
  if (candidate.schemaVersion !== LIBRARY_SCHEMA_VERSION) {
    throw new ValidationError(`Expected library schemaVersion ${LIBRARY_SCHEMA_VERSION}.`, "$library.schemaVersion");
  }
  if (!Array.isArray(candidate.projects)) throw new ValidationError("Expected an array.", "$library.projects");
  const projects = candidate.projects.map((project) => validateProject(application, project));
  const ids = new Set();
  projects.forEach((project, index) => {
    if (ids.has(project.id)) throw new ValidationError(`Duplicate project ID "${project.id}".`, `$.projects[${index}].id`);
    ids.add(project.id);
  });
  if (candidate.activeProjectId !== null && !ids.has(candidate.activeProjectId)) {
    throw new ValidationError("Active project does not exist.", "$.activeProjectId");
  }
  return { schemaVersion: LIBRARY_SCHEMA_VERSION, activeProjectId: candidate.activeProjectId, projects };
}

export function importProject(application, candidate, existingIds = new Set()) {
  const project = candidate?.documentVersion === PROJECT_DOCUMENT_VERSION
    ? projectFromDocument(application, candidate)
    : validateProject(application, candidate);
  if (existingIds.has(project.id)) project.id = createId("project");
  return project;
}

export function createProjectDocument(project) {
  return {
    documentVersion: PROJECT_DOCUMENT_VERSION,
    projectId: project.id,
    name: project.name,
    state: clone(project.state),
  };
}

export function validateProjectDocument(application, candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ValidationError("Expected a project document object.", "$");
  }
  if (candidate.documentVersion !== PROJECT_DOCUMENT_VERSION) {
    throw new ValidationError(`Expected documentVersion ${PROJECT_DOCUMENT_VERSION}.`, "$.documentVersion");
  }
  requireText(candidate.projectId, "$.projectId");
  requireText(candidate.name, "$.name");
  return {
    documentVersion: PROJECT_DOCUMENT_VERSION,
    projectId: candidate.projectId,
    name: candidate.name.trim(),
    state: application.state.migrate(candidate.state),
  };
}

export function projectFromDocument(application, candidate, now = new Date().toISOString()) {
  const document = validateProjectDocument(application, candidate);
  return {
    id: document.projectId,
    name: document.name,
    createdAt: now,
    updatedAt: now,
    state: document.state,
    history: [],
  };
}
