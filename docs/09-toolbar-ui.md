# 09 - نوار ابزار و رابط کاربری (Toolbar & UI)

سیستم UI در Penman مسئول رندر کردن نوار ابزار (Toolbar)، دکمه‌ها، منوهای بازشو (Dropdowns) و دیالوگ‌ها است.

## پیکربندی Toolbar
توسعه‌دهنده می‌تواند ترکیب Toolbar را از طریق رشته‌ای از نام دکمه‌ها در هنگام `init` مشخص کند:
```javascript
toolbar: 'undo redo | bold italic | link image | alignleft aligncenter'
```
- علامت `|` نشان‌دهنده جداکننده (Separator) است.
- سیستم UI این رشته را پارس کرده و دکمه‌های مربوطه را از `UI Registry` پیدا کرده و رندر می‌کند.

## وضعیت دکمه‌ها (Active State)
هنگامی که کاربر روی متنی کلیک می‌کند، سیستم Selection مکان Caret را به سیستم UI گزارش می‌دهد. UI چک می‌کند که آیا نشانگر داخل یک تگ خاص (مثلاً `<b>`) قرار دارد یا خیر، و اگر قرار داشت، دکمه مربوطه (Bold) را در حالت Active (روشن) نمایش می‌دهد.

## آیکون‌ها
برای سبک ماندن ادیتور، به جای استفاده از فونت آیکون‌های سنگین، Penman از آیکون‌های SVG داخلی (Inline SVG) برای دکمه‌ها استفاده می‌کند. این آیکون‌ها در یک فایل مجزا تعریف شده و سیستم UI آن‌ها را در دکمه‌ها تزریق می‌کند.

### Icon System (Abstraction)

- Toolbar buttons MUST NOT depend on a specific icon set
- Each button references an `iconName`
- Icon rendering is delegated to an external IconProvider
- Actual SVG implementation is out of current phase scope

## سیستم مدال‌ها (Modal System)
برای جلوگیری از استفاده از دیالوگ‌های بومی مرورگر (مانند `prompt`) و ارائه یک رابط کاربری یکپارچه، Penman یک سیستم Modal داخلی ارائه می‌دهد که افزونه‌ها می‌توانند از آن برای دریافت اطلاعات از کاربر استفاده کنند.

مدال از طریق `editor.ui.createModal(options)` ساخته می‌شود. توجه داشته باشید که قبل از باز کردن مدال، معمولاً باید وضعیت Selection ذخیره شود و در هنگام سابمیت بازیابی گردد تا مکان نشانگر در ادیتور از دست نرود.

**نمونه استفاده در پلاگین:**
```javascript
editor.ui.createModal({
  title: 'Insert Link',
  body: `
    <div>
      <label for="url">URL</label>
      <input type="url" id="url" name="url" placeholder="https://example.com" required>
    </div>
  `,
  submitText: 'Insert',
  cancelText: 'Cancel',
  onSubmit: (data) => {
    // داده‌های فرم به صورت آبجکت برگردانده می‌شوند (مانند data.url)
    if (data.url) {
      editor.insertContent(\`<a href="\${data.url}">Link</a>\`);
    }
  }
});
```

## تم‌ها و استایل‌ها
استایل‌های ادیتور بر پایه CSS نوشته شده‌اند. کلاس‌های CSS دارای پیشوند `penman-` هستند (مانند `penman-btn`, `penman-toolbar`, `penman-modal`) تا با استایل‌های سایت تداخلی نداشته باشند.
توسعه‌دهندگان می‌توانند با Overwrite کردن متغیرهای CSS (CSS Variables) ظاهر ادیتور را شخصی‌سازی کنند.
