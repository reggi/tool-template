import test from "node:test";
import assert from "node:assert/strict";
import { application } from "../src/app/config.js";
import { reduceAction } from "../src/app/checklist/actions.js";
import { parseSource, serializeSource } from "../src/app/checklist/source.js";
import { createState, validateState } from "../src/app/checklist/state.js";
import { parseCommand } from "../src/core/commands/grammar.js";
import {
  createLibrary,
  createProject,
  createProjectDocument,
  importProject,
  validateProjectDocument,
} from "../src/core/projects/library.js";
import { ValidationError } from "../src/core/index.js";

test("State JSON round-trips every durable value", () => {
  const state = createState();
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))), state);
});

test("invalid state is rejected atomically", () => {
  const state = createState();
  const invalid = structuredClone(state);
  invalid.items.push({ ...invalid.items[0] });
  assert.throws(() => validateState(invalid), ValidationError);
  assert.deepEqual(state, validateState(state));
});

test("Source preserves stable IDs and unrelated settings", () => {
  const state = createState();
  state.settings.density = "compact";
  const first = state.items[0];
  const parsed = parseSource(`${first.label}\nNew item`, state);
  assert.equal(parsed.items[0].id, first.id);
  assert.equal(parsed.settings.density, "compact");
  assert.equal(serializeSource(parsed), `${first.label}\nNew item`);
});

test("visual and command actions use the same application reducer", () => {
  const parsed = parseCommand('checklist.items.add "Shared path"', application.commands, {});
  const state = createState();
  const fromCommand = reduceAction(state, parsed.definition.action, parsed.payload);
  const fromUi = reduceAction(state, "checklist.items.add", { label: "Shared path" });
  assert.deepEqual(
    fromCommand.items.map((item) => item.label),
    fromUi.items.map((item) => item.label),
  );
  assert.deepEqual(fromCommand.settings, fromUi.settings);
});

test("projects are generic and imports resolve ID collisions", () => {
  const project = createProject(application, "Existing");
  const library = createLibrary(application);
  const document = createProjectDocument(project);
  const imported = importProject(application, document, new Set([project.id, ...library.projects.map(({ id }) => id)]));
  assert.notEqual(imported.id, project.id);
  assert.equal(imported.name, project.name);
});

test("State JSON and project export share one history-free document", () => {
  const project = createProject(application, "Named project");
  project.history.push({ id: "command_1", input: "example" });
  const document = createProjectDocument(project);
  assert.equal(document.name, "Named project");
  assert.equal(document.projectId, project.id);
  assert.deepEqual(document.state, project.state);
  assert.ok(!("history" in document));
  assert.deepEqual(validateProjectDocument(application, JSON.parse(JSON.stringify(document))), document);
});

test("new projects contain initial suggested commands", () => {
  const project = createProject(application, "Commands");
  assert.deepEqual(project.history.map((entry) => entry.input), application.initialCommands);
  assert.ok(project.history.every((entry) => entry.status === "suggested"));
});

test("unknown commands and extra arguments fail", () => {
  assert.throws(() => parseCommand("window.alert hi", application.commands, {}), /Unknown command/);
  assert.throws(() => parseCommand("checklist.items.add one two", application.commands, {}), /expects 1 argument/);
});

test("the application command manifest contains contract metadata", () => {
  for (const definition of application.commands) {
    assert.match(definition.name, /^checklist\./);
    assert.ok(definition.action);
    assert.ok(definition.reads.length);
    assert.ok(definition.writes.length);
    assert.equal(typeof definition.reversible, "boolean");
    assert.ok(definition.example);
  }
});
