export default {
  _dir: 'ltr',

  // Toolbar buttons and plugins
  plugins: {
    format: 'Format',
    image: {
      title: 'Image',
      insert: 'Insert Image',
      urlTab: 'Direct URL',
      uploadTab: 'Upload',
      galleryTab: 'Gallery',
      cancel: 'Cancel',
      upload: 'Upload',
      uploadPlaceholder: 'Drop images here or click to select',
      insertSelected: 'Insert Selected',
      clearQueue: 'Clear Queue',
      urlLabel: 'Image URL',
      altLabel: 'Alternative Text (Optional)',
      urlPlaceholder: 'https://...',
      altPlaceholder: 'Alternative text (optional)',
      insertUrl: 'Insert from URL',
      galleryEmpty: 'No images found in gallery.',
      galleryError: 'Error loading gallery: {error}'
    },
    blockType: {
      paragraph: 'Paragraph',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      heading4: 'Heading 4',
      heading5: 'Heading 5',
      heading6: 'Heading 6',
      blockquote: 'Blockquote',
      pre: 'Preformatted'
    },
    media: {
      title: 'Insert Media',
      directTab: 'Direct Link',
      embedTab: 'Embed Code',
      directPlaceholder: 'Enter video/audio URL (mp4, webm, mp3...)',
      embedPlaceholder: 'Enter URL (YouTube, Vimeo...)',
      insert: 'Insert',
      cancel: 'Cancel',
      autoplay: 'Autoplay',
      controls: 'Controls',
      posterPlaceholder: 'Poster image URL (optional)',
      editTitle: 'Edit Media',
      insertTitle: 'Insert Media',
      invalidUrlPreview: 'Enter a valid URL to preview',
      invalidEmbedUrl: 'Invalid or unsupported URL',
      invalidEmbedUrlMsg: 'This URL is not supported by any active embed provider.',
      domainNotWhitelisted: 'Domain not whitelisted',
      domainNotWhitelistedMsg: 'This URL domain is not whitelisted for custom embeds.',
      embedTitlePlaceholder: 'Media title for iframe',
      mediaTitlePlaceholder: 'Media title',
      invalidDirectUrl: 'Invalid direct file URL',
      invalidDirectUrlMsg: 'The URL does not point to a supported audio/video format.'
    ,
      directUrlLabel: 'Direct File URL (.mp4, .mp3, etc)',
      titleOptionalLabel: 'Title (Optional)',
      posterOptionalLabel: 'Poster Image URL (Optional)',
      embedUrlLabel: 'Video/Audio Embed URL'
    },
    draft: {
      recoveryBannerMsg: 'A newer unsaved version of this document was found.',
      lastAutoSaved: 'Last auto-saved: ',
      restoreDraft: 'Restore draft',
      discard: 'Discard',
      draftRestored: 'Draft restored.',
      draftDiscarded: 'Draft discarded.',
      saving: 'Saving...',
      draftSaved: 'Draft saved.',
    },
    suggestedPosts: {
      titlePlaceholder: 'Enter Suggested Post Title',
      postsAdded: 'Post(s) added',
      fillBothFields: 'Please fill in both fields.',
      invalidUrl: 'The entered URL is invalid.',
      addLink: 'Add link',
      saveChanges: 'Save changes',
      minOnePost: 'Please add at least one post.',
      title: 'Suggested posts',
      lable: 'Post Title',
      searchPlaceholder: 'Search posts...',
      insert: 'Insert Selected',
      cancel: 'Cancel',
      noResults: 'No posts found.',
      loading: 'Loading...'
    },
    fontSize: {
      title: 'Size'
    },
    sourceCode: {
      title: 'Source Code',
      apply: 'Apply Changes',
      cancel: 'Cancel'
    ,
      searchPlaceholder: 'Search...'
    },
    direction: {
      rtl: 'RTL',
      ltr: 'LTR',
      auto: 'Dir Auto'
    },
    list: {
      bullet: 'Bullet List',
      numbered: 'Numbered List'
    },
    hr: {
      title: 'Insert Horizontal Rule'
    },
    removeFormat: {
      title: 'Clear Formatting'
    },
    findReplace: {
      title: 'Find and Replace',
      find: 'Find',
      replace: 'Replace',
      replaceAll: 'Replace all',
      next: 'Next',
      prev: 'Previous',
      findPlaceholder: 'Find text...',
      replacePlaceholder: 'Replace with...',
      matchCase: 'Match case',
      noMatch: 'No matches found.'
    },
    link: {
      insert: 'Insert Link',
      unlink: 'Unlink',
      lable: 'Link Post',
      urlPlaceholder: 'https://example.com',
      textPlaceholder: 'Text to display',
      openInNewTab: 'Open in new tab',
      save: 'Save',
      cancel: 'Cancel'
    ,
      relPlaceholder: 'e.g. nofollow'
    ,
      urlLabel: 'URL',
      relLabel: 'Rel'
    },
    color: {
      textColor: 'Text Color',
      highlight: 'Highlight',
      clear: 'Clear Color'
    },
    table: {
      title: 'Table',
      insertRowAbove: 'Insert Row Above',
      insertRowBelow: 'Insert Row Below',
      insertColLeft: 'Insert Column Left',
      insertColRight: 'Insert Column Right',
      deleteRow: 'Delete Row',
      deleteCol: 'Delete Column',
      deleteTable: 'Delete Table',
      cell: 'Cell',
      mergeCells: 'Merge cells',
      splitCell: 'Split cell',
      row: 'Row',
      column: 'Column',
      properties: 'Table properties',
      selectTable: 'Select table',
      widthPlaceholder: 'e.g. 100% or 500px',
      borderPlaceholder: 'e.g. 1 or 0',
      borderColorPlaceholder: 'e.g. #000 or red',
      cellPaddingPlaceholder: 'e.g. 5',
      cellSpacingPlaceholder: 'e.g. 0'
    ,
      widthLabel: 'Width:',
      borderLabel: 'Border:',
      borderColorLabel: 'Border Color:',
      cellPaddingLabel: 'Cell Padding:',
      cellSpacingLabel: 'Cell Spacing:',
      directionLabel: 'Direction:'
    ,
      defaultDir: 'Default',
      ltr: 'LTR',
      rtl: 'RTL'
    }
  },

  // General commands / core
  core: {
    undo: 'Undo',
    redo: 'Redo',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strikethrough: 'Strikethrough',
    justifyLeft: 'Align Left',
    justifyCenter: 'Align Center',
    justifyRight: 'Align Right',
    justifyFull: 'Justify'
  },

  // UI Elements
  ui: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    insert: 'Insert',
    delete: 'Delete',
    edit: 'Edit',
    ok: 'OK',
    dialog: 'Dialog'
  }
};
