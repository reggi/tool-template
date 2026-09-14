# HTML Tool Framework

A Vite-based framework for building portable HTML tools that follow the
playbooks in `playbooks/html/` and the domain-first organization in
`playbooks/domain.md`.

```sh
npm install
npm run dev
```

Production commands:

```sh
npm run build
npm run preview
npm test
```

The built application has no runtime package dependencies. Vite is used for
development and production bundling.

## Domain structure

```text
src/
  core/
    commands/             command grammar and history
    events/               public hook/event bus
    projects/             project and library lifecycle
    runtime/              shell and orchestration
    application.js        application adapter contract
    errors.js
    index.js              the only application-facing core import
    styles.css
    values.js
  app/
    checklist/
      actions.js          domain transitions
      commands.js         checklist.* command definitions
      project.js          project summary and preview
      source.js           Source grammar and preview
      state.js            schema, validation, migration
      styles.css
      workspace.js        domain workspace
    config.js             one composed application adapter
    main.js               Vite entry point
```

The public vocabulary mirrors the filesystem. For example,
`src/app/checklist/actions.js` exposes actions named
`checklist.items.add`, `checklist.items.rename`,
`checklist.items.delete`, and `checklist.settings.density.set`.

Application code imports only `src/core/index.js`. It does not edit framework
runtime files. A future core update can therefore replace `src/core/` while the
application remains behind the same adapter contract.

## Application adapter

`defineApplication()` validates one configuration object:

```js
export const application = defineApplication({
  id: "my-tool.document",
  title: "My tool",
  storageKey: "my-tool.document.library",
  schemaVersion: 1,
  initialCommands: ['document.items.add "Example"'],
  project: {
    defaultName: "Starter project",
    newName: "Untitled project",
    summarize,
    renderPreview,
  },
  state: { create, validate, migrate },
  source: {
    title,
    description,
    help,
    placeholder,
    extension,
    mimeType,
    parse,
    serialize,
    renderPreview,
  },
  workspace: { description, render },
  actions: { reduce, describe, toCommand },
  commands,
});
```

The core owns:

- `Projects -> Source -> Workspace -> State JSON` routing;
- independent project persistence, recovery, import, export, duplication, and
  confirmed deletion;
- atomic Source and State JSON application;
- dirty/stale draft protection;
- System, Light, and Dark theme resolution;
- the attached command console, history, search, copy, export, clearing,
  clickable examples, Tab completion, persisted visibility and drag/keyboard
  resizing, and initial suggested commands;
- synchronization and history around application actions;
- global control and lifecycle events.

The application owns only its domain state, grammar, actions, commands,
previews, workspace, and domain CSS.

## Updating projects created from this template

This repository is a [Knitto](https://github.com/reggi/knitto) source. Projects
created from the GitHub template keep their application code independent while
receiving framework updates from:

```text
https://github.com/reggi/tool-template.git
```

Knitto owns `src/core/**`, the template-update workflow, and only the declared
framework fields in `package.json`. It does not own `src/app/**`, application
branding, or application tests.

Review an available update:

```bash
npm run template:plan
```

Apply it locally, refresh dependencies, and validate:

```bash
npm run template:update
npm install
npm test
npm run build
```

Commit `.knitto.json` and the generated `.knitto.lock`. A weekly and manually
dispatchable workflow at `.github/workflows/knitto-update.yml` performs the
same update and opens or refreshes a pull request when managed files change.
Projects can opt out of a complete rule or a specific managed package field
through the exclusions and overrides in `.knitto.json`.

## State JSON and exports

The editable State JSON view and the project card's `Export` button use the
same portable document:

```json
{
  "documentVersion": 1,
  "projectId": "project_<opaque-id>",
  "name": "Starter project",
  "state": {
    "schemaVersion": 1
  }
}
```

The project name is therefore editable and portable with state. Changing
`projectId` from the State JSON editor is rejected so references cannot be
silently broken. Import preserves a valid project ID unless it collides with an
existing project.

Command history is intentionally excluded from State JSON and project export.
Use the console's separate `Export` history action when history is needed.

## Hookable controls and lifecycle

Every framework and application button has a stable `data-control` name.
The core captures all button activation—including keyboard activation—and
dispatches a bubbling DOM event:

```js
document.querySelector("#app").addEventListener("html-tool:control", (event) => {
  console.log(event.detail.control);
});
```

Subscribe without DOM coupling through the runtime:

```js
const unsubscribe = window.htmlTool.subscribe((event) => {
  console.log(event.type, event);
});
```

Important hook names:

| Hook | Meaning |
| --- | --- |
| `control` | Any button was activated; includes its stable control name. |
| `action.before` | An application action passed parsing and is about to reduce. |
| `action.after` | An application action committed, persisted, and rendered. |
| `action.error` | An application action failed without mutation. |
| `command.before` | Command execution started. |
| `command.after` | Command execution succeeded. |
| `command.error` | Command execution failed and was recorded. |
| `project.created`, `project.opened`, `project.renamed` | Project lifecycle events. |
| `project.duplicated`, `project.imported`, `project.deleted` | Project lifecycle events. |
| `source.applied`, `source.error` | Source transaction result. |
| `state.applied`, `state.error` | State JSON transaction result. |
| `source.draft.changed`, `state.draft.changed` | Draft state changed. |
| `view.changed`, `theme.changed` | Navigation or theme changed. |
| `commands.opened`, `commands.closed` | Console visibility changed. |
| `commands.library.selected` | A command example populated the prompt. |
| `commands.drawer.resize.started`, `commands.drawer.resized` | Console resizing started or committed. |
| `commands.history.cleared` | Destructive history clearing completed. |

Every hook also dispatches as `html-tool:<hook>`, such as
`html-tool:action.after`. Event details include a timestamp and the relevant
project, action, command, state, payload, result, or error fields.

The runtime API is:

```js
window.htmlTool.dispatch(action, payload, options);
await window.htmlTool.executeCommand(input, origin);
window.htmlTool.setView("projects" | "source" | "workspace" | "state");
window.htmlTool.subscribe(listener);
window.htmlTool.getSnapshot();
```

## Adding an application action

1. Add the reducer branch to the domain's `actions.js`.
2. Add its result text and canonical command in the same file.
3. Add a command definition under the same domain path and vocabulary.
4. Dispatch the action from the workspace control.
5. Give every button a stable `data-control` matching that domain action.
6. Add reducer, command-parity, failure-atomicity, and round-trip tests.

Do not add application cases to the core runtime.

## Command parity audit

Every actionable button is checked by `tests/static.test.mjs` against the
framework and application command manifests. `commands.run` is the command
channel submit control itself; every other button maps to a command.

| Surface | UI controls | Canonical commands |
| --- | --- | --- |
| Navigation | Projects, Source, Workspace, State JSON | `view.open <view>` |
| Project creation | Open/close dialog, create project | `project.new.open`, `project.new.close`, `project.new ...` |
| Project files | Open import picker, import JSON, export state | `project.import.open`, `project.import ...`, `project.export <id>` |
| Project lifecycle | Open, rename, duplicate, delete | `project.open <id>`, `project.rename <id> <name>`, `project.duplicate <id>`, `project.delete <id>` |
| Source | Copy, download, reload, apply | `source.copy`, `source.download`, `source.reload`, `source.apply` |
| State JSON | Copy, download, reload, apply | `state.copy`, `state.download`, `state.reload`, `state.apply` |
| Checklist | Add, rename, delete, density | `checklist.items.*`, `checklist.settings.density.set` |
| Theme | Theme selector | `theme.set` |
| Console | Open, close, select library entry | `commands.open`, `commands.close`, `commands.library.select` |
| Console filters | Library and history search | `commands.library.search`, `commands.history.search` |
| Console size | Drag or keyboard resize | `commands.drawer.height.set` |
| History | Copy, export, clear | `commands.history.copy`, `commands.history.export`, `commands.history.clear` |
| Recovery | Download unreadable saved data | `recovery.download` |

Visual controls invoke the same handlers as typed commands for committed
actions and transfer operations. Rapid search typing remains an uncommitted
filter draft, but the same result is reproducible with its search command.

## Framework brief

This repository began empty, so these are reversible assumptions for a starter:

| Area | Status | Decision |
| --- | --- | --- |
| Primary task | **Assumed** | Provide a composable architecture for project-based HTML tools. |
| Projects | **Assumed** | Local, independent projects with stable IDs and portable JSON. |
| State JSON | **Assumed** | Complete versioned state with strict atomic validation. |
| Source | **Assumed** | An explicit domain projection that preserves unrelated state and stable identity. |
| Commands | **Assumed** | One allowlisted manifest per domain plus framework lifecycle commands. |
| Synchronization | **Assumed** | UI, Source, State JSON, commands, persistence, and history share transactions. |
| Navigation | **Assumed** | `Projects -> Source -> Workspace -> State JSON`. |
| Responsive | **Assumed** | No page-level horizontal scrolling at 320px or 390px. |
| Theme | **Assumed** | Persisted System, Light, and Dark modes. |
| Accessibility | **Assumed** | Semantic structure, labels, focus restoration, keyboard/touch operation, live errors, zoom support, and matching DOM/visual order. |
| Delivery | **Assumed** | Vite static build, tools-hub link, canonical metadata, favicon, and social card. |

For a real conversion, relabel evidence as **Observed**, owner choices as
**Confirmed**, reversible agent choices as **Assumed**, and unsafe unresolved
decisions as **Blocked**.

## Required acceptance pass

- Existing supported data opens without loss or has a tested migration.
- Multiple projects never overwrite one another.
- State JSON round-trips every durable value.
- Source round-trips its documented projection without erasing unrelated state.
- Every meaningful state-changing control has a canonical command.
- Visual controls and commands reach the same reducer and history path.
- Invalid Source, JSON, imports, actions, and commands fail atomically.
- Dirty drafts remain visible and block unsafe project switching.
- Projects, Source, Workspace, State JSON, and the console all work at desktop,
  320px, 390px, 200% zoom, keyboard, and touch layouts.
- Every button emits `html-tool:control`; lifecycle operations emit their named
  hooks.
- Light and dark themes cover all surfaces.
- Metadata, canonical URL, favicon, social card, and `All tools` link are
  updated for the deployed tool.
