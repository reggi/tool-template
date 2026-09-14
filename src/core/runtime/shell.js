export function renderShell(root, application) {
  root.innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <a class="hub-link" href="${application.toolsUrl}" aria-label="All tools" title="All tools">
            <span></span><span></span><span></span><span></span>
          </a>
          <span class="brand-divider" aria-hidden="true"></span>
          <span class="brand-mark" aria-hidden="true">${application.iconText}</span>
          <span class="brand-copy"><strong>${application.title}</strong><span id="activeProjectLabel">${application.description}</span></span>
        </div>
        <nav class="view-switcher" aria-label="Project views">
          <button class="view-button" data-control="view.projects" data-view="projects" type="button">Projects</button>
          <button class="view-button" data-control="view.source" data-view="source" type="button">Source</button>
          <button class="view-button" data-control="view.workspace" data-view="workspace" type="button">Workspace</button>
          <button class="view-button" data-control="view.state" data-view="state" type="button">State JSON</button>
        </nav>
        <div class="global-actions">
          <label class="theme-control"><span>Theme</span><select id="themeSelect" aria-label="Theme">
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select></label>
          <button class="button primary" data-control="project.new.open" data-new-project type="button">New project</button>
        </div>
      </header>
      <div class="notice hidden" id="recoveryNotice" role="alert">
        <span>Saved data could not be read. A fresh library is open; the original data has not been overwritten.</span>
        <button class="button" data-control="recovery.download" id="downloadRecoveryButton" type="button">Download unreadable data</button>
      </div>
      <main id="main">
        <section class="view" id="projectsView" aria-labelledby="projectsTitle">
          <header class="page-header"><div><h1 id="projectsTitle" tabindex="-1">Projects</h1><p>Each project has independent state and command history.</p></div>
            <div class="button-row"><button class="button" data-control="project.import.open" id="importProjectButton" type="button">Import project</button>
            <button class="button primary" data-control="project.new.open" data-new-project type="button">New project</button></div>
          </header>
          <div class="project-grid" id="projectGrid"></div>
          <p class="empty-state hidden" id="projectsEmpty">No projects yet. Create or import one to begin.</p>
        </section>
        <section class="view hidden" id="sourceView" aria-labelledby="sourceTitle">
          <header class="page-header"><div><h1 id="sourceTitle" tabindex="-1">Source</h1><p>${application.source.description}</p></div><span class="draft-badge" id="sourceBadge">Synchronized</span></header>
          <div class="editor-layout">
            <section class="panel editor-panel">
              <div class="panel-header"><div><h2>${application.source.title}</h2><p>${application.source.help}</p></div>
                <div class="button-row"><button class="button" data-control="source.copy" data-copy="source" type="button">Copy</button>
                <button class="button" data-control="source.download" data-download="source" type="button">Download</button></div>
              </div>
              <textarea id="sourceEditor" class="code-editor" spellcheck="false" aria-describedby="sourceStatus"></textarea>
              <div class="editor-footer"><p id="sourceStatus" class="status" role="status">Synchronized</p>
                <div class="button-row"><button class="button hidden" data-control="source.reload" id="reloadSourceButton" type="button">Reload live state</button>
                <button class="button primary" data-control="source.apply" id="applySourceButton" type="button">Apply changes</button></div>
              </div>
            </section>
            <aside class="panel preview-panel"><div class="panel-header"><div><h2>Normalized preview</h2><p>Live state remains unchanged until the whole draft is valid.</p></div></div><div id="sourcePreview"></div></aside>
          </div>
        </section>
        <section class="view hidden" id="workspaceView" aria-labelledby="workspaceTitle">
          <header class="page-header"><div><h1 id="workspaceTitle" tabindex="-1">Workspace</h1><p>${application.workspace.description}</p></div></header>
          <div id="workspaceMount"></div>
        </section>
        <section class="view hidden" id="stateView" aria-labelledby="stateTitle">
          <header class="page-header"><div><h1 id="stateTitle" tabindex="-1">State JSON</h1><p>The complete durable state of the selected project.</p></div><span class="draft-badge" id="stateBadge">Synchronized</span></header>
          <section class="panel editor-panel state-panel">
            <div class="panel-header"><div><h2 id="stateProjectName">Project state</h2><p>Invalid text stays in the editor and never partially changes live state.</p></div>
              <div class="button-row"><button class="button" data-control="state.copy" data-copy="state" type="button">Copy</button>
              <button class="button" data-control="state.download" data-download="state" type="button">Download</button></div>
            </div>
            <textarea id="stateEditor" class="code-editor state-editor" spellcheck="false" aria-describedby="stateStatus"></textarea>
            <div class="editor-footer"><p id="stateStatus" class="status" role="status">Valid</p>
              <div class="button-row"><button class="button hidden" data-control="state.reload" id="reloadStateButton" type="button">Reload live state</button>
              <button class="button primary" data-control="state.apply" id="applyStateButton" type="button">Apply state</button></div>
            </div>
          </section>
        </section>
      </main>
    </div>
    <div class="toast-region" id="toastRegion" aria-live="polite" aria-atomic="false"></div>
    <button class="command-toggle" data-control="commands.open" id="commandToggle" type="button" aria-label="Commands" title="Commands" aria-controls="commandDrawer" aria-expanded="false"><code aria-hidden="true">&gt;_</code></button>
    <aside class="command-drawer" id="commandDrawer" aria-hidden="true" aria-labelledby="commandTitle">
      <div class="command-resize-handle" id="commandResizeHandle" role="separator" aria-label="Resize command drawer" aria-orientation="horizontal" aria-valuemin="220" tabindex="0"></div>
      <header class="command-header"><h2 id="commandTitle">Console</h2><div class="command-actions">
        <button data-control="commands.history.copy" type="button" id="copyHistoryButton">Copy</button>
        <button data-control="commands.history.export" type="button" id="exportHistoryButton">Export</button>
        <button data-control="commands.history.clear" type="button" id="clearHistoryButton">Clear</button>
        <button data-control="commands.close" type="button" id="closeCommandsButton" aria-label="Close commands" title="Close commands">×</button>
      </div></header>
      <div class="command-body">
        <section class="command-history-pane" aria-label="Command history"><label for="commandHistorySearch">History</label><input id="commandHistorySearch" type="search" placeholder="Search history" /><div class="command-history" id="commandHistory" aria-live="polite"></div></section>
        <aside class="command-library" aria-label="Command library"><label for="commandSearch">Command library</label><input id="commandSearch" type="search" placeholder="Filter commands" /><div id="commandLibrary"></div></aside>
      </div>
      <form class="command-prompt" id="commandForm"><label for="commandInput">&gt;</label><div class="command-input-wrap"><div class="command-suggestion" id="commandSuggestion" aria-hidden="true"><span class="command-suggestion-prefix"></span><span class="command-suggestion-rest"></span></div><textarea id="commandInput" rows="1" autocomplete="off" spellcheck="false" placeholder="${application.commandPlaceholder}"></textarea></div><span>↑↓ history · Tab complete · Shift+Enter newline · Esc close</span><button data-control="commands.run" type="submit">Run</button></form>
    </aside>
    <dialog id="projectDialog"><form method="dialog" id="projectForm">
      <div class="dialog-header"><div><h2>New project</h2><p>Start blank, paste Source, or paste canonical project JSON.</p></div><button class="icon-button" data-control="project.new.close" value="cancel" aria-label="Close new project dialog" title="Close">×</button></div>
      <label class="field">Project name<input id="projectNameInput" required value="${application.project.newName}" /></label>
      <label class="field">Initial data<textarea id="projectDataInput" class="dialog-editor" spellcheck="false" placeholder="${application.source.placeholder}"></textarea></label>
      <p class="status" id="projectDialogStatus" role="status">Leave initial data empty to use the starter state.</p>
      <div class="dialog-actions"><button class="button" data-control="project.new.close" value="cancel">Cancel</button><button class="button primary" data-control="project.new.create" id="createProjectButton" value="default">Create project</button></div>
    </form></dialog>
    <input class="hidden" id="projectFileInput" type="file" accept="application/json,.json" />
  `;
}
