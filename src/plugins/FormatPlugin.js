export function setupFormatPlugin(editor) {
  const formats = ['bold', 'italic', 'underline'];

  formats.forEach(format => {
    editor.ui.registry.addButton(format, {
      text: format.charAt(0).toUpperCase() + format.slice(1),
      onAction: function() {
        editor.execCommand(format);
      }
    });
  });
}
