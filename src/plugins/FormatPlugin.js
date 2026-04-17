export function setupFormatPlugin(editor) {
  const formats = ['bold', 'italic', 'underline', 'strikethrough'];

  const tags = {
    bold: 'strong',
    italic: 'em',
    underline: 'u',
    strikethrough: 's'
  };

  formats.forEach(format => {
    // Only register queryState to handle state reflection in the UI,
    // execution will fallback to native document.execCommand in CommandManager
    // since it natively handles complex overlapping ranges perfectly.
    editor.commands.register(format, {
      queryState: (ed) => {
        return document.queryCommandState(format);
      }
    });

    editor.ui.registry.addButton(format, {
      text: format.charAt(0).toUpperCase() + format.slice(1),
      onAction: function() {
        // This will fall back to document.execCommand because the command lacks an 'execute' method,
        // and is listed in the CommandManager's fallbackWhitelist.
        editor.commands.execute(format);
      }
    });
  });
}
