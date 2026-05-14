// src/plugins/HelpPlugin/lang/fa.js
// Persian strings for HelpPlugin. Registered under namespace "plugins.help".
export default {
  title: 'راهنما و میان‌بُرها',
  buttonLabel: 'راهنما',

  sections: {
    shortcuts: 'میان‌بُرهای صفحه‌کلید',
    markdown:  'میان‌بُرهای Markdown',
    tips:      'نکات',
    about:     'درباره'
  },

  columns: {
    keys:        'کلیدها',
    action:      'عملکرد',
    type:        'نوع',
    description: 'توضیحات'
  },

  shortcuts: {
    bold:        'ضخیم',
    italic:      'مورب',
    underline:   'زیرخط‌دار',
    undo:        'بازگردانی',
    redo:        'انجام دوباره',
    findReplace: 'جستجو و جایگزینی',
    sourceCode:  'نمایش/پنهان‌سازی کد منبع',
    breakout:    'خروج از بلوک فعلی (تیتر / نقل‌قول و غیره)',
    indentList:  'تورفتگی آیتم لیست',
    outdentList: 'برون‌رفتگی آیتم لیست',
    openHelp:    'باز کردن این راهنما'
  },

  markdown: {
    h1:      'تیتر سطح ۱',
    h2:      'تیتر سطح ۲',
    h3:      'تیتر سطح ۳',
    bullet:  'لیست نشانه‌دار',
    ordered: 'لیست عددی',
    quote:   'نقل‌قول',
    code:    'کد درون‌متنی',
    bold:    'ضخیم',
    italic:  'مورب',
    hr:      'خط افقی'
  },

  tips: {
    images:     'برای افزودن تصویر از دکمه‌ی تصویر استفاده کنید: از URL، آپلود، یا گالری.',
    links:      'متن را انتخاب کنید، سپس روی دکمه‌ی پیوند کلیک کنید (یا Ctrl/Cmd+K) تا لینک درج شود.',
    tables:     'برای درج جدول از منوی کشویی جدول استفاده کنید؛ با راست‌کلیک روی سلول‌ها می‌توانید ادغام، تقسیم یا تغییر مشخصات بدهید.',
    direction:  'جهت سند (RTL/LTR) را از تولبار تغییر دهید — برای نوشتن دوزبانه مفید است.',
    paste:      'متن ساده یا HTML را مستقیماً paste کنید — ادیتور به‌طور خودکار محتوای ناامن را پاک‌سازی می‌کند.',
    autosave:   'اگر پلاگین Draft فعال باشد، کار شما به‌طور مداوم ذخیره می‌شود تا بعداً بتوانید ادامه دهید.',
    fullscreen: 'از نمای کد منبع برای ویرایش HTML خام و کنترل دقیق‌تر استفاده کنید.'
  },

  about: {
    name:        'ادیتور Penman',
    description: 'یک ویرایشگر متن غنی مستقل از فریم‌ورک و بدون وابستگی.',
    version:     'نسخه',
    license:     'مجوز'
  }
};
