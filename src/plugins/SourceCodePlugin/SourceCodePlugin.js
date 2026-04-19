import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";

export function setupSourceCodePlugin(editor) {
  onEditorReady(editor, () => {
    registerCommand(editor);
    registerUI(editor);
    registerShortcut(editor);
  });
}

/* -----------------------------
   Lifecycle Safe
----------------------------- */
function onEditorReady(editor, cb) {
  if (typeof editor.on === "function") {
    editor.on("ready", cb);
    return;
  }

  if (editor.root) {
    cb();
    return;
  }

  const interval = setInterval(() => {
    if (editor.root) {
      clearInterval(interval);
      cb();
    }
  }, 10);
}

/* -----------------------------
   Command (حل خطای whitelist)
----------------------------- */
function registerCommand(editor) {
  // سیستم commands اگر وجود داره
  if (editor.commands?.add) {
    editor.commands.add("sourcecode", () => {
      openSourceCodeModal(editor);
    });
  }

  // 👇 اگر whitelist داری (احتمال زیاد داری)
  if (editor.commands?.whitelist) {
    if (!editor.commands.whitelist.includes("sourcecode")) {
      editor.commands.whitelist.push("sourcecode");
    }
  }
}

/* -----------------------------
   UI Button
----------------------------- */
function registerUI(editor) {
  editor.ui.registry.addButton("sourcecode", {
    icon: "sourcecode",
    tooltip: "Source Code (Ctrl+Shift+S)",
    onAction: () => {
      // 👇 همیشه از command استفاده کن
      if (editor.execCommand) {
        editor.execCommand("sourcecode");
      } else {
        openSourceCodeModal(editor);
      }
    }
  });
}

/* -----------------------------
   Shortcut
----------------------------- */
function registerShortcut(editor) {
  if (editor.shortcuts?.add) {
    editor.shortcuts.add("Ctrl+Shift+S", () => {
      editor.execCommand?.("sourcecode");
    });
    return;
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      editor.execCommand?.("sourcecode");
    }
  });
}

/* -----------------------------
   Modal + CodeMirror
----------------------------- */
function openSourceCodeModal(editor) {
  const savedSelection = editor.selection?.save?.();
  const currentHTML = editor.getHTML();

  let view = null;

  editor.ui.createModal({
    title: "Source Code",

    body: `
      <div id="penman-source-code-container"
           style="height:400px; border:1px solid #ccc;"></div>
    `,

    submitText: "Save",
    cancelText: "Cancel",

    onOpen: () => {
      const container = document.getElementById("penman-source-code-container");
      if (!container) return;

      const state = EditorState.create({
        doc: currentHTML,
        extensions: [
          keymap.of(defaultKeymap),
          html(),
          EditorView.lineWrapping,

          // RTL واقعی
          EditorView.theme({
            "&": {
              direction: "rtl",
              textAlign: "left"
            }
          })
        ]
      });

      view = new EditorView({
        state,
        parent: container
      });
    },

    onSubmit: () => {
      if (!view) return;

      const newHTML = view.state.doc.toString();

      editor.setHTML(newHTML);

      if (savedSelection) {
        editor.selection.restore(savedSelection);
      }

      view.destroy();
    },

    onCancel: () => {
      if (savedSelection) {
        editor.selection.restore(savedSelection);
      }

      if (view) {
        view.destroy();
      }

      return true;
    }
  });
}