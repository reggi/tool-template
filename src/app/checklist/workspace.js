export function renderWorkspace({ container, state, dispatch, createButton }) {
  const layout = document.createElement("div");
  layout.className = "workspace-layout";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = `<div class="panel-header"><div><h2>Checklist items</h2><p>${state.items.length} item${state.items.length === 1 ? "" : "s"}</p></div></div>`;

  const form = document.createElement("form");
  form.className = "add-form";
  const label = document.createElement("label");
  label.htmlFor = "newChecklistItem";
  label.textContent = "New item";
  const controls = document.createElement("div");
  controls.className = "input-action";
  const input = document.createElement("input");
  input.id = "newChecklistItem";
  input.required = true;
  input.maxLength = 200;
  input.autocomplete = "off";
  const add = document.createElement("button");
  add.className = "button primary";
  add.type = "submit";
  add.dataset.control = "checklist.items.add";
  add.textContent = "Add item";
  controls.append(input, add);
  form.append(label, controls);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    dispatch("checklist.items.add", { label: input.value });
  });

  const list = document.createElement("ul");
  list.className = "item-list";
  list.dataset.density = state.settings.density;
  if (!state.items.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No items. Add one above or apply Source.";
    list.append(empty);
  }
  state.items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "item-row";
    const identity = document.createElement("div");
    const itemLabel = document.createElement("strong");
    itemLabel.textContent = item.label;
    const id = document.createElement("code");
    id.textContent = item.id;
    identity.append(itemLabel, id);
    const rename = createButton("Rename", "checklist.items.rename", () => {
      const next = prompt("Item label", item.label);
      if (next?.trim() && next.trim() !== item.label) dispatch("checklist.items.rename", { id: item.id, label: next.trim() });
    });
    rename.classList.add("rename-button");
    const remove = createButton("Delete", "checklist.items.delete", () => {
      if (confirm(`Delete "${item.label}"? This item will be removed from the project.`)) dispatch("checklist.items.delete", { id: item.id });
    }, "button danger");
    row.append(identity, rename, remove);
    list.append(row);
  });
  panel.append(form, list);

  const aside = document.createElement("aside");
  aside.className = "panel framework-notes";
  aside.innerHTML = `
    <div class="panel-header"><div><h2>Application settings</h2><p>This panel belongs to the checklist domain.</p></div></div>
    <div class="application-settings">
      <label class="inline-field">Density
        <select data-control="checklist.settings.density.set">
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </label>
      <dl>
        <div><dt>Canonical state</dt><dd>Versioned, validated, and lossless.</dd></div>
        <div><dt>Source projection</dt><dd>Items and order; settings survive edits.</dd></div>
        <div><dt>Hook contract</dt><dd>Listen for <code>html-tool:control</code> and <code>html-tool:action.*</code>.</dd></div>
      </dl>
    </div>`;
  const density = aside.querySelector("select");
  density.value = state.settings.density;
  density.addEventListener("change", () => dispatch("checklist.settings.density.set", { density: density.value }));
  layout.append(panel, aside);
  container.append(layout);
}
