export class EmbedModal {
  constructor(editor) {
    this.editor = editor;
    this.open();
  }

  open() {
    // Cache the selection before opening the modal
    if (this.editor.selection && typeof this.editor.selection.save === 'function') {
      this.editor.selection.save();
    }

    const i18n = this.editor.i18n;

    this.editor.ui.createFormModal({
      title: i18n.t('plugins.embed.title') || 'Insert Embed Code',
      width: '500px',
      submitText: i18n.t('ui.insert') || 'Insert',
      cancelText: i18n.t('ui.cancel') || 'Cancel',
      fields: [
        {
          type: 'textarea',
          name: 'code',
          label: i18n.t('plugins.embed.label') || 'Embed Code (HTML/Iframe)',
          placeholder: "<iframe src='...'></iframe>",
          rows: 6,
          dir: 'ltr',
          required: true,
          validate: (value) => {
            const code = (value || '').trim();
            if (!code) {
              return i18n.t('plugins.embed.emptyError') || 'Please enter embed code.';
            }
            const isEmbed = /<(iframe|embed|script|blockquote|video|audio)/i.test(code);
            if (!isEmbed) {
              return i18n.t('plugins.embed.invalidError')
                || 'Code must contain an embeddable HTML tag (like iframe, embed).';
            }
          }
        }
      ],
      onSubmit: (data) => {
        if (this.editor.selection && typeof this.editor.selection.restore === 'function') {
          this.editor.selection.restore();
        }
        this.editor.embed.insertNode(data.code.trim());
      },
      onCancel: () => {
        if (this.editor.selection && typeof this.editor.selection.restore === 'function') {
          this.editor.selection.restore();
        }
      }
    });
  }
}
