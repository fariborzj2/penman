# 06 - سیستم افزونه‌ها (Plugin System)

قدرت اصلی Penman در توسعه‌پذیری آن است. ویژگی‌هایی که برای همه کاربران ضروری نیستند (مانند درج جدول، مدیریت کد، ایموجی‌ها) به عنوان پلاگین پیاده‌سازی می‌شوند.

## نحوه کار پلاگین‌ها
پلاگین‌ها توابعی هستند که در زمان مقداردهی اولیه (Initialization) ادیتور فراخوانی می‌شوند. یک پلاگین دسترسی کاملی به `editor instance` دارد و می‌تواند:
- دکمه‌های جدیدی به Toolbar اضافه کند (`editor.ui.registry.addButton`).
- منوها یا دیالوگ‌ها ایجاد کند (از طریق `editor.ui.createModal`).
- محتوای جدید در ادیتور درج کند (`editor.insertContent`).
- دستورات (Commands) جدیدی ثبت کند.
- به رویدادهای ادیتور (مانند `onKeyDown`, `onChange`) گوش دهد و رفتار را تغییر دهد.

## ساختار یک پلاگین
```javascript
penman.PluginManager.add('myPlugin', function(editor, url) {
    // 1. اضافه کردن دکمه به Toolbar
    editor.ui.registry.addButton('myButton', {
        text: 'My Plugin',
        onAction: function () {
            // 2. انجام عملیات
            editor.insertContent('<strong>سلام دنیا!</strong>');
        }
    });

    // 3. (اختیاری) برگرداندن متادیتا
    return {
        getMetadata: function () {
            return  { name: "My Plugin" };
        }
    };
});
```

## بارگذاری پلاگین‌ها
توسعه‌دهنده نام پلاگین‌ها را در تنظیمات به صورت آرایه یا رشته پاس می‌دهد:
```javascript
penman.init({
    plugins: 'link image table' // یا ['link', 'image', 'table']
})
```
سیستم پلاگین‌ها را پیدا کرده و با پاس دادن نمونه ادیتور (`editor instance`) آنها را اجرا می‌کند.
