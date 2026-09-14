export function summarizeProject(state) {
  return `${state.items.length} item${state.items.length === 1 ? "" : "s"}`;
}

export function renderProjectPreview({ container, project }) {
  if (!project.state.items.length) {
    container.textContent = "Blank project";
    return;
  }
  const list = document.createElement("ol");
  project.state.items.slice(0, 4).forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item.label;
    list.append(row);
  });
  container.append(list);
}
