# 20 - مستندات عمومی API (Public API Documentation)

این مستند نحوه تعامل توسعه‌دهندگان خارجی با Penman Editor را شرح می‌دهد. این رابط کاربری نهایی نسخه 1.0 است.

## نمونه پیاده‌سازی و راه‌اندازی (Initialization)

```javascript
import penman from 'penman-editor';

const editor = penman.init({
  selector: '#my-textarea',
  toolbar: 'bold italic underline strikethrough | format_block_type fontsize | alignleft aligncenter alignright justify | insertUnorderedList insertOrderedList | link unlink image table hr | findreplace removeformat | undo redo',
  plugins: ['format', 'list', 'link', 'image', 'table', 'horizontalrule', 'fontsize', 'blocktype', 'findreplace', 'removeformat'],
  blockTypes: [
    { name: 'Paragraph', cmd: 'p' },
    { name: 'Heading 1', cmd: 'h1' },
    { name: 'Heading 2', cmd: 'h2' },
    { name: 'Heading 3', cmd: 'h3' },
    { name: 'Blockquote', cmd: 'blockquote' },
    { name: 'Warning Box', cmd: 'div', class: 'warning-block', optionStyle: { color: 'red' } }
  ],
  imageUploadFn: async (file, onProgress) => {
    // منطق آپلود خود را اینجا قرار دهید
    // می‌توانید از onProgress(loaded, total) برای اطلاع از میزان پیشرفت استفاده کنید
    return { url: 'https://example.com/uploaded.png', alt: file.name };
  }
});
```

## متدهای اصلی کلاس `Editor`

### `getContent(): string`
محتوای HTML جاری درون ادیتور را به عنوان رشته برمی‌گرداند.

### `setContent(html: string): void`
محتوای ادیتور را با رشته HTML داده شده جایگزین می‌کند.

### `focus(): void`
فوکوس را به ناحیه قابل ویرایش (Editable Area) ادیتور منتقل می‌کند.

### `destroy(): void`
ادیتور را از DOM حذف کرده، تمامی Event Listenerها را پاک می‌کند و `<textarea>` اصلی را مجدداً نمایش می‌دهد.

### `execCommand(cmd: string, value: any = null): void`
یک فرمان رجیستر شده را اجرا می‌کند. مثال:
```javascript
editor.execCommand('bold');
editor.execCommand('SET_BLOCK_TYPE', { cmd: 'h1', name: 'Heading 1' });
```

### `on(event: string, callback: Function): void`
برای گوش دادن به رویدادهای سیستم استفاده می‌شود.

### `off(event: string, callback: Function): void`
یک Event Listener را حذف می‌کند.

### `emit(event: string, ...args: any[]): void`
یک رویداد را به صورت دستی در سیستم Emit می‌کند.

## رویدادها (Events)

- `change`: زمانی که محتوای ادیتور تغییر کند.
- `selectionChange`: زمانی که موقعیت مکان‌نما (Cursor) تغییر کند.
- `focus`: هنگام دریافت فوکوس.
- `blur`: هنگام از دست دادن فوکوس.

## سیستم افزونه (Plugin System)
افزونه‌ها با دریافت `editor` و تنظیم متدها و کامپوننت‌های UI در رجیستری، قابلیت‌ها را اضافه می‌کنند. توسعه‌دهندگان می‌توانند با دستور `editor.commands.register()` فرمان‌های جدید خود را ثبت کنند.

برای مشاهده مشخصات داخلی افزونه‌ها، به مستندات مرتبط در دایرکتوری `docs/` مراجعه کنید.
