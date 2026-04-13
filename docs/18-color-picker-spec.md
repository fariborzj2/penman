# 18 - ماژول انتخاب رنگ (Color Picker Spec)

در معماری Penman Editor، استفاده از `<input type="color">` بومی مرورگرها ممنوع است زیرا فاقد انعطاف‌پذیری، ظاهر یکپارچه و API برنامه‌نویسی است. به همین منظور، یک کامپوننت مستقل و قابل استفاده مجدد به نام \`ColorPicker\` طراحی شده است.

## ۱. قوانین معماری (Strict Rules)

1. **استفاده اجباری:** هر پلاگینی که نیاز به انتخاب رنگ دارد (مثل Text Color, Highlight Color, Background Color, Border Color) **باید** فقط از این کامپوننت استفاده کند.
2. **ممنوعیت پیاده‌سازی مجدد:** هیچ پلاگینی حق ندارد منطق رنگ، پالت رنگ یا ورودی Hex اختصاصی خودش را پیاده‌سازی کند.
3. **مستقل بودن (Standalone):** این کامپوننت هیچ وابستگی به Core ادیتور ندارد و فقط یک کامپوننت UI است که DOM Element تولید می‌کند.

## ۲. مشخصات ظاهری (UI Specifications)

کامپوننت \`ColorPicker\` شامل دو بخش اصلی است:
1. **ورودی Hex (Hex Input):** یک فیلد متنی که اجازه تایپ مستقیم کدهای HEX (مثل \`#FF0000\`) را می‌دهد.
2. **پالت رنگ (Color Palette):** یک شبکه (Grid) شامل رنگ‌های استاندارد و از پیش‌تعریف‌شده.

### ویژگی رنگ شفاف (Transparent)
اولین گزینه در پالت رنگ، نمایانگر رنگ \`transparent\` است که با یک پس‌زمینه شطرنجی (Checkerboard) و خط مورب قرمز (Strike-through) مشخص می‌شود. کاربر همچنین می‌تواند کلمه \`transparent\` را در فیلد Hex تایپ کند.

## ۳. رابط برنامه‌نویسی (API)

### کلاس \`ColorPicker\`
مسیر: \`src/ui/ColorPicker.js\`

#### نمونه‌سازی (Instantiation)
\`\`\`javascript
import { ColorPicker } from '../ui/ColorPicker.js';

const picker = new ColorPicker({
    defaultColor: '#ffffff', // رنگ پیش‌فرض
    onChange: (color, isFinal) => {
        // color: مقدار رنگ (مثل '#ff0000' یا 'transparent')
        // isFinal: بولین. اگر true باشد یعنی کاربر انتخاب خود را نهایی کرده است (کلیک روی پالت یا فشردن Enter).
        // اگر false باشد یعنی کاربر هنوز در حال تایپ داخل فیلد متنی است.

        console.log('Color selected:', color, 'Final:', isFinal);
    }
});
\`\`\`

#### متدها (Methods)

- \`getElement()\`: برگرداندن DOM Element اصلی برای قرار دادن در UI (مثلاً درون Dropdown یا Floating UI).
- \`getColor()\`: دریافت رنگ فعلی.
- \`setColor(hex, triggerChange = false, final = true)\`: تنظیم رنگ به‌صورت برنامه‌نویسی.

## ۴. نحوه ادغام (Integration Pattern)

برای استفاده از ColorPicker در محیط‌های شناور (Floating UI) یا Dropdownها، الکوی زیر توصیه می‌شود:

\`\`\`javascript
const colorTrigger = floatingUI.element.querySelector('.penman-btn-bg-color-trigger');
const colorWrapper = floatingUI.element.querySelector('.penman-btn-bg-color-wrapper');

colorTrigger.addEventListener('click', (e) => {
    e.preventDefault();

    // اگر قبلاً باز شده، آن را ببند
    if (colorWrapper.querySelector('.penman-color-picker-container')) {
        colorWrapper.innerHTML = ''; // یا متد remove()
        return;
    }

    const container = document.createElement('div');
    container.className = 'penman-color-picker-container';

    const pickerInstance = new ColorPicker({
        defaultColor: '#ffffff',
        onChange: (hex, final) => {
            // اعمال تغییر رنگ با استفاده از CommandManager
            editor.commands.execute('SET_CELL_PROPERTY', { property: 'backgroundColor', value: hex });

            // فقط در صورتی ببند که انتخاب نهایی باشد (کاربر در حال تایپ نباشد)
            if (final) {
                container.remove();
            }
        }
    });

    container.appendChild(pickerInstance.getElement());
    colorWrapper.appendChild(container);
});
\`\`\`
