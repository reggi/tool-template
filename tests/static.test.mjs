import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/core/styles.css", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/core/runtime/shell.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/core/runtime/create-html-tool.js", import.meta.url), "utf8");
const events = await readFile(new URL("../src/core/events/create-event-bus.js", import.meta.url), "utf8");
const workspace = await readFile(new URL("../src/app/checklist/workspace.js", import.meta.url), "utf8");
const applicationCommands = await readFile(new URL("../src/app/checklist/commands.js", import.meta.url), "utf8");
const main = await readFile(new URL("../src/app/main.js", import.meta.url), "utf8");

test("Vite is the application entry point", () => {
  assert.match(html, /src="\/src\/app\/main\.js"/);
  assert.match(main, /createHtmlTool/);
});

test("required views and tools-hub navigation are generated", () => {
  for (const id of ["projectsView", "sourceView", "workspaceView", "stateView", "commandDrawer"]) {
    assert.match(shell, new RegExp(`id="${id}"`));
  }
  assert.match(shell, /application\.toolsUrl/);
});

test("every framework button declares a hookable control name", () => {
  const buttons = [...shell.matchAll(/<button\b[^>]*>/g)].map(([button]) => button);
  assert.ok(buttons.length > 15);
  assert.ok(buttons.every((button) => button.includes("data-control=")));
  assert.doesNotMatch(workspace, /<button(?![^>]*data-control=)/);
  assert.match(events, /html-tool:/);
});

test("command search can hide entries and the drawer has an accessible resize handle", () => {
  assert.match(css, /\.command-definition\[hidden\]/);
  assert.match(shell, /id="commandResizeHandle"/);
  assert.match(shell, /role="separator"/);
  assert.match(runtime, /pointerdown/);
  assert.match(runtime, /commands\.drawer\.resized/);
  assert.match(runtime, /commandDrawerOpenKey/);
  assert.match(runtime, /localStorage\.getItem\(commandDrawerOpenKey\) === "true"/);
  assert.match(runtime, /openCommands\(\{ persist: false, focus: false, emit: false \}\)/);
});

test("the command prompt expands only for multiline batches", () => {
  assert.match(shell, /<textarea id="commandInput" rows="1"/);
  assert.match(css, /\.command-prompt textarea\.multiline/);
  assert.match(runtime, /split\(\/\\r\?\\n\/\)/);
  assert.match(runtime, /for \(const \[index, input\] of commands\.entries\(\)\)/);
});

test("the command prompt renders inline ghost completion", () => {
  assert.match(shell, /id="commandSuggestion"/);
  assert.match(css, /\.command-suggestion-rest/);
  assert.match(css, /\.command-suggestion span\s*\{[^}]*font:\s*inherit/s);
  assert.match(css, /\.command-prompt > span/);
  assert.match(runtime, /function renderCommandSuggestion/);
  assert.match(runtime, /function getCommandCompletion/);
});

test("delivery metadata is complete", () => {
  for (const marker of ["rel=\"canonical\"", "og:title", "og:description", "og:image", "twitter:card", "rel=\"icon\""]) {
    assert.ok(html.includes(marker), `Missing ${marker}`);
  }
});

test("mobile, dark, focus, and reduced-motion rules exist", () => {
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /max-width: 390px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("the core runtime has no checklist-domain vocabulary", () => {
  assert.doesNotMatch(runtime, /checklist|items|density/);
  assert.match(runtime, /application\.workspace\.render/);
  assert.match(runtime, /application\.actions\.reduce/);
});

test("every actionable button has a canonical command", () => {
  const controls = new Set([
    ...[...shell.matchAll(/data-control="([^"]+)"/g)].map((match) => match[1]),
    ...[...workspace.matchAll(/data-control\s*=\s*"([^"]+)"/g)].map((match) => match[1]),
    ...[...runtime.matchAll(/makeButton\("[^"]+", "([^"]+)"/g)].map((match) => match[1]),
  ]);
  const commands = new Set([
    ...[...runtime.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]),
    ...[...applicationCommands.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]),
  ]);
  const mappings = {
    "view.projects": "view.open",
    "view.source": "view.open",
    "view.workspace": "view.open",
    "view.state": "view.open",
    "project.new.create": "project.new",
    "commands.run": null,
  };
  for (const control of controls) {
    const command = Object.hasOwn(mappings, control) ? mappings[control] : control;
    if (command) assert.ok(commands.has(command), `${control} has no canonical command`);
  }
});
