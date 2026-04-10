# 03 - هسته اصلی (Core Engine)

هسته اصلی (`Core Engine`) قلب تپنده ادیتور Penman است. این بخش وظیفه هماهنگی بین تمام ماژول‌ها را بر عهده دارد.

## وظایف اصلی
1. **مقداردهی اولیه (Initialization):**
   - خواندن تنظیمات (Config) پاس داده شده (شامل تنظیمات زبان `lang` و جهت متن `direction`).
   - پیدا کردن `<textarea>` هدف در DOM.
   - اعمال تنظیمات زبان و جهت متن بر روی ساختار ادیتور (مثلاً تنظیم ویژگی `dir`).
   - پنهان کردن `<textarea>` و ایجاد ساختار DOM ادیتور (Wrapper, Toolbar, Editor Area).
2. **مدیریت نمونه‌ها (Instance Management):**
   - نگهداری لیستی از تمام ادیتورهای فعال در صفحه.
   - ارائه API برای دسترسی به یک نمونه خاص (مثلاً `penman.get('myTextarea')`).
3. **همگام‌سازی (Synchronization):**
   - انتقال محتوای اولیه از textarea به محیط ویرایشگر.
   - بروزرسانی مداوم مقدار textarea هر زمان که محتوای ویرایشگر تغییر می‌کند (`onInput` یا رویدادهای مشابه).
4. **چرخه حیات (Lifecycle):**
   - مدیریت فرآیندهای راه‌اندازی (Setup) و تخریب (Destroy) ادیتور.

## ساختار DOM ویرایشگر
هنگام مقداردهی اولیه، هسته ساختاری مشابه زیر ایجاد می‌کند:
```html
<div class="penman-wrapper">
   <div class="penman-toolbar">...</div>
   <div class="penman-editor-area" contenteditable="true">
      <!-- محتوای ویرایشگر -->
   </div>
   <div class="penman-statusbar">...</div>
</div>
<!-- textarea اصلی مخفی می‌شود -->
<textarea id="myTextarea" style="display: none;"></textarea>
```

## کلاس `Editor`
کلاس اصلی ادیتور است که متدهای عمومی مانند `getContent()`, `setContent(html)`, `focus()`, `destroy()` را در اختیار توسعه‌دهنده قرار می‌دهد.
