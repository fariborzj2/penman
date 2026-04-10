# 02 - معماری (Architecture)

معماری Penman Editor به گونه‌ای طراحی شده که اجزای مختلف به صورت ماژولار و مستقل اما در ارتباط با یکدیگر کار کنند.

## ساختار کلی (High-Level Architecture)
سیستم از چند زیرسیستم اصلی تشکیل شده است:

1. **Core Engine:** هسته اصلی که راه‌اندازی، مدیریت نمونه‌ها (Instances) و چرخه حیات (Lifecycle) ادیتور را کنترل می‌کند.
2. **UI & Toolbar Manager:** مسئول ایجاد و مدیریت رابط کاربری ادیتور، نوار ابزارها، دکمه‌ها و منوها.
3. **Command System:** سیستمی برای اجرای دستورات (مانند Bold، Italic) روی محتوا.
4. **Selection System:** مدیریت نشانگر (Caret) و بخش‌های انتخاب شده (Selection) توسط کاربر.
5. **Plugin System:** بارگذاری و مدیریت افزونه‌ها.
6. **History Stack:** سیستم لغو/بازانجام (Undo/Redo).
7. **Sanitization Layer:** لایه‌ای برای تمیز کردن و ایمن‌سازی HTML وارد شده یا تغییر یافته.

## جریان داده (Data Flow)
1. کاربر متنی را وارد می‌کند یا دکمه‌ای را در Toolbar می‌فشارد.
2. در صورت فشردن دکمه، Command مربوطه از طریق Command System فراخوانی می‌شود.
3. Command روی Selection فعلی اعمال می‌شود (اغلب از طریق API‌های DOM یا `execCommand` به عنوان Fallback).
4. تغییرات در History Stack ثبت می‌شود.
5. محتوای ویرایشگر بروز شده و با `<textarea>` اصلی همگام (Sync) می‌شود.

## مدل رویدادها (Event Model)
ادیتور از یک سیستم رویداد اختصاصی (Event Emitter) برای ارتباط بین ماژول‌ها استفاده می‌کند. مثلاً تغییر محتوا رویداد `change` را شلیک می‌کند که سیستم History و Sync به آن گوش می‌دهند.

## ساختار دایرکتوری‌ها (Directory Structure)
برای پیاده‌سازی ماژولار، کد منبع در پوشه `src` به این شکل سازماندهی می‌شود:
- `src/core/`: حاوی فایل‌های `Editor.js` و سیستم رویدادها (`EventEmitter.js`).
- `src/ui/`: اجزای رابط کاربری شامل Toolbar و قالب‌های HTML.
- `src/commands/`: دستورات ویرایشی (`bold.js`, `italic.js`, ...).
- `src/selection/`: مدیریت Caret و Selection.
- `src/plugins/`: افزونه‌های مستقل سیستم.
- `src/history/`: سیستم Undo و Redo.
- `src/sanitization/`: تمیزکننده HTML.
- `src/utils/`: توابع کمکی.
