# روند پیشرفت پروژه (Project Progress)

> **توجه مهم:** این فایل تنها منبع رسمی برای پیگیری پیشرفت کل پروژه است. هیچ تغییری معتبر نیست مگر اینکه در این فایل ثبت شده باشد. تمام تغییرات باید قابل ردیابی و مرحله‌ای باشند. توسعه صرفاً بر اساس ۷ فاز ثابت SDLC پیش می‌رود.

## درصد پیشرفت کلی پروژه: 88%

---

## تفکیک پیشرفت بر اساس فازها

### فاز 1: تعریف معماری (Architecture Definition)
- **وضعیت:** کامل (Completed)
- **درصد پیشرفت:** 100%
- **توضیحات:** معماری بر پایه DOM نهایی شد. لایه IR طراحی و در وضعیت Frozen به عنوان مسیر آینده نگهداری شد.

### فاز 2: طراحی (Design Specification)
- **وضعیت:** کامل (Completed)
- **درصد پیشرفت:** 100%
- **توضیحات:** طراحی کلاس‌های مورد نیاز از جمله Selection, History و CommandManager تکمیل شد. مستندات با کدها همگام شد.

### فاز 3: برنامه‌ریزی پیاده‌سازی (Implementation Plan)
- **وضعیت:** کامل (Completed)
- **درصد پیشرفت:** 100%
- **توضیحات:** برنامه‌ریزی خرد برای اتصال اجزا انجام و تدوین شد.

### فاز 4: پیاده‌سازی (Implementation)
- **وضعیت:** کامل (Completed) — پس از اعمال اصلاحات
- **درصد پیشرفت:** 100%
- **توضیحات:** ماژول‌ها به صورت End-to-End به هم متصل شدند.
- **بخش ثبت تغییرات (Change Log):**
  - **[2026-04-10T19:14:10Z]**: حذف تمام مقادیر Mock و Placeholder در سیستم UI.
  - **[2026-04-18T00:00:00Z]**: اصلاح ۸ نقص اجرایی شناسایی‌شده:
    1. حذف متدهای تکراری در `TableTransaction.js` (setTableProperty، addRow، deleteTable، removeColumn هر کدام دو بار تعریف شده بودند)
    2. رفع race condition در `alignmentSync.js` — snapshot اکنون همزمان با DOM mutation گرفته می‌شود نه با setTimeout
    3. جایگزینی `editor.history.takeSnapshot()` غیرموجود با `editor.history.pushImmediate()` در `FindReplacePlugin.js`
    4. اضافه کردن `history.pushImmediate()` به `SET_CELL_PROPERTY` در `TablePlugin.js` — تغییر رنگ پس‌زمینه سلول اکنون Undoable است
    5. رفع Trust Immutability در gallery click handler — از `item.trustLevel` منبع استفاده می‌شود
    6. به‌روزرسانی `docs/BlockTypePlugin/README.md` — حذف ادعای نادرست "Does NOT apply CSS classes"
    7. به‌روزرسانی `docs/17-table-plugin-spec.md` — هماهنگی با رفتار واقعی physical removal در mergeCells
    8. به‌روزرسانی `PROGRESS.md` — درصد واقعی

### فاز 5: تست (Testing)
- **وضعیت:** نیمه‌کاره (In Progress)
- **درصد پیشرفت:** 70%
- **توضیحات:** پوشش تست‌های واحد برای اکثر پلاگین‌ها کامل است. E2E tests در `verify_ui.py` موجود است اما ناقص.
- **نقص‌های باقی‌مانده:**
  - تست E2E برای table merge/split/row/column وجود ندارد
  - تست E2E برای image upload pipeline وجود ندارد
  - تست E2E برای image alignment وجود ندارد
  - `FindReplacePlugin.test.js` از window.getSelection mock استفاده می‌کند
- **بخش ثبت تغییرات (Change Log):**
  - **[2026-04-11T06:12:00Z]**: اسکریپت E2E واقعی ساخته شد.
  - **[2026-04-18T00:00:00Z]**: شناسایی و مستندسازی گپ‌های E2E باقی‌مانده.

### فاز 6: رابط کاربری و استایل‌ها (UI & Style)
- **وضعیت:** کامل (Completed)
- **درصد پیشرفت:** 100%
- **توضیحات:** طراحی کامپوننت پایه Dropdown، بهبود استایل‌های عمومی، پیاده‌سازی BlockType و ColorPicker.
- **بخش ثبت تغییرات (Change Log):**
  - **[2026-04-18T00:00:00Z]**: اصلاح مستندات BlockTypePlugin README.

### فاز 7: مستندسازی و تثبیت (Documentation & Stabilization)
- **وضعیت:** نیمه‌کاره (In Progress)
- **درصد پیشرفت:** 80%
- **نقص‌های باقی‌مانده:**
  - [ ] گسترش E2E tests برای table operations
  - [ ] گسترش E2E tests برای image upload/alignment
  - [ ] بررسی و به‌روزرسانی سایر مستندات احتمالاً منسوخ
- **بخش ثبت تغییرات (Change Log):**
  - **[2026-04-18T00:00:00Z]**: اصلاح مستندات `BlockTypePlugin/README.md` و `17-table-plugin-spec.md`. به‌روزرسانی PROGRESS.md با وضعیت واقعی.
