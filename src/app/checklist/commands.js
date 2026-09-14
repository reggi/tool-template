import { ValidationError, exactArguments } from "../../core/index.js";

const command = (definition) => ({ aliases: [], ...definition });

export const commands = [
  command({
    name: "checklist.items.add",
    signature: "checklist.items.add <label>",
    description: "Add a checklist item.",
    action: "checklist.items.add",
    reads: ["checklist.items"],
    writes: ["checklist.items"],
    reversible: true,
    example: 'checklist.items.add "Review mobile layout"',
    parse(args) { exactArguments(this.name, args, 1); return { label: args[0] }; },
  }),
  command({
    name: "checklist.items.rename",
    signature: "checklist.items.rename <id> <label>",
    description: "Rename a checklist item by stable ID.",
    action: "checklist.items.rename",
    reads: ["checklist.items"],
    writes: ["checklist.items"],
    reversible: true,
    example: 'checklist.items.rename "item_id" "New label"',
    parse(args) { exactArguments(this.name, args, 2); return { id: args[0], label: args[1] }; },
    complete({ project, argumentIndex }) { return argumentIndex === 0 ? project?.state.items.map((item) => item.id) || [] : []; },
  }),
  command({
    name: "checklist.items.delete",
    signature: "checklist.items.delete <id>",
    description: "Delete a checklist item by stable ID.",
    action: "checklist.items.delete",
    reads: ["checklist.items"],
    writes: ["checklist.items"],
    reversible: false,
    destructive: true,
    example: 'checklist.items.delete "item_id"',
    parse(args) { exactArguments(this.name, args, 1); return { id: args[0] }; },
    complete({ project, argumentIndex }) { return argumentIndex === 0 ? project?.state.items.map((item) => item.id) || [] : []; },
  }),
  command({
    name: "checklist.settings.density.set",
    signature: "checklist.settings.density.set <comfortable|compact>",
    description: "Set checklist row density.",
    action: "checklist.settings.density.set",
    reads: ["checklist.settings.density"],
    writes: ["checklist.settings.density"],
    reversible: true,
    example: "checklist.settings.density.set compact",
    complete({ argumentIndex }) { return argumentIndex === 0 ? ["comfortable", "compact"] : []; },
    parse(args) {
      exactArguments(this.name, args, 1);
      if (!["comfortable", "compact"].includes(args[0])) {
        throw new ValidationError('Density must be "comfortable" or "compact".', "$command");
      }
      return { density: args[0] };
    },
  }),
];
