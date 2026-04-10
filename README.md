cat << 'EOF' > README.md
# Penman Editor

Penman یک ویرایشگر متن غنی (Rich Text Editor) سبک، قابل توسعه و بدون وابستگی به فریمورک است که مستقیماً در HTML ساده قابل استفاده است.

## هدف پروژه

ساخت یک ادیتور قابل اتکا برای محیط‌های وب که:
- بدون React / Vue / Angular کار کند
- فقط با یک فایل JS قابل استفاده باشد
- وابسته به هیچ کتابخانه خارجی نباشد
- قابل توسعه از طریق پلاگین باشد
- API ساده اما قدرتمند داشته باشد

## نمونه استفاده
``` html
<textarea name="fullstory" id="myTextarea"></textarea>

<script src="js/penman.js"></script>

<script>
penman.init({
  selector: '#myTextarea',
  height: 300,
  plugins: [
    'advlist', 'autolink', 'link', 'image', 'lists',
    'charmap', 'preview', 'anchor', 'pagebreak',
    'searchreplace', 'wordcount', 'visualblocks',
    'visualchars', 'code','source', 'fullscreen', 'insertdatetime',
    'media', 'table', 'emoticons', 'help'
  ],
  toolbar:
    'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | link image | print preview media fullscreen | ' +
    'forecolor backcolor emoticons | help',
  menubar: 'file edit view insert format tools table help',
  content_css: 'css/content.css'
});
</script>
```
## ویژگی‌ها

- هسته سبک و مستقل (بدون dependency)
- مبتنی بر contentEditable
- سیستم پلاگین
- toolbar قابل تنظیم
- sync با textarea

## معماری

- Core Engine
- Command System
- Selection Manager
- Plugin System
- History Stack
- Sanitization Layer

## محدودیت‌ها

- بدون collaboration
- بدون block editor
- فقط HTML editing
- execCommand فقط fallback

## فلسفه

کنترل کامل در دست توسعه‌دهنده، بدون پیچیدگی اضافی

## وضعیت

در مرحله طراحی و توسعه اولیه

## مجوز

در حال تعریف

## مشارکت

فعلاً بسته

EOF
