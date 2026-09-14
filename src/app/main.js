import { createHtmlTool } from "../core/index.js";
import { application } from "./config.js";

const root = document.querySelector("#app");

export const htmlTool = createHtmlTool({
  root,
  application,
  hooks: [
    (event) => {
      if (import.meta.env?.DEV) console.debug(`[${event.type}]`, event);
    },
  ],
});

window.htmlTool = htmlTool;
