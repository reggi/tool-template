import { defineApplication } from "../core/index.js";
import { actionToCommand, describeAction, reduceAction } from "./checklist/actions.js";
import { commands } from "./checklist/commands.js";
import { renderProjectPreview, summarizeProject } from "./checklist/project.js";
import { parseSource, renderSourcePreview, serializeSource } from "./checklist/source.js";
import { SCHEMA_VERSION, createState, migrateState, validateState } from "./checklist/state.js";
import { renderWorkspace } from "./checklist/workspace.js";

export const application = defineApplication({
  id: "html-tool-framework.checklist",
  title: "HTML Tool Framework",
  description: "Composable tool starter",
  iconText: "</>",
  toolsUrl: "https://reggi.github.io/",
  storageKey: "html-tool-framework.checklist.library",
  schemaVersion: SCHEMA_VERSION,
  commandPlaceholder: 'checklist.items.add "Example"',
  initialCommands: [
    'checklist.items.add "Review the Source grammar"',
    "checklist.settings.density.set compact",
    "view.open source",
  ],
  project: {
    defaultName: "Starter project",
    newName: "Untitled project",
    summarize: summarizeProject,
    renderPreview: renderProjectPreview,
  },
  state: {
    create: createState,
    validate: validateState,
    migrate: migrateState,
  },
  source: {
    title: "Checklist source",
    description: "One item per line. Blank lines and lines beginning with # are ignored.",
    help: "Source controls item identity and order; project settings are preserved.",
    placeholder: "One item per line, or a JSON project document",
    extension: "source.txt",
    mimeType: "text/plain",
    parse: parseSource,
    serialize: serializeSource,
    renderPreview: renderSourcePreview,
  },
  workspace: {
    description: "Application controls dispatch typed actions through the framework runtime.",
    render: renderWorkspace,
  },
  actions: {
    reduce: reduceAction,
    describe: describeAction,
    toCommand: actionToCommand,
  },
  commands,
});
