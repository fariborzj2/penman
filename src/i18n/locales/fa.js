export default {
  _dir: 'rtl',

  // Toolbar buttons and plugins
  plugins: {
    format: 'فرمت',
    image: {
      title: 'تصویر',
      insert: 'درج تصویر',
      urlTab: 'لینک مستقیم',
      uploadTab: 'آپلود',
      galleryTab: 'گالری',
      cancel: 'انصراف',
      upload: 'آپلود',
      uploadPlaceholder: 'تصاویر را اینجا رها کنید یا برای انتخاب کلیک کنید',
      insertSelected: 'درج انتخاب‌شده‌ها',
      clearQueue: 'پاک‌کردن صف',
      urlPlaceholder: 'https://...',
      altPlaceholder: 'متن جایگزین (اختیاری)',
      insertUrl: 'درج از لینک',
      galleryEmpty: 'تصویری در گالری یافت نشد.',
      galleryError: 'خطا در بارگذاری گالری: {error}'
    },
    blockType: {
      paragraph: 'پاراگراف',
      heading1: 'تیتر ۱',
      heading2: 'تیتر ۲',
      heading3: 'تیتر ۳',
      heading4: 'تیتر ۴',
      heading5: 'تیتر ۵',
      heading6: 'تیتر ۶',
      blockquote: 'نقل‌قول',
      pre: 'پیش‌فرمت'
    },
    media: {
      title: 'درج رسانه',
      directTab: 'لینک مستقیم',
      embedTab: 'کد جاسازی',
      directPlaceholder: 'لینک ویدیو یا صدا را وارد کنید (mp4, webm, mp3...)',
      embedPlaceholder: 'لینک را وارد کنید (آپارات، یوتیوب...)',
      insert: 'درج',
      cancel: 'انصراف',
      autoplay: 'پخش خودکار',
      controls: 'نمایش کنترل‌ها',
      posterPlaceholder: 'لینک تصویر پوستر (اختیاری)'
    },
    suggestedPosts: {
      title: 'پست‌های پیشنهادی',
      searchPlaceholder: 'جستجوی پست‌ها...',
      insert: 'درج انتخاب‌شده‌ها',
      cancel: 'انصراف',
      noResults: 'پستی یافت نشد.',
      loading: 'در حال بارگذاری...'
    },
    fontSize: {
      title: 'اندازه قلم'
    },
    sourceCode: {
      title: 'کد منبع',
      apply: 'اعمال تغییرات',
      cancel: 'انصراف'
    },
    direction: {
      rtl: 'راست‌چین (RTL)',
      ltr: 'چپ‌چین (LTR)',
      auto: 'جهت خودکار'
    },
    list: {
      bullet: 'لیست نشانه‌دار',
      numbered: 'لیست شماره‌دار'
    },
    hr: {
      title: 'درج خط افقی'
    },
    removeFormat: {
      title: 'پاک کردن فرمت'
    },
    findReplace: {
      title: 'جستجو و جایگزینی',
      find: 'جستجو',
      replace: 'جایگزینی',
      replaceAll: 'جایگزینی همه',
      next: 'بعدی',
      prev: 'قبلی',
      findPlaceholder: 'متن جستجو...',
      replacePlaceholder: 'جایگزینی با...',
      matchCase: 'حساس به حروف',
      noMatch: 'نتیجه‌ای یافت نشد.'
    },
    link: {
      insert: 'درج پیوند',
      unlink: 'حذف پیوند',
      urlPlaceholder: 'لینک (مثلا https://example.com)',
      textPlaceholder: 'متن نمایشی',
      openInNewTab: 'باز شدن در پنجره جدید',
      save: 'ذخیره',
      cancel: 'انصراف'
    },
    color: {
      textColor: 'رنگ متن',
      highlight: 'رنگ پس‌زمینه',
      clear: 'حذف رنگ'
    },
    table: {
      title: 'جدول',
      insertRowAbove: 'درج سطر در بالا',
      insertRowBelow: 'درج سطر در پایین',
      insertColLeft: 'درج ستون در چپ',
      insertColRight: 'درج ستون در راست',
      deleteRow: 'حذف سطر',
      deleteCol: 'حذف ستون',
      deleteTable: 'حذف جدول',
      cell: 'سلول',
      mergeCells: 'ادغام سلول‌ها',
      splitCell: 'تقسیم سلول',
      row: 'سطر',
      column: 'ستون',
      properties: 'تنظیمات جدول',
      selectTable: 'انتخاب جدول'
    }
  },

  // General commands / core
  core: {
    undo: 'بازگردانی',
    redo: 'انجام دوباره',
    bold: 'ضخیم',
    italic: 'کج',
    underline: 'زیرخط',
    strikethrough: 'خط‌خورده',
    justifyLeft: 'چپ‌چین',
    justifyCenter: 'وسط‌چین',
    justifyRight: 'راست‌چین',
    justifyFull: 'تراز کامل'
  },

  // UI Elements
  ui: {
    save: 'ذخیره',
    cancel: 'انصراف',
    close: 'بستن',
    insert: 'درج',
    delete: 'حذف',
    edit: 'ویرایش',
    ok: 'تایید'
  }
};
