import { createEventBus } from "../events/create-event-bus.js";
import { errorMessage, ValidationError } from "../errors.js";
import { exactArguments, historyEntry, parseCommand, tokenize } from "../commands/grammar.js";
import {
  HISTORY_LIMIT,
  createLibrary,
  createProject,
  createProjectDocument,
  importProject,
  validateLibrary,
  validateProjectDocument,
  validateProject,
} from "../projects/library.js";
import { clone, createId, filename, quote } from "../values.js";
import { renderShell } from "./shell.js";

const VIEWS = ["projects", "source", "workspace", "state"];
const THEME_KEY = "html-tool-theme";
const COMMAND_DRAWER_MIN_HEIGHT = 220;

function frameworkCommands() {
  const command = (definition) => ({ scope: "framework", aliases: [], ...definition });
  return [
    command({ name: "view.open", signature: "view.open <projects|source|workspace|state>", description: "Open an application view.", reads: ["activeProjectId"], writes: ["activeView"], reversible: true, example: "view.open workspace", handler: "view.open", complete({ argumentIndex }) {
      return argumentIndex === 0 ? VIEWS : [];
    }, parse(args) {
      exactArguments("view.open", args, 1);
      if (!VIEWS.includes(args[0])) throw new ValidationError(`Unknown view "${args[0]}".`, "$command");
      return { view: args[0] };
    } }),
    command({ name: "project.new", signature: "project.new <name> [source-or-state-json]", description: "Create a project.", reads: ["initial input"], writes: ["projects", "activeProjectId"], reversible: false, example: 'project.new "Planning"', handler: "project.new", parse(args) {
      if (args.length < 1 || args.length > 2) throw new ValidationError(`project.new expects 1 or 2 arguments; received ${args.length}.`, "$command");
      return { name: args[0], initialData: args[1] || "" };
    } }),
    command({ name: "project.import", signature: "project.import <project-json>", description: "Import a portable project document.", reads: ["project document"], writes: ["projects", "activeProjectId"], reversible: false, example: 'project.import "{...}"', handler: "project.import", parse(args) {
      exactArguments("project.import", args, 1); return { document: args[0] };
    } }),
    command({ name: "project.open", signature: "project.open <id>", description: "Open a project by stable ID.", reads: ["projects"], writes: ["activeProjectId"], reversible: true, example: 'project.open "project_id"', handler: "project.open", complete({ library, argumentIndex }) {
      return argumentIndex === 0 ? library.projects.map((project) => project.id) : [];
    }, parse(args) {
      exactArguments("project.open", args, 1); return { id: args[0] };
    } }),
    command({ name: "project.rename", signature: "project.rename <id> <name>", description: "Rename a project by stable ID.", reads: ["projects"], writes: ["project.name"], reversible: true, example: 'project.rename "project_id" "Planning"', handler: "project.rename", complete({ library, argumentIndex }) {
      return argumentIndex === 0 ? library.projects.map((project) => project.id) : [];
    }, parse(args) {
      exactArguments("project.rename", args, 2); return { id: args[0], name: args[1] };
    } }),
    command({ name: "project.duplicate", signature: "project.duplicate <id>", description: "Duplicate a project.", reads: ["projects"], writes: ["projects", "activeProjectId"], reversible: false, example: 'project.duplicate "project_id"', handler: "project.duplicate", complete({ library, argumentIndex }) {
      return argumentIndex === 0 ? library.projects.map((project) => project.id) : [];
    }, parse(args) {
      exactArguments("project.duplicate", args, 1); return { id: args[0] };
    } }),
    command({ name: "project.delete", signature: "project.delete <id>", description: "Delete one project.", reads: ["projects"], writes: ["projects", "activeProjectId"], reversible: false, destructive: true, example: 'project.delete "project_id"', handler: "project.delete", complete({ library, argumentIndex }) {
      return argumentIndex === 0 ? library.projects.map((project) => project.id) : [];
    }, parse(args) {
      exactArguments("project.delete", args, 1); return { id: args[0] };
    } }),
    command({ name: "project.export", signature: "project.export <id>", description: "Download a project's portable State JSON.", reads: ["projects"], writes: ["download"], reversible: true, example: 'project.export "project_id"', handler: "project.export", complete({ library, argumentIndex }) {
      return argumentIndex === 0 ? library.projects.map((project) => project.id) : [];
    }, parse(args) {
      exactArguments("project.export", args, 1); return { id: args[0] };
    } }),
    command({ name: "project.new.open", signature: "project.new.open", description: "Open the new-project dialog.", reads: [], writes: ["newProjectDialog"], reversible: true, example: "project.new.open", handler: "project.new.open", parse(args) {
      exactArguments("project.new.open", args, 0); return {};
    } }),
    command({ name: "project.new.close", aliases: ["project.new.cancel"], signature: "project.new.close", description: "Close the new-project dialog.", reads: [], writes: ["newProjectDialog"], reversible: true, example: "project.new.close", handler: "project.new.close", parse(args) {
      exactArguments("project.new.close", args, 0); return {};
    } }),
    command({ name: "project.import.open", signature: "project.import.open", description: "Open the project file picker.", reads: [], writes: ["filePicker"], reversible: true, example: "project.import.open", handler: "project.import.open", parse(args) {
      exactArguments("project.import.open", args, 0); return {};
    } }),
    command({ name: "source.copy", signature: "source.copy", description: "Copy the current Source draft.", reads: ["sourceDraft"], writes: ["clipboard"], reversible: true, example: "source.copy", handler: "source.copy", parse(args) {
      exactArguments("source.copy", args, 0); return {};
    } }),
    command({ name: "source.download", signature: "source.download", description: "Download the current Source draft.", reads: ["sourceDraft"], writes: ["download"], reversible: true, example: "source.download", handler: "source.download", parse(args) {
      exactArguments("source.download", args, 0); return {};
    } }),
    command({ name: "source.reload", signature: "source.reload", description: "Discard the Source draft and reload live state.", reads: ["state"], writes: ["sourceDraft"], reversible: false, destructive: true, example: "source.reload", handler: "source.reload", parse(args) {
      exactArguments("source.reload", args, 0); return {};
    } }),
    command({ name: "source.apply", signature: "source.apply", description: "Apply the current Source draft.", reads: ["sourceDraft", "state"], writes: ["state"], reversible: false, example: "source.apply", handler: "source.apply", parse(args) {
      exactArguments("source.apply", args, 0); return {};
    } }),
    command({ name: "state.copy", signature: "state.copy", description: "Copy the current State JSON draft.", reads: ["stateDraft"], writes: ["clipboard"], reversible: true, example: "state.copy", handler: "state.copy", parse(args) {
      exactArguments("state.copy", args, 0); return {};
    } }),
    command({ name: "state.download", signature: "state.download", description: "Download the current State JSON draft.", reads: ["stateDraft"], writes: ["download"], reversible: true, example: "state.download", handler: "state.download", parse(args) {
      exactArguments("state.download", args, 0); return {};
    } }),
    command({ name: "state.reload", signature: "state.reload", description: "Discard the State JSON draft and reload live state.", reads: ["state"], writes: ["stateDraft"], reversible: false, destructive: true, example: "state.reload", handler: "state.reload", parse(args) {
      exactArguments("state.reload", args, 0); return {};
    } }),
    command({ name: "state.apply", signature: "state.apply", description: "Apply the current State JSON draft.", reads: ["stateDraft"], writes: ["state"], reversible: false, example: "state.apply", handler: "state.apply", parse(args) {
      exactArguments("state.apply", args, 0); return {};
    } }),
    command({ name: "theme.set", signature: "theme.set <system|light|dark>", description: "Set the persisted theme.", reads: ["theme"], writes: ["theme"], reversible: true, example: "theme.set dark", handler: "theme.set", complete({ argumentIndex }) {
      return argumentIndex === 0 ? ["system", "light", "dark"] : [];
    }, parse(args) {
      exactArguments("theme.set", args, 1);
      if (!["system", "light", "dark"].includes(args[0])) throw new ValidationError('Theme must be "system", "light", or "dark".', "$command");
      return { theme: args[0] };
    } }),
    command({ name: "commands.open", signature: "commands.open", description: "Open the command drawer.", reads: [], writes: ["commandDrawer"], reversible: true, example: "commands.open", handler: "commands.open", parse(args) {
      exactArguments("commands.open", args, 0); return {};
    } }),
    command({ name: "commands.close", signature: "commands.close", description: "Close the command drawer.", reads: [], writes: ["commandDrawer"], reversible: true, example: "commands.close", handler: "commands.close", parse(args) {
      exactArguments("commands.close", args, 0); return {};
    } }),
    command({ name: "commands.history.copy", signature: "commands.history.copy", description: "Copy command history.", reads: ["history"], writes: ["clipboard"], reversible: true, example: "commands.history.copy", handler: "commands.history.copy", parse(args) {
      exactArguments("commands.history.copy", args, 0); return {};
    } }),
    command({ name: "commands.history.export", signature: "commands.history.export", description: "Download command history.", reads: ["history"], writes: ["download"], reversible: true, example: "commands.history.export", handler: "commands.history.export", parse(args) {
      exactArguments("commands.history.export", args, 0); return {};
    } }),
    command({ name: "commands.history.clear", aliases: ["history.clear"], signature: "commands.history.clear", description: "Clear project command history.", reads: ["history"], writes: ["history"], reversible: false, destructive: true, example: "commands.history.clear", handler: "commands.history.clear", parse(args) {
      exactArguments("commands.history.clear", args, 0); return {};
    } }),
    command({ name: "commands.library.select", signature: "commands.library.select <command>", description: "Populate the prompt with a command example.", reads: ["commandLibrary"], writes: ["commandDraft"], reversible: true, example: "commands.library.select theme.set", handler: "commands.library.select", complete({ argumentIndex, commands }) {
      return argumentIndex === 0 ? commands.map((definition) => definition.name) : [];
    }, parse(args) {
      exactArguments("commands.library.select", args, 1); return { name: args[0] };
    } }),
    command({ name: "commands.library.search", signature: "commands.library.search <query>", description: "Filter the command library.", reads: ["commandLibrary"], writes: ["commandLibrarySearch"], reversible: true, example: "commands.library.search state", handler: "commands.library.search", parse(args) {
      exactArguments("commands.library.search", args, 1); return { query: args[0] };
    } }),
    command({ name: "commands.history.search", signature: "commands.history.search <query>", description: "Filter command history.", reads: ["history"], writes: ["historySearch"], reversible: true, example: "commands.history.search failed", handler: "commands.history.search", parse(args) {
      exactArguments("commands.history.search", args, 1); return { query: args[0] };
    } }),
    command({ name: "commands.drawer.height.set", signature: "commands.drawer.height.set <pixels>", description: "Set command drawer height.", reads: ["viewport"], writes: ["commandDrawerHeight"], reversible: true, example: "commands.drawer.height.set 420", handler: "commands.drawer.height.set", parse(args) {
      exactArguments("commands.drawer.height.set", args, 1);
      const height = Number(args[0]);
      if (!Number.isFinite(height)) throw new ValidationError("Drawer height must be a number.", "$command");
      return { height };
    } }),
    command({ name: "recovery.download", signature: "recovery.download", description: "Download unreadable saved data.", reads: ["unreadableSavedData"], writes: ["download"], reversible: true, example: "recovery.download", handler: "recovery.download", parse(args) {
      exactArguments("recovery.download", args, 0); return {};
    } }),
  ];
}

export function createHtmlTool({ root, application, hooks = [] }) {
  if (!(root instanceof HTMLElement)) throw new Error("createHtmlTool requires a root HTMLElement.");
  renderShell(root, application);
  const eventBus = createEventBus(root, [application.onEvent, ...hooks]);
  const definitions = [...frameworkCommands(), ...application.commands.map((definition) => ({ scope: "application", aliases: [], ...definition }))];
  const elements = Object.fromEntries(
    [
      "activeProjectLabel", "recoveryNotice", "downloadRecoveryButton", "projectGrid", "projectsEmpty",
      "sourceTitle", "sourceEditor", "sourceStatus", "sourceBadge", "sourcePreview", "reloadSourceButton", "applySourceButton",
      "workspaceTitle", "stateTitle", "stateEditor", "stateStatus", "stateBadge", "stateProjectName", "reloadStateButton", "applyStateButton",
      "workspaceMount", "toastRegion", "themeSelect", "importProjectButton", "projectFileInput", "projectDialog", "projectForm",
      "projectNameInput", "projectDataInput", "projectDialogStatus", "createProjectButton",
      "commandToggle", "commandDrawer", "closeCommandsButton", "commandHistory", "commandHistorySearch",
      "commandResizeHandle", "commandSearch", "commandLibrary", "commandForm", "commandInput", "commandSuggestion",
      "copyHistoryButton",
      "exportHistoryButton", "clearHistoryButton",
    ].map((id) => [id, root.querySelector(`#${id}`)]),
  );

  let unreadableSavedData = null;
  let library = loadLibrary();
  let activeView = readRoute().view;
  let sourceDraft = "";
  let stateDraft = "";
  let sourceDirty = false;
  let stateDirty = false;
  let sourceStale = false;
  let stateStale = false;
  let commandCursor = 0;
  let commandDraft = "";
  let preserveCommandInput = false;
  const commandDrawerHeightKey = `${application.storageKey}.commandDrawerHeight`;
  const commandDrawerOpenKey = `${application.storageKey}.commandDrawerOpen`;

  function loadLibrary() {
    const raw = localStorage.getItem(application.storageKey);
    if (!raw) return createLibrary(application);
    try {
      return validateLibrary(application, JSON.parse(raw));
    } catch {
      unreadableSavedData = raw;
      return createLibrary(application);
    }
  }

  function saveLibrary() {
    try {
      localStorage.setItem(application.storageKey, JSON.stringify(validateLibrary(application, library)));
    } catch (error) {
      throw new Error(`Project data could not be saved: ${error.message}`);
    }
  }

  function activeProject() {
    return library.projects.find((project) => project.id === library.activeProjectId) || null;
  }

  function projectContext() {
    return activeView === "projects" ? null : activeProject();
  }

  function requireProjectContext(action) {
    const project = projectContext();
    if (!project) throw new ValidationError(`Open a project before running ${action}.`, "$.project");
    return project;
  }

  function replaceProject(project) {
    const index = library.projects.findIndex((entry) => entry.id === project.id);
    if (index < 0) throw new ValidationError(`Project "${project.id}" does not exist.`, "$.projectId");
    library.projects[index] = validateProject(application, project);
  }

  function readRoute() {
    const params = new URLSearchParams(location.hash.slice(1));
    const view = VIEWS.includes(params.get("view")) ? params.get("view") : "projects";
    const project = params.get("project");
    if (project && library?.projects.some((entry) => entry.id === project)) library.activeProjectId = project;
    return { view, project };
  }

  function writeRoute(view = activeView) {
    const params = new URLSearchParams();
    params.set("view", view);
    if (view !== "projects" && library.activeProjectId) params.set("project", library.activeProjectId);
    history.replaceState(null, "", `#${params}`);
  }

  function setView(view, { focus = true } = {}) {
    if (!VIEWS.includes(view)) return;
    if (view !== "projects" && !activeProject()) view = "projects";
    activeView = view;
    root.querySelectorAll(".view").forEach((section) => section.classList.add("hidden"));
    root.querySelector(`#${view}View`).classList.remove("hidden");
    root.querySelectorAll("[data-view]").forEach((button) => {
      button.disabled = view === "projects" && button.dataset.view !== "projects";
      if (button.dataset.view === view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    elements.commandInput.addEventListener("click", renderCommandSuggestion);
    elements.commandInput.addEventListener("keyup", renderCommandSuggestion);
    elements.commandToggle.classList.remove("hidden");
    writeRoute(view);
    if (focus) root.querySelector(`#${view}View h1`)?.focus({ preventScroll: true });
    renderCommands();
    eventBus.emit("view.changed", { view, projectId: library.activeProjectId });
  }

  function setStatus(element, message, kind = "") {
    element.textContent = message;
    element.classList.toggle("error", kind === "error");
    element.classList.toggle("success", kind === "success");
  }

  function notify(message, kind = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;
    toast.setAttribute("role", kind === "error" ? "alert" : "status");
    toast.textContent = message;
    elements.toastRegion.append(toast);
    setTimeout(() => toast.remove(), kind === "error" ? 6000 : 3500);
  }

  function runUi(operation) {
    const report = (error) => {
      eventBus.emit("ui.error", { error, message: errorMessage(error) });
      if (!error.notified) notify(errorMessage(error), "error");
      return undefined;
    };
    try {
      const result = operation();
      return result instanceof Promise ? result.catch(report) : result;
    } catch (error) {
      return report(error);
    }
  }

  function assertDraftsResolved(action) {
    if (sourceDirty || stateDirty) throw new ValidationError(`Apply or reload the current drafts before ${action}.`, "$.drafts");
  }

  function appendHistory(project, entry) {
    project.history.push(entry);
    project.history = project.history.slice(-HISTORY_LIMIT);
  }

  function addHistory(project, input, origin, result, status = "succeeded") {
    appendHistory(project, historyEntry({ input, origin, result, status, createId }));
  }

  function recordEffect(input, origin, result) {
    const project = projectContext();
    if (project) {
      addHistory(project, input, origin, result);
      saveLibrary();
      renderCommands();
    }
    return result;
  }

  function synchronizeDrafts({ sourceApplied = false, stateApplied = false } = {}) {
    const project = activeProject();
    if (!project) return;
    if (!sourceDirty || sourceApplied) {
      sourceDraft = application.source.serialize(project.state);
      sourceDirty = false;
      sourceStale = false;
    } else sourceStale = true;
    if (!stateDirty || stateApplied) {
      stateDraft = JSON.stringify(createProjectDocument(project), null, 2);
      stateDirty = false;
      stateStale = false;
    } else stateStale = true;
  }

  function dispatch(action, payload = {}, { origin = "UI", command = application.actions.toCommand(action, payload) } = {}) {
    const project = requireProjectContext(action);
    eventBus.emit("action.before", { action, payload: clone(payload), origin, projectId: project.id });
    try {
      const next = clone(project);
      next.state = application.state.validate(application.actions.reduce(clone(project.state), action, clone(payload)));
      next.updatedAt = new Date().toISOString();
      const result = application.actions.describe(action, payload, next.state);
      addHistory(next, command, origin, result);
      replaceProject(next);
      synchronizeDrafts();
      saveLibrary();
      render();
      eventBus.emit("action.after", { action, payload: clone(payload), origin, projectId: next.id, state: clone(next.state), result });
      return result;
    } catch (error) {
      eventBus.emit("action.error", { action, payload: clone(payload), origin, projectId: project.id, error, message: errorMessage(error) });
      throw error;
    }
  }

  function parseInitialData(raw) {
    if (!raw) return application.state.create();
    if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
      const parsed = JSON.parse(raw);
      if (parsed.documentVersion) return validateProjectDocument(application, parsed).state;
      return parsed.state ? validateProject(application, parsed).state : application.state.validate(parsed);
    }
    return application.source.parse(raw, application.state.create());
  }

  function createNewProject(name, state = application.state.create(), origin = "UI", command = `project.new ${quote(name)}`) {
    assertDraftsResolved("creating another project");
    const project = createProject(application, name, state);
    addHistory(project, command, origin, `Created "${name}".`);
    library.projects.push(project);
    library.activeProjectId = project.id;
    synchronizeDrafts();
    saveLibrary();
    render();
    setView("workspace");
    eventBus.emit("project.created", { project: clone(project), origin });
    return project;
  }

  function openProject(id, origin = "UI") {
    if (id !== library.activeProjectId) assertDraftsResolved("opening another project");
    if (!library.projects.some((project) => project.id === id)) throw new ValidationError(`Project "${id}" does not exist.`, "$.projectId");
    library.activeProjectId = id;
    sourceDirty = false;
    stateDirty = false;
    synchronizeDrafts();
    const project = activeProject();
    addHistory(project, `project.open ${quote(id)}`, origin, `Opened "${project.name}".`);
    saveLibrary();
    render();
    setView("workspace");
    eventBus.emit("project.opened", { projectId: id, origin });
  }

  function renameProject(id, name, origin = "UI", command = `project.rename ${quote(id)} ${quote(name)}`) {
    if (typeof name !== "string" || !name.trim()) throw new ValidationError("Project name is required.", "$.name");
    const existing = library.projects.find((project) => project.id === id);
    if (!existing) throw new ValidationError(`Project "${id}" does not exist.`, "$.projectId");
    const project = clone(existing);
    project.name = name.trim();
    project.updatedAt = new Date().toISOString();
    addHistory(project, command, origin, `Renamed project to "${project.name}".`);
    replaceProject(project);
    saveLibrary();
    render();
    eventBus.emit("project.renamed", { projectId: project.id, name: project.name, origin });
  }

  function duplicateProject(id, origin = "UI") {
    assertDraftsResolved("duplicating a project");
    const original = library.projects.find((project) => project.id === id);
    if (!original) throw new ValidationError(`Project "${id}" does not exist.`, "$.projectId");
    const duplicate = createProject(application, `${original.name} copy`, clone(original.state));
    addHistory(duplicate, `project.duplicate ${quote(id)}`, origin, `Duplicated "${original.name}".`);
    library.projects.push(duplicate);
    library.activeProjectId = duplicate.id;
    synchronizeDrafts();
    saveLibrary();
    render();
    setView("workspace");
    eventBus.emit("project.duplicated", { projectId: id, duplicate: clone(duplicate), origin });
  }

  function deleteProject(id, origin = "UI") {
    if (id === library.activeProjectId) assertDraftsResolved("deleting the active project");
    const project = library.projects.find((entry) => entry.id === id);
    if (!project) throw new ValidationError(`Project "${id}" does not exist.`, "$.projectId");
    library.projects = library.projects.filter((entry) => entry.id !== id);
    library.activeProjectId = library.projects[0]?.id || null;
    if (activeProject()) addHistory(activeProject(), `project.delete ${quote(id)}`, origin, `Deleted "${project.name}".`);
    sourceDirty = false;
    stateDirty = false;
    synchronizeDrafts();
    saveLibrary();
    render();
    setView("projects");
    eventBus.emit("project.deleted", { projectId: id, origin });
  }

  function applySource(origin = "UI") {
    const project = requireProjectContext("source.apply");
    try {
      const next = clone(project);
      next.state = application.state.validate(application.source.parse(sourceDraft, clone(project.state)));
      next.updatedAt = new Date().toISOString();
      addHistory(next, "source.apply", origin, "Applied Source.");
      replaceProject(next);
      sourceDirty = false;
      synchronizeDrafts({ sourceApplied: true });
      saveLibrary();
      render();
      setStatus(elements.sourceStatus, "Source applied.", "success");
      eventBus.emit("source.applied", { projectId: next.id, state: clone(next.state), origin });
      return "Source applied.";
    } catch (error) {
      setStatus(elements.sourceStatus, errorMessage(error), "error");
      eventBus.emit("source.error", { error, message: errorMessage(error), origin });
      throw error;
    }
  }

  function applyState(origin = "UI") {
    const project = requireProjectContext("state.apply");
    try {
      const next = clone(project);
      const document = validateProjectDocument(application, JSON.parse(stateDraft));
      if (document.projectId !== project.id) {
        throw new ValidationError("Project ID cannot be changed from State JSON.", "$.projectId");
      }
      next.name = document.name;
      next.state = document.state;
      next.updatedAt = new Date().toISOString();
      addHistory(next, "state.apply", origin, "Applied complete State JSON.");
      replaceProject(next);
      stateDirty = false;
      synchronizeDrafts({ stateApplied: true });
      saveLibrary();
      render();
      setStatus(elements.stateStatus, `Document 1 · state schema ${application.schemaVersion} · valid · applied`, "success");
      eventBus.emit("state.applied", { projectId: next.id, state: clone(next.state), origin });
      return "Applied complete State JSON.";
    } catch (error) {
      setStatus(elements.stateStatus, errorMessage(error), "error");
      eventBus.emit("state.error", { error, message: errorMessage(error), origin });
      throw error;
    }
  }

  function setTheme(theme, origin = "UI", record = true) {
    localStorage.setItem(THEME_KEY, theme);
    elements.themeSelect.value = theme;
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]').content = dark ? "#111111" : "#ffffff";
    if (record && projectContext()) {
      const project = clone(projectContext());
      addHistory(project, `theme.set ${theme}`, origin, `Theme set to ${theme}.`);
      replaceProject(project);
      saveLibrary();
      renderCommands();
    }
    eventBus.emit("theme.changed", { theme, resolved: dark ? "dark" : "light", origin });
  }

  async function executeFrameworkCommand(handler, payload, input, origin) {
    switch (handler) {
      case "view.open":
        if (activeView === "projects" && payload.view !== "projects") {
          throw new ValidationError(`Open a project before opening ${payload.view}.`, "$.project");
        }
        {
          const result = recordEffect(input, origin, `Opened ${payload.view}.`);
          setView(payload.view);
          return result;
        }
      case "source.apply": return applySource(origin);
      case "state.apply": return applyState(origin);
      case "source.copy":
        requireProjectContext("source.copy");
        await copyText(sourceDraft, elements.sourceStatus);
        return recordEffect(input, origin, "Copied Source.");
      case "source.download": {
        const project = requireProjectContext("source.download");
        download(`${filename(project.name)}-${application.source.extension}`, sourceDraft, application.source.mimeType);
        return recordEffect(input, origin, "Downloaded Source.");
      }
      case "source.reload":
        sourceDraft = application.source.serialize(requireProjectContext("source.reload").state);
        sourceDirty = false;
        sourceStale = false;
        renderSource();
        setStatus(elements.sourceStatus, "Reloaded live state.");
        return recordEffect(input, origin, "Reloaded Source from live state.");
      case "state.copy":
        requireProjectContext("state.copy");
        await copyText(stateDraft, elements.stateStatus);
        return recordEffect(input, origin, "Copied State JSON.");
      case "state.download": {
        const project = requireProjectContext("state.download");
        download(`${filename(project.name)}-state.json`, stateDraft, "application/json");
        return recordEffect(input, origin, "Downloaded State JSON.");
      }
      case "state.reload":
        stateDraft = JSON.stringify(createProjectDocument(requireProjectContext("state.reload")), null, 2);
        stateDirty = false;
        stateStale = false;
        renderState();
        setStatus(elements.stateStatus, "Reloaded live state.");
        return recordEffect(input, origin, "Reloaded State JSON from live state.");
      case "commands.history.clear": return clearHistory(origin === "UI");
      case "project.new": {
        createNewProject(payload.name, parseInitialData(payload.initialData), origin, input);
        return `Created "${payload.name}".`;
      }
      case "project.import": {
        assertDraftsResolved("importing another project");
        const imported = importProject(application, JSON.parse(payload.document), new Set(library.projects.map((project) => project.id)));
        addHistory(imported, input, origin, `Imported "${imported.name}".`);
        library.projects.push(imported);
        library.activeProjectId = imported.id;
        synchronizeDrafts();
        saveLibrary();
        render();
        setView("workspace");
        eventBus.emit("project.imported", { project: clone(imported), origin });
        return `Imported "${imported.name}".`;
      }
      case "project.open": openProject(payload.id, origin); return `Opened ${payload.id}.`;
      case "project.rename": renameProject(payload.id, payload.name, origin, input); return `Renamed project to "${payload.name}".`;
      case "project.duplicate": duplicateProject(payload.id, origin); return `Duplicated ${payload.id}.`;
      case "project.delete": deleteProject(payload.id, origin); return `Deleted ${payload.id}.`;
      case "project.export": {
        const project = library.projects.find((entry) => entry.id === payload.id);
        if (!project) throw new ValidationError(`Project "${payload.id}" does not exist.`, "$.projectId");
        download(`${filename(project.name)}-state.json`, JSON.stringify(createProjectDocument(project), null, 2), "application/json");
        return recordEffect(input, origin, `Exported "${project.name}".`);
      }
      case "project.new.open":
        elements.projectDialog.showModal();
        return recordEffect(input, origin, "Opened new-project dialog.");
      case "project.new.close":
        if (elements.projectDialog.open) elements.projectDialog.close();
        return recordEffect(input, origin, "Closed new-project dialog.");
      case "project.import.open":
        elements.projectFileInput.click();
        return recordEffect(input, origin, "Opened project file picker.");
      case "theme.set": setTheme(payload.theme, origin); return `Theme set to ${payload.theme}.`;
      case "commands.open":
        openCommands();
        return recordEffect(input, origin, "Opened command drawer.");
      case "commands.close": {
        const result = recordEffect(input, origin, "Closed command drawer.");
        closeCommands();
        return result;
      }
      case "commands.history.copy":
        await copyText(serializeHistory(), elements.stateStatus);
        return recordEffect(input, origin, "Copied command history.");
      case "commands.history.export":
        exportHistory();
        return recordEffect(input, origin, "Exported command history.");
      case "commands.library.select": {
        const definition = definitions.find((entry) => entry.name === payload.name || entry.aliases?.includes(payload.name));
        if (!definition) throw new ValidationError(`Unknown command "${payload.name}".`, "$.command");
        populateCommandPrompt(definition.example);
        preserveCommandInput = true;
        eventBus.emit("commands.library.selected", { command: definition.name, example: definition.example });
        return recordEffect(input, origin, `Selected ${definition.name}.`);
      }
      case "commands.library.search":
        filterCommandLibrary(payload.query);
        return recordEffect(input, origin, `Filtered command library by "${payload.query}".`);
      case "commands.history.search":
        filterCommandHistory(payload.query);
        return recordEffect(input, origin, `Filtered command history by "${payload.query}".`);
      case "commands.drawer.height.set": {
        const height = setCommandDrawerHeight(payload.height, { emit: true });
        return recordEffect(input, origin, `Command drawer height set to ${height}px.`);
      }
      case "recovery.download":
        if (!unreadableSavedData) throw new ValidationError("There is no unreadable saved data to download.", "$.recovery");
        download("unreadable-html-tool-data.txt", unreadableSavedData, "text/plain");
        return recordEffect(input, origin, "Downloaded unreadable saved data.");
      default: throw new ValidationError(`Unknown framework command handler "${handler}".`, "$command");
    }
  }

  async function executeCommand(input, origin = "Command") {
    eventBus.emit("command.before", { input, origin, projectId: library.activeProjectId });
    try {
      const parsed = parseCommand(input, definitions, { project: projectContext(), library: clone(library) });
      const result = await (parsed.definition.scope === "framework"
        ? executeFrameworkCommand(parsed.definition.handler, parsed.payload, input, origin)
        : dispatch(parsed.definition.action, parsed.payload, { origin, command: input }));
      const quietCommands = new Set([
        "view.open",
        "commands.open",
        "commands.close",
        "commands.library.select",
        "commands.library.search",
        "commands.history.search",
        "commands.drawer.height.set",
      ]);
      if (!quietCommands.has(parsed.definition.name)) notify(result, "success");
      eventBus.emit("command.after", { input, origin, result, projectId: library.activeProjectId });
      return result;
    } catch (error) {
      const project = projectContext();
      if (project) {
        addHistory(project, input, origin, errorMessage(error), "failed");
        saveLibrary();
        renderCommands();
      }
      notify(errorMessage(error), "error");
      if (error && typeof error === "object") error.notified = true;
      eventBus.emit("command.error", { input, origin, error, message: errorMessage(error), projectId: library.activeProjectId });
      throw error;
    }
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat([], { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function download(name, content, type) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  async function copyText(text, statusElement) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(statusElement, "Copied.", "success");
      return "Copied.";
    } catch (error) {
      setStatus(statusElement, `Copy failed: ${error.message}`, "error");
      throw error;
    }
  }

  function serializeHistory() {
    return (requireProjectContext("commands.history.copy").history || [])
      .map((entry) => `${entry.timestamp}\t${entry.origin}\t${entry.status}\t${entry.input}\t${entry.result}`)
      .join("\n");
  }

  function exportHistory() {
    const project = requireProjectContext("commands.history.export");
    download(
      `${filename(project.name)}-history.json`,
      JSON.stringify({ schemaVersion: 1, projectId: project.id, entries: project.history }, null, 2),
      "application/json",
    );
  }

  function populateCommandPrompt(value) {
    elements.commandInput.value = value;
    commandDraft = value;
    resizeCommandPrompt();
    elements.commandInput.focus();
    elements.commandInput.setSelectionRange(value.length, value.length);
    renderCommandSuggestion();
  }

  function filterCommandLibrary(query) {
    elements.commandSearch.value = query;
    const normalized = query.trim().toLowerCase();
    elements.commandLibrary.querySelectorAll(".command-definition").forEach((item) => {
      item.hidden = !item.dataset.search.includes(normalized);
    });
  }

  function filterCommandHistory(query) {
    elements.commandHistorySearch.value = query;
    const normalized = query.trim().toLowerCase();
    elements.commandHistory.querySelectorAll(".command-entry").forEach((item) => {
      item.hidden = !item.dataset.search.includes(normalized);
    });
  }

  function makeButton(label, control, handler, className = "button") {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.textContent = label;
    button.dataset.control = control;
    button.addEventListener("click", handler);
    return button;
  }

  function renderProjects() {
    elements.projectGrid.replaceChildren();
    elements.projectsEmpty.classList.toggle("hidden", library.projects.length > 0);
    library.projects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      const preview = document.createElement("div");
      preview.className = "project-preview";
      application.project.renderPreview({ container: preview, project: clone(project) });
      const body = document.createElement("div");
      body.className = "project-card-body";
      const title = document.createElement("h2");
      title.textContent = project.name;
      const meta = document.createElement("p");
      meta.className = "project-meta";
      meta.textContent = `${application.project.summarize(project.state)} · edited ${formatDate(project.updatedAt)}`;
      const actions = document.createElement("div");
      actions.className = "project-card-actions";
      actions.append(
        makeButton("Open", "project.open", () => runUi(() => executeCommand(`project.open ${quote(project.id)}`, "UI"))),
        makeButton("Rename", "project.rename", () => {
          const name = prompt("Project name", project.name);
          if (name?.trim()) {
            runUi(async () => {
              await executeCommand(`project.rename ${quote(project.id)} ${quote(name)}`, "UI");
              setView("projects");
            });
          }
        }),
        makeButton("Duplicate", "project.duplicate", () => runUi(() => executeCommand(`project.duplicate ${quote(project.id)}`, "UI"))),
        makeButton("Export", "project.export", () => runUi(() => executeCommand(`project.export ${quote(project.id)}`, "UI"))),
        makeButton("Delete", "project.delete", () => {
          if (confirm(`Delete "${project.name}"? Only this project will be removed.`)) {
            runUi(() => executeCommand(`project.delete ${quote(project.id)}`, "UI"));
          }
        }, "button danger"),
      );
      body.append(title, meta, actions);
      card.append(preview, body);
      elements.projectGrid.append(card);
    });
  }

  function renderWorkspace() {
    const project = activeProject();
    if (!project) return;
    elements.workspaceMount.replaceChildren();
    application.workspace.render({
      container: elements.workspaceMount,
      project: clone(project),
      state: clone(project.state),
      dispatch: (action, payload) => runUi(() => dispatch(action, payload)),
      executeCommand: (input) => runUi(() => executeCommand(input, "UI")),
      createButton: makeButton,
      emit: eventBus.emit,
    });
  }

  function renderSource() {
    if (!activeProject()) return;
    if (elements.sourceEditor.value !== sourceDraft) elements.sourceEditor.value = sourceDraft;
    elements.sourceBadge.textContent = sourceStale ? "Draft stale" : sourceDirty ? "Unapplied draft" : "Synchronized";
    elements.sourceBadge.classList.toggle("dirty", sourceDirty || sourceStale);
    elements.reloadSourceButton.classList.toggle("hidden", !sourceDirty);
    elements.sourcePreview.replaceChildren();
    try {
      const parsed = application.source.parse(sourceDraft, clone(activeProject().state));
      application.source.renderPreview({ container: elements.sourcePreview, state: clone(parsed) });
      if (sourceDirty) setStatus(elements.sourceStatus, `${application.project.summarize(parsed)} · not applied`);
      else setStatus(elements.sourceStatus, "Synchronized");
    } catch (error) {
      setStatus(elements.sourceStatus, errorMessage(error), "error");
    }
  }

  function renderState() {
    const project = activeProject();
    if (!project) return;
    if (elements.stateEditor.value !== stateDraft) elements.stateEditor.value = stateDraft;
    elements.stateProjectName.textContent = `${project.name} state`;
    elements.stateBadge.textContent = stateStale ? `Document 1 · draft stale` : stateDirty ? `Document 1 · unapplied draft` : `Document 1 · synchronized`;
    elements.stateBadge.classList.toggle("dirty", stateDirty || stateStale);
    elements.reloadStateButton.classList.toggle("hidden", !stateDirty);
  }

  function renderCommands() {
    const project = projectContext();
    elements.commandHistory.replaceChildren();
    if (!project) {
      const empty = document.createElement("p");
      empty.className = "command-history-empty";
      empty.textContent = "Open a project to view its command history.";
      elements.commandHistory.append(empty);
    }
    (project?.history || []).forEach((entry) => {
      const article = document.createElement("article");
      article.className = `command-entry${entry.status === "failed" ? " error" : ""}`;
      article.dataset.search = `${entry.input} ${entry.origin} ${entry.status} ${entry.result}`.toLowerCase();
      const code = document.createElement("code");
      code.textContent = entry.input;
      const meta = document.createElement("div");
      meta.className = "command-entry-meta";
      meta.textContent = `${entry.origin} · ${entry.status} · ${formatDate(entry.timestamp)}${entry.result ? ` · ${entry.result}` : ""}`;
      article.append(code, meta);
      elements.commandHistory.append(article);
    });
    commandCursor = project?.history.length || 0;
  }

  function render() {
    const project = activeProject();
    elements.activeProjectLabel.textContent = activeView === "projects" ? "Project library" : project?.name || "No active project";
    if (project) {
      elements.sourceTitle.textContent = `Source · ${project.name}`;
      elements.workspaceTitle.textContent = `Workspace · ${project.name}`;
      elements.stateTitle.textContent = `State JSON · ${project.name}`;
    }
    renderProjects();
    renderWorkspace();
    renderSource();
    renderState();
    renderCommands();
    setView(activeView, { focus: false });
  }

  function clearHistory(confirmFirst = true) {
    const project = requireProjectContext("commands.history.clear");
    if (confirmFirst && !confirm(`Clear all command history for "${project.name}"? This cannot be undone.`)) return "History unchanged.";
    project.history = [];
    saveLibrary();
    renderCommands();
    eventBus.emit("commands.history.cleared", { projectId: project.id });
    return "History cleared.";
  }

  function openCommands({ persist = true, focus = true, emit = true } = {}) {
    commandDraft = elements.commandInput.value;
    elements.commandDrawer.classList.add("open");
    elements.commandDrawer.setAttribute("aria-hidden", "false");
    elements.commandToggle.setAttribute("aria-expanded", "true");
    if (persist) localStorage.setItem(commandDrawerOpenKey, "true");
    if (focus) elements.commandInput.focus();
    renderCommandSuggestion();
    if (emit) eventBus.emit("commands.opened", { projectId: library.activeProjectId });
  }

  function closeCommands({ persist = true, focus = true, emit = true } = {}) {
    commandDraft = elements.commandInput.value;
    elements.commandDrawer.classList.remove("open");
    elements.commandDrawer.setAttribute("aria-hidden", "true");
    elements.commandToggle.setAttribute("aria-expanded", "false");
    if (persist) localStorage.setItem(commandDrawerOpenKey, "false");
    if (focus) elements.commandToggle.focus();
    if (emit) eventBus.emit("commands.closed", { projectId: library.activeProjectId });
  }

  function resizeCommandPrompt() {
    const multiline = /\r?\n/.test(elements.commandInput.value);
    elements.commandInput.classList.toggle("multiline", multiline);
    elements.commandInput.rows = multiline ? 3 : 1;
    renderCommandSuggestion();
  }

  function commandDrawerMaximumHeight() {
    return Math.max(COMMAND_DRAWER_MIN_HEIGHT, window.innerHeight - 72);
  }

  function setCommandDrawerHeight(height, { persist = true, emit = false } = {}) {
    const nextHeight = Math.round(Math.min(commandDrawerMaximumHeight(), Math.max(COMMAND_DRAWER_MIN_HEIGHT, height)));
    elements.commandDrawer.style.height = `${nextHeight}px`;
    elements.commandResizeHandle.setAttribute("aria-valuenow", String(nextHeight));
    elements.commandResizeHandle.setAttribute("aria-valuemax", String(commandDrawerMaximumHeight()));
    if (persist) localStorage.setItem(commandDrawerHeightKey, String(nextHeight));
    if (emit) eventBus.emit("commands.drawer.resized", { height: nextHeight, projectId: library.activeProjectId });
    return nextHeight;
  }

  function setupCommandDrawerResize() {
    const savedHeight = Number(localStorage.getItem(commandDrawerHeightKey));
    if (Number.isFinite(savedHeight) && savedHeight > 0) setCommandDrawerHeight(savedHeight, { persist: false });
    else {
      const compact = matchMedia("(max-width: 650px)").matches;
      setCommandDrawerHeight(Math.min(window.innerHeight * (compact ? 0.72 : 0.56), 520), { persist: false });
    }

    elements.commandResizeHandle.addEventListener("pointerdown", (browserEvent) => {
      browserEvent.preventDefault();
      const startY = browserEvent.clientY;
      const startHeight = elements.commandDrawer.getBoundingClientRect().height;
      elements.commandResizeHandle.classList.add("dragging");
      elements.commandResizeHandle.setPointerCapture(browserEvent.pointerId);
      eventBus.emit("commands.drawer.resize.started", { height: Math.round(startHeight), projectId: library.activeProjectId });

      const move = (moveEvent) => {
        setCommandDrawerHeight(startHeight + startY - moveEvent.clientY, { persist: false });
      };
      const finish = () => {
        elements.commandResizeHandle.classList.remove("dragging");
        elements.commandResizeHandle.removeEventListener("pointermove", move);
        elements.commandResizeHandle.removeEventListener("pointerup", finish);
        elements.commandResizeHandle.removeEventListener("pointercancel", finish);
        const height = Math.round(elements.commandDrawer.getBoundingClientRect().height);
        runUi(() => executeCommand(`commands.drawer.height.set ${height}`, "UI"));
      };
      elements.commandResizeHandle.addEventListener("pointermove", move);
      elements.commandResizeHandle.addEventListener("pointerup", finish);
      elements.commandResizeHandle.addEventListener("pointercancel", finish);
    });

    elements.commandResizeHandle.addEventListener("keydown", (browserEvent) => {
      const current = elements.commandDrawer.getBoundingClientRect().height;
      const changes = {
        ArrowUp: current + 24,
        ArrowDown: current - 24,
        Home: COMMAND_DRAWER_MIN_HEIGHT,
        End: commandDrawerMaximumHeight(),
      };
      if (!(browserEvent.key in changes)) return;
      browserEvent.preventDefault();
      runUi(() => executeCommand(`commands.drawer.height.set ${Math.round(changes[browserEvent.key])}`, "UI"));
    });

    window.addEventListener("resize", () => {
      const current = elements.commandDrawer.getBoundingClientRect().height;
      if (current > commandDrawerMaximumHeight()) setCommandDrawerHeight(current, { emit: true });
      else elements.commandResizeHandle.setAttribute("aria-valuemax", String(commandDrawerMaximumHeight()));
    });
  }

  function setupCommandLibrary() {
    definitions.forEach((definition) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "command-definition";
      item.dataset.control = "commands.library.select";
      item.dataset.search = `${definition.signature} ${definition.description} ${definition.example}`.toLowerCase();
      const signature = document.createElement("code");
      signature.textContent = definition.signature;
      const description = document.createElement("p");
      description.textContent = `${definition.description} Example: ${definition.example}`;
      item.append(signature, description);
      item.addEventListener("click", () => runUi(() => executeCommand(`commands.library.select ${quote(definition.name)}`, "UI")));
      elements.commandLibrary.append(item);
    });
  }

  function commonPrefix(values) {
    if (!values.length) return "";
    return values.reduce((prefix, value) => {
      let index = 0;
      while (index < prefix.length && index < value.length && prefix[index] === value[index]) index += 1;
      return prefix.slice(0, index);
    });
  }

  function getCommandCompletion(value = elements.commandInput.value) {
    const trimmed = value.trim();
    if (!trimmed || /\r?\n/.test(value)) return null;

    let tokens;
    try {
      tokens = tokenize(value);
    } catch {
      return null;
    }

    const completingCommandName = tokens.length === 1 && !/\s$/.test(value);
    if (completingCommandName) {
      const matches = definitions.filter((definition) => definition.name.startsWith(tokens[0]));
      if (!matches.length) return null;
      const completion = matches.length === 1 ? matches[0].name : commonPrefix(matches.map((definition) => definition.name));
      if (completion.length <= tokens[0].length) return null;
      return { value: matches.length === 1 ? `${completion} ` : completion };
    }

    const definition = definitions.find((entry) => entry.name === tokens[0] || entry.aliases?.includes(tokens[0]));
    if (!definition?.complete) return null;
    const hasTrailingSpace = /\s$/.test(value);
    const completedArguments = tokens.slice(1, hasTrailingSpace ? undefined : -1);
    const prefix = hasTrailingSpace ? "" : tokens.at(-1);
    const argumentIndex = completedArguments.length;
    const suggestions = definition.complete({
      project: projectContext(),
      library: clone(library),
      commands: definitions,
      prefix,
      argumentIndex,
    }).filter((suggestion) => String(suggestion).startsWith(prefix));
    if (!suggestions.length) return null;

    const completed = suggestions.length === 1 ? String(suggestions[0]) : commonPrefix(suggestions.map(String));
    if (completed.length <= prefix.length) return null;
    const serializedArguments = [...completedArguments, /\s/.test(completed) ? quote(completed) : completed];
    return { value: `${definition.name} ${serializedArguments.join(" ")}${suggestions.length === 1 ? " " : ""}` };
  }

  function renderCommandSuggestion() {
    const prefix = elements.commandSuggestion.querySelector(".command-suggestion-prefix");
    const rest = elements.commandSuggestion.querySelector(".command-suggestion-rest");
    const value = elements.commandInput.value;
    const atEnd = elements.commandInput.selectionStart === value.length && elements.commandInput.selectionEnd === value.length;
    const completion = atEnd ? getCommandCompletion(value) : null;
    prefix.textContent = value;
    rest.textContent = completion?.value.startsWith(value) ? completion.value.slice(value.length) : "";
  }

  function completeCommandInput() {
    const completion = getCommandCompletion();
    if (!completion) return false;
    elements.commandInput.value = completion.value;
    elements.commandInput.setSelectionRange(completion.value.length, completion.value.length);
    renderCommandSuggestion();
    return true;
  }

  root.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => runUi(() => executeCommand(`view.open ${button.dataset.view}`, "UI")));
  });
  root.querySelectorAll("[data-new-project]").forEach((button) => {
    button.addEventListener("click", () => runUi(() => executeCommand("project.new.open", "UI")));
  });
  root.querySelectorAll('[data-control="project.new.close"]').forEach((button) => {
    button.addEventListener("click", (browserEvent) => {
      browserEvent.preventDefault();
      runUi(() => executeCommand("project.new.close", "UI"));
    });
  });
  elements.createProjectButton.addEventListener("click", (browserEvent) => {
    browserEvent.preventDefault();
    runUi(async () => {
      const name = elements.projectNameInput.value.trim();
      if (!name) throw new ValidationError("Project name is required.", "$.name");
      const raw = elements.projectDataInput.value.trim();
      await executeCommand(raw ? `project.new ${quote(name)} ${quote(raw)}` : `project.new ${quote(name)}`, "UI");
      elements.projectDialog.close();
      elements.projectForm.reset();
      elements.projectNameInput.value = application.project.newName;
    });
  });
  elements.importProjectButton.addEventListener("click", () => runUi(() => executeCommand("project.import.open", "UI")));
  elements.projectFileInput.addEventListener("change", async () => {
    const file = elements.projectFileInput.files[0];
    if (!file) return;
    try {
      await executeCommand(`project.import ${quote(await file.text())}`, "UI");
    } catch (error) {
      if (!error.notified) notify(`Import failed without changing the library. ${errorMessage(error)}`, "error");
    } finally {
      elements.projectFileInput.value = "";
    }
  });
  elements.sourceEditor.addEventListener("input", () => {
    sourceDraft = elements.sourceEditor.value;
    sourceDirty = sourceDraft !== application.source.serialize(activeProject().state);
    renderSource();
    eventBus.emit("source.draft.changed", { dirty: sourceDirty, projectId: library.activeProjectId });
  });
  elements.stateEditor.addEventListener("input", () => {
    stateDraft = elements.stateEditor.value;
    stateDirty = stateDraft !== JSON.stringify(createProjectDocument(activeProject()), null, 2);
    renderState();
    if (stateDirty) setStatus(elements.stateStatus, "Unapplied draft");
    eventBus.emit("state.draft.changed", { dirty: stateDirty, projectId: library.activeProjectId });
  });
  elements.applySourceButton.addEventListener("click", () => runUi(() => executeCommand("source.apply", "UI")));
  elements.applyStateButton.addEventListener("click", () => runUi(() => executeCommand("state.apply", "UI")));
  elements.reloadSourceButton.addEventListener("click", () => runUi(() => executeCommand("source.reload", "UI")));
  elements.reloadStateButton.addEventListener("click", () => runUi(() => executeCommand("state.reload", "UI")));
  root.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => {
    runUi(() => executeCommand(`${button.dataset.copy}.copy`, "UI"));
  }));
  root.querySelectorAll("[data-download]").forEach((button) => button.addEventListener("click", () => {
    runUi(() => executeCommand(`${button.dataset.download}.download`, "UI"));
  }));
  elements.themeSelect.addEventListener("change", () => runUi(() => executeCommand(`theme.set ${elements.themeSelect.value}`, "UI")));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (elements.themeSelect.value === "system") setTheme("system", "System", false);
  });
  elements.commandToggle.addEventListener("click", () => {
    runUi(() => executeCommand(elements.commandDrawer.classList.contains("open") ? "commands.close" : "commands.open", "UI"));
  });
  elements.closeCommandsButton.addEventListener("click", () => runUi(() => executeCommand("commands.close", "UI")));
  document.addEventListener("keydown", (browserEvent) => {
    if (browserEvent.key === "Escape" && elements.commandDrawer.classList.contains("open")) {
      runUi(() => executeCommand("commands.close", "UI"));
    }
  });
  elements.commandForm.addEventListener("submit", async (browserEvent) => {
    browserEvent.preventDefault();
    const commands = elements.commandInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!commands.length) return;
    const failures = [];
    preserveCommandInput = false;
    for (const [index, input] of commands.entries()) {
      try {
        await executeCommand(input);
      } catch (error) {
        failures.push(`Line ${index + 1}: ${errorMessage(error)}`);
      }
    }
    if (!preserveCommandInput) {
      elements.commandInput.value = "";
      commandDraft = "";
    }
    resizeCommandPrompt();
    if (failures.length) {
      elements.commandInput.setCustomValidity(failures.join("\n"));
      elements.commandInput.reportValidity();
      elements.commandInput.setCustomValidity("");
    }
  });
  elements.commandInput.addEventListener("input", () => {
    commandDraft = elements.commandInput.value;
    resizeCommandPrompt();
  });
  elements.commandInput.addEventListener("keydown", (browserEvent) => {
    const entries = projectContext()?.history || [];
    const multiline = /\r?\n/.test(elements.commandInput.value);
    if (browserEvent.key === "Enter" && !browserEvent.shiftKey) {
      browserEvent.preventDefault();
      elements.commandForm.requestSubmit();
    } else if (browserEvent.key === "ArrowUp" && entries.length && !multiline) {
      browserEvent.preventDefault();
      commandCursor = Math.max(0, commandCursor - 1);
      elements.commandInput.value = entries[commandCursor]?.input || "";
      resizeCommandPrompt();
    } else if (browserEvent.key === "ArrowDown" && entries.length && !multiline) {
      browserEvent.preventDefault();
      commandCursor = Math.min(entries.length, commandCursor + 1);
      elements.commandInput.value = entries[commandCursor]?.input || commandDraft;
      resizeCommandPrompt();
    } else if (browserEvent.key === "Tab" && !multiline) {
      if (completeCommandInput()) browserEvent.preventDefault();
    }
  });
  elements.commandHistorySearch.addEventListener("input", () => filterCommandHistory(elements.commandHistorySearch.value));
  elements.commandSearch.addEventListener("input", () => filterCommandLibrary(elements.commandSearch.value));
  elements.copyHistoryButton.addEventListener("click", () => runUi(() => executeCommand("commands.history.copy", "UI")));
  elements.exportHistoryButton.addEventListener("click", () => runUi(() => executeCommand("commands.history.export", "UI")));
  elements.clearHistoryButton.addEventListener("click", () => runUi(() => executeCommand("commands.history.clear", "UI")));

  if (unreadableSavedData) {
    elements.recoveryNotice.classList.remove("hidden");
    elements.downloadRecoveryButton.addEventListener("click", () => runUi(() => executeCommand("recovery.download", "UI")));
  }

  window.addEventListener("hashchange", () => {
    const requested = new URLSearchParams(location.hash.slice(1)).get("project");
    if (requested && requested !== library.activeProjectId && (sourceDirty || stateDirty)) {
      writeRoute(activeView);
      notify(errorMessage(new ValidationError("Apply or reload the current drafts before opening another project.", "$.drafts")), "error");
      return;
    }
    const route = readRoute();
    activeView = route.view;
    synchronizeDrafts();
    render();
  });

  setupCommandLibrary();
  setupCommandDrawerResize();
  elements.themeSelect.value = localStorage.getItem(THEME_KEY) || "system";
  setTheme(elements.themeSelect.value, "System", false);
  synchronizeDrafts();
  render();
  if (localStorage.getItem(commandDrawerOpenKey) === "true") {
    openCommands({ persist: false, focus: false, emit: false });
  }

  return Object.freeze({
    dispatch,
    executeCommand,
    setView,
    subscribe: eventBus.subscribe,
    getSnapshot: () => clone({ library, activeView, sourceDirty, stateDirty }),
  });
}
