# 10 - نقشه راه (Roadmap)

این سند مراحل توسعه ادیتور Penman را مشخص می‌کند.

## مایلستون 1: پی‌ریزی (Foundation) - [وضعیت: کامل]
- [x] راه‌اندازی ساختار پروژه و بیلد سیستم (Vite/Rollup).
- [x] پیاده‌سازی Core Engine و مدیریت چرخه حیات.
- [x] پیاده‌سازی همگام‌سازی پایه با `<textarea>`.
- [x] طراحی و پیاده‌سازی معماری Event Emitter.

## مایلستون 2: هسته ویرایش (Editing Core) - [وضعیت: کامل]
- [x] پیاده‌سازی Selection System پایه.
- [x] پیاده‌سازی سیستم Undo/Redo با قابلیت Throttling.
- [x] پیاده‌سازی Command System (ترکیبی: Custom Commands + execCommand Fallback برای لیست‌ها و فرمت‌های پایه).

## مایلستون 3: رابط کاربری (UI & Toolbar) - [وضعیت: کامل]
- [x] ایجاد سیستم رندر Toolbar.
- [x] طراحی و پیاده‌سازی آیکون‌های SVG inline.
- [x] پیاده‌سازی به‌روزرسانی وضعیت دکمه‌ها (Active state) بر اساس مکان نشانگر.

## مایلستون 4: پلاگین‌های پایه (Basic Plugins) - [وضعیت: کامل]
- [x] پلاگین فرمت‌های پایه (Bold, Italic, Underline, Strikethrough).
- [x] پلاگین ایجاد لیست (UL, OL).
- [x] پلاگین درج لینک با دیالوگ و ذخیره Selection.
- [x] پلاگین Unlink.
- [x] پلاگین Remove Format.
- [x] پلاگین Horizontal Rule.
- [x] پلاگین Font Size (dropdown با span inline).
- [x] پلاگین Block Type (dropdown با پشتیبانی از custom class).
- [x] پلاگین Find & Replace (با پشتیبانی RTL و Diacritics).

## مایلستون 5: پیشرفته، امنیت و پلاگین‌های ساختاری - [وضعیت: کامل]
- [x] پیاده‌سازی ماژول Sanitization برای جلوگیری از XSS.
- [x] مدیریت رویداد Paste و تمیز کردن محتوای وارد شده.
- [x] پلاگین Table با Merge/Split، Row/Column management، Properties modal.
- [x] پلاگین Image با URL insert، Upload pipeline، Gallery، Alignment.
- [x] ColorPicker مستقل برای استفاده در Table و سایر پلاگین‌ها.

**یادداشت معماری:** جایگزینی کامل `execCommand` با دستکاری DOM اختصاصی به عنوان
یک بدهی فنی آگاهانه ثبت شده است. این تصمیم در `docs/14-technical-debt-and-limitations.md`
با Quantitative Migration Triggers مشخص مستند شده. تا زمانی که متریک‌های مهاجرت
(مثل میانگین حجم محتوا > 500KB) فراخوانده نشوند، وضعیت فعلی پایدار است.

## مایلستون 6: رابط کاربری و استایل‌ها (UI & Style) - [وضعیت: کامل]
- [x] پیاده‌سازی کامپوننت Base Dropdown.
- [x] پیاده‌سازی Floating UI برای Table و Image.
- [x] پیاده‌سازی پلاگین انتخاب نوع بلوک (Block Type Selector) با custom class و optionStyle.
- [x] بهبود استایل‌های عمومی ادیتور (TinyMCE-like design).

## مایلستون 7: تست و مستندسازی - [وضعیت: نیمه‌کاره → در حال تکمیل]
- [x] نوشتن تست‌های Unit برای تمام ماژول‌های اصلی.
- [x] زیرساخت E2E با Playwright (verify_ui.py + test-e2e.mjs).
- [x] پوشش E2E برای: Format, List, Link, Table, Image (URL), Find&Replace.
- [x] ادغام سرور backend در چرخه E2E (حذف Mock شبکه).
- [x] تست E2E برای FontSize, Unlink, RemoveFormat, HorizontalRule, BlockType.
- [x] تست E2E برای ColorPicker در Table.
- [x] تست E2E برای Image Upload با سرور واقعی (graceful skip اگر سرور غیرفعال).
- [x] تست E2E برای Image Gallery load.
- [ ] مستندات کامل API برای توسعه‌دهندگان خارجی (برای نسخه 1.0).
- [ ] انتشار نسخه 1.0 (تثبیت API Public).

## وضعیت بدهی‌های فنی ثبت‌شده

| بدهی | وضعیت | Migration Trigger |
|------|--------|-------------------|
| جایگزینی کامل execCommand | ثبت‌شده — بدون اقدام فعلی | حجم محتوا > 500KB یا Collaborative editing |
| IME/Mobile drift | ثبت‌شده — بدون اقدام فعلی | گزارش > 2% کاربران موبایل |
| History Semantic Grouping | ثبت‌شده — بدون اقدام فعلی | pushImmediate > 16ms در mid-range |
| IR Architecture | Frozen — برای آینده | JSON Export یا Collaborative |

مرجع کامل: `docs/14-technical-debt-and-limitations.md`
