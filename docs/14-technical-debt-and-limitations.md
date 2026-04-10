# 14 - بدهی فنی و محدودیت‌های معماری (Technical Debt & Architectural Limitations)

این سند با صراحت مهندسی، مرزهای توانمندی و محدودیت‌های ذاتی ادیتور Penman را در فاز فعلی توسعه (DOM-Based) مشخص می‌کند. این تصمیمات به صورت آگاهانه (Trade-offs) برای حفظ سادگی پروژه گرفته شده‌اند. در صورت عبور متریک‌های عملکردی از مرزهای تعیین شده (Quantitative Migration Triggers)، معماری باید فوراً به مدل تعلیق‌شده در `13-minimal-ir-architecture.md` مهاجرت کند.

## ۰. قراردادهای نقض‌نشدنی فعلی (Hard Invariants)
تا زمانی که روی معماری DOM-based هستیم، این قراردادها **هرگز** نباید نقض شوند. شکستن آن‌ها مساوی با Data Corruption است:
1. `Marker Leakage = 0`: متد `editor.getContent()` در **هیچ شرایطی** نباید تگ‌های مارکر Selection (مثلاً `<span id="penman-selection-marker...">`) را در خروجی HTML به کاربر یا دیتابیس برگرداند.
2. `Event Pipeline Neutrality`: رویدادهای کیبورد مانند `Ctrl+Z` باید در بالاترین سطح ممکن در DOM قطعی (Prevented) شوند. نشت یک Undo مرورگر، باعث خراب شدن کامل Snapshot Stack می‌شود.
3. `No Background Mutation`: هرگونه تغییر DOM از سوی توابع ادیتور فقط و فقط باید در داخل متد `CommandManager.execute()` یا در قالب یک Snapshot capture انجام شود.

## ۱. منبع حقیقت (Source of Truth)
**وضعیت فعلی:** مرورگر و `contenteditable` (DOM) منبع حقیقت هستند. خروجی `innerHTML` وضعیت نهایی است.
**ریسک (بدهی فنی):** نبود یک مدل داخلی مستقل (Internal Document Model / AST).
**متریک مهاجرت (Quantitative Trigger):**
- در صورت نیاز محصول به خروجی ساختاریافته غیر از HTML (مثلاً JSON Export برای اپلیکیشن موبایل Native).
- در صورت نیاز به **Collaborative Editing** (نیاز به محاسبه Operational Transformation که روی DOM رشته‌ای غیرممکن است).

## ۲. سیستم انتخاب (Selection System)
**وضعیت فعلی:** مبتنی بر نشانگرهای فیزیکی DOM (Marker-based Selection).
**ریسک (بدهی فنی):**
- شکنندگی در برابر Normalization و Paste (اگر تگ‌ها در هم ادغام شوند).
- مشکلات نگاشت با کاراکترهای چند بایتی (Grapheme Clusters) در UTF-16.
**متریک مهاجرت (Quantitative Trigger):**
- ثبت بیش از `5` خطای متوالی بازیابی Selection (`DOMException 8: NotFoundError`) در یک سشن کاربر در مانیتورینگ خطا.
- زمانی که فیچر "جداول تودرتو" (Nested Tables) یا "عناصر تعاملی غیرمتنی" (مانند فرمول‌های ریاضی پیچیده) به Roadmap اضافه شود (زیرا مارکرهای خطی در ساختارهای درختی عمیق پاسخگو نیستند).

## ۳. سیستم تاریخچه (History Engine)
**وضعیت فعلی:** مبتنی بر عکس‌برداری کامل رشته‌ای (Full DOM Snapshot HTML String) با گروه بندی مبتنی بر زمان (500ms Debounce).
**ریسک (بدهی فنی):**
- مصرف RAM با پیچیدگی `O(n * historyDepth)`.
- **گروه بندی غیرقطعی (Non-semantic Grouping):** تایمر هیچ درکی از پایان یک "کلمه" یا "جمله" ندارد. کاربر با Undo ممکن است وسط یک کلمه متوقف شود.
- **توضیح معماری:** راه حل این مشکل استفاده از `MutationObserver` نیست (چرا که آن فقط یک رویدادگر سطح پایینِ پر نویز است). راه‌حل واقعی مهاجرت به یک **Semantic Transaction Model** است که در آن هر عمل کاربر (مثل `InsertText` یا `ApplyFormat`) به صورت یک شیء مستقل (Action Object) ثبت و معکوس (Invert) شود.
**متریک مهاجرت (Quantitative Trigger):**
- عبور زمان اجرای `HistoryManager.pushImmediate()` از `16ms` (یک افت فریم در نمایشگر 60fps) روی دستگاه‌های میان‌رده.
- عبور میانگین حجم `editor.getContent()` از `500KB` (که کپی ۱۰۰ تایی آن حدود ۵۰ مگابایت رم اشغال می‌کند).

## ۴. تعامل با IME و موبایل
**وضعیت فعلی:** ایزوله‌سازی از طریق رویدادهای `keydown` و `beforeinput`.
**ریسک (بدهی فنی):**
- **IME State Drift:** رویدادهای `composition` (تایپ چند مرحله‌ای مثل زبان‌های CJK یا Autocorrect کیبورد موبایل) با تایمرهای ما همگام نیستند. این باعث می‌شود Snapshot در لحظه اشتباهی (وسط یک کامپوزیشن باز) گرفته شود که DOM آن ناپایدار است.
**متریک مهاجرت (Quantitative Trigger):**
- گزارش بیش از `%2` از کاربران موبایل مبنی بر پریدن نشانگر یا از بین رفتن کلمه در حال تایپ هنگام وقوع Autosave یا Undo.
- تغییر تمرکز مارکت محصول به بازارهای CJK (چین، ژاپن، کره) که نیازمند پشتیبانی ۱۰۰ درصدی از `compositionstart/end` و یک Transaction Model صریح برای مسدود کردن History در حین تایپ هستند.
