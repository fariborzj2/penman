# گزارش آمادگی برای انتشار عمومی — Penman Editor

> تاریخ بررسی: ۱۲ مه ۲۰۲۶  
> نسخه پروژه: `0.1.0`  
> نتیجه کلی: ❌ **پروژه آماده انتشار عمومی نیست**

---

## خلاصه اجرایی

پروژه Penman Editor یک ویرایشگر متن غنی (WYSIWYG) مبتنی بر Vanilla JS است که معماری خوبی دارد و مستندات نسبتاً کاملی برای پلاگین‌ها نوشته شده. اما پیش از انتشار عمومی، مشکلات جدی در حوزه‌های امنیت، باگ‌های عملکردی، و آمادگی برای توزیع به عنوان کتابخانه وجود دارد که باید رفع شوند.

---

## 🔴 مسدودکننده‌های انتشار (باید قبل از release رفع شوند)

### ۱. شکست تست‌های ListPlugin — باگ واقعی در indent/outdent

**فایل:** `src/plugins/ListPlugin.js`  
**تست‌های شکست‌خورده:** ۵ تست از ۲۴۶ (نتیجه اجرا: `1 failed | 32 passed`)

```
Expected: "<ul><li>Item 1</li><li>Item 2</li></ul>"
Received: "<ul><li>Item 1<ul><li>Item 2</li></ul></li></ul>"
```

عملیات indent/outdent آیتم‌های لیست را در جای اشتباه قرار می‌دهد. این یک باگ عملکردی واقعی است، نه مشکل تست. همچنین selection پس از indent درست بازیابی نمی‌شود.

---

### ۲. سرور آپلود هیچ امنیتی ندارد

**فایل:** `server/server.js`

```js
const upload = multer({ storage }); // بدون fileFilter، بدون limits
```

- هیچ محدودیت نوع فایل وجود ندارد — می‌توان `.php`، `.exe`، `.sh` آپلود کرد
- هیچ محدودیت حجم فایل وجود ندارد — می‌توان فایل ۱۰ گیگابایتی آپلود کرد
- نام فایل اصلی (با جایگزینی فاصله) مستقیماً استفاده می‌شود — خطر path traversal

**حداقل رفع:**
```js
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});
```

---

### ۳. CORS کاملاً باز است

**فایل:** `server/server.js`

```js
app.use(cors()); // هر origin‌ای مجاز است
```

در محیط production باید به domain مشخص محدود شود:
```js
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
```

---

### ۴. URL های hardcode شده `localhost:3000`

**فایل:** `server/server.js` — خطوط ۳۵ و ۵۵

```js
url: `http://localhost:3000/uploads/${req.file.filename}`
```

این URL‌ها در محتوای ویرایشگر ذخیره می‌شوند. در هر محیطی غیر از local، تصاویر شکسته خواهند بود. باید از متغیر محیطی استفاده شود:
```js
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
```

---

### ۵. `getContent()` اتریبیوت‌های داخلی ویرایشگر را لیک می‌کند

**فایل:** `src/core/Editor.js:607`

```js
getContent() {
  return this.editableArea.innerHTML; // بدون پاکسازی
}
```

خروجی شامل این موارد می‌شود که نباید به مصرف‌کننده برسند:
- `contenteditable="true"`
- `data-penman-core="true"`
- `data-cell-id`, `data-table-id`
- `data-placeholder`
- کلاس‌های `penman-selected-node`, `penman-cell-selected`

---

### ۶. `destroy()` event listener ها را پاک نمی‌کند — memory leak

**فایل:** `src/core/Editor.js`

متد `_bindEvents()` چندین `addEventListener` روی `this.editableArea` و `document` ثبت می‌کند، اما `destroy()` هیچ‌کدام را حذف نمی‌کند. اگر ویرایشگر چندین بار در یک صفحه init/destroy شود، event handler های ghost باقی می‌مانند.

---

### ۷. استفاده از `alert()` و `confirm()` در کد کتابخانه

این موارد در یک کتابخانه کاملاً غیرقابل قبول هستند:

| فایل | خط | نوع |
|------|-----|-----|
| `src/plugins/ImagePlugin/index.js` | ۵۹۱ | `alert()` |
| `src/plugins/ImagePlugin/index.js` | ۹۱۷ | `alert()` |
| `src/plugins/table/TablePlugin.js` | ۱۳۷ | `alert()` |
| `src/plugins/SourceCodePlugin/SourceCodePlugin.js` | ۹۹ | `window.confirm()` |

این توابع thread را block می‌کنند، قابل style دادن نیستند، و در محیط‌هایی مثل iframe یا Electron کار نمی‌کنند. باید با یک سیستم modal/notification داخلی جایگزین شوند.

---

## 🟠 مشکلات امنیتی

### ۸. XSS در رندر گالری تصاویر

**فایل:** `src/plugins/ImagePlugin/index.js:393`

```js
imgDiv.innerHTML = `<img src="${item.thumbnailUrl}" title="${item.title}" ...>`;
```

`item.title` و `item.url` از API گالری می‌آیند و بدون escape مستقیم در `innerHTML` قرار می‌گیرند. باید از `document.createElement` + `setAttribute` استفاده شود.

---

### ۹. `data-penman-core` کل sanitizer را دور می‌زند

**فایل:** `src/sanitization/Sanitizer.js`

هر المانی که `data-penman-core="true"` داشته باشد از sanitization کامل معاف است. اگر مهاجم بتواند این اتریبیوت را در محتوای paste شده وارد کند، تمام حفاظت XSS دور زده می‌شود.

---

### ۱۰. اعتبارسنجی `href` ناقص است

**فایل:** `src/sanitization/Sanitizer.js`

فقط `javascript:` بلاک می‌شود. این schemeها مجاز می‌مانند:
- `data:text/html,...` — XSS
- `vbscript:` — XSS در IE
- `blob:` — محتوای دلخواه

باید از allowlist استفاده شود: فقط `http:`, `https:`, `mailto:`, `tel:`, `#`

---

### ۱۱. `src` تگ `iframe` اعتبارسنجی نمی‌شود

`iframe` در لیست تگ‌های مجاز sanitizer است اما URL آن بررسی نمی‌شود. هر URL دلخواهی می‌تواند embed شود.

---

### ۱۲. `setContent()` ورودی را sanitize نمی‌کند

**فایل:** `src/core/Editor.js:615`

```js
setContent(html) {
  this.editableArea.innerHTML = html; // بدون sanitization
}
```

هر مصرف‌کننده‌ای که این متد را با HTML ناامن صدا بزند، تمام حفاظت XSS را دور می‌زند.

---

## 🟡 باگ‌ها و مشکلات عملکردی

### ۱۳. `navigator.platform` منسوخ شده

**فایل‌ها:** `src/core/Editor.js:234`، `src/plugins/FindReplacePlugin/FindReplacePlugin.js:434`

```js
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0; // deprecated
```

باید جایگزین شود با:
```js
const isMac = navigator.userAgent.includes('Mac') || navigator.userAgentData?.platform === 'macOS';
```

---

### ۱۴. وابستگی سنگین به `document.execCommand` منسوخ شده

در کل codebase **۴۹ بار** از `document.execCommand` استفاده شده. این API رسماً deprecated است و مرورگرها در حال حذف آن هستند. این یک بدهی فنی بزرگ است که نیاز به برنامه مهاجرت دارد.

---

### ۱۵. باگ در `replaceAll` پلاگین FindReplace

**فایل:** `src/plugins/FindReplacePlugin/FindReplacePlugin.js`

حلقه replace-all روی `results` iterate می‌کند اما `mapper` یک بار قبل از حلقه ساخته می‌شود. پس از اولین جایگزینی، تمام offset های بعدی در `results` اشتباه هستند. این باعث می‌شود وقتی طول رشته جایگزین با رشته اصلی فرق دارد، جایگزینی‌های بعدی در جای اشتباه انجام شوند.

---

### ۱۶. `ColorPlugin` از `document.body.click()` برای بستن dropdown استفاده می‌کند

**فایل:** `src/plugins/ColorPlugin/`

```js
if (final) { document.body.click(); }
```

این یک hack است که می‌تواند event handler های ناخواسته دیگر را در صفحه trigger کند.

---

### ۱۷. `destroy()` ناقص است

علاوه بر مشکل event listener (شماره ۶):
- state پلاگین‌ها (floating UI، observer، timer) پاک نمی‌شود
- ویرایشگر از Map داخلی `instances` در `index.js` حذف نمی‌شود (در استفاده مستقیم از `new Editor()`)
- reference های داخلی null نمی‌شوند

---

## 🟡 کاستی‌های آمادگی برای توزیع به عنوان کتابخانه

### ۱۸. `package.json` برای انتشار npm ناقص است

| فیلد | وضعیت | مشکل |
|------|--------|-------|
| `"author"` | خالی | — |
| `"keywords"` | خالی | — |
| `"main"` | `src/index.js` | باید به `dist/penman.umd.js` اشاره کند |
| `"module"` | وجود ندارد | باید `dist/penman.es.js` باشد |
| `"exports"` | وجود ندارد | برای Node.js modern resolution لازم است |
| `"files"` | وجود ندارد | بدون این فیلد، `npm publish` همه چیز را آپلود می‌کند |
| `"types"` | وجود ندارد | هیچ type definition ای وجود ندارد |

---

### ۱۹. خروجی build minify نشده

**فایل:** `vite.config.js`

هیچ تنظیم `build.minify` وجود ندارد. فایل‌های dist:
- `dist/penman.es.js` — حدود ۱ مگابایت، بدون minification
- `dist/penman.umd.js` — حدود ۸۳۸ کیلوبایت، بدون minification
- هیچ source map تنظیم نشده

---

### ۲۰. `"type": "commonjs"` با ES module syntax تناقض دارد

`package.json` دارای `"type": "commonjs"` است اما تمام فایل‌های source از `import`/`export` استفاده می‌کنند. Vite این را handle می‌کند اما برای مصرف‌کنندگانی که بخواهند مستقیم از source استفاده کنند گمراه‌کننده است.

---

### ۲۱. `express`، `cors`، `multer` در `dependencies` هستند نه `devDependencies`

این پکیج‌های سرور در `dependencies` اصلی هستند. هر کسی که کتابخانه را نصب کند، این پکیج‌های سرور را هم دریافت می‌کند. باید به `devDependencies` منتقل شوند یا سرور به یک پکیج جداگانه تبدیل شود.

---

### ۲۲. README اصلی اشتباه است

**فایل:** `README.md`

محتوای README اصلی پروژه، مستندات `BlockTypePlugin` است — یک copy-paste اشتباه. هیچ توضیحی درباره نصب، استفاده، یا public API وجود ندارد.

---

### ۲۳. هیچ type definition ای وجود ندارد

پروژه هیچ فایل `.d.ts` ندارد. مصرف‌کنندگان TypeScript هیچ autocomplete یا type safety ای دریافت نمی‌کنند.

---

## 🔵 مشکلات دسترسی‌پذیری (Accessibility)

### ۲۴. دکمه‌های toolbar فاقد `aria-label` و `aria-pressed` هستند

**فایل:** `src/ui/UIManager.js`

متد `_createButton` فقط `title` تنظیم می‌کند. دکمه‌هایی که فقط آیکون SVG دارند برای screen reader ها قابل خواندن نیستند. دکمه‌های toggle (bold، italic و...) فاقد `aria-pressed` هستند.

---

### ۲۵. ناحیه ویرایش فاقد ARIA attributes است

`editableArea` دارای `contentEditable = true` است اما:
- `role="textbox"` ندارد
- `aria-multiline="true"` ندارد
- `aria-label` ندارد

---

### ۲۶. Modal ها focus trap ندارند

**فایل:** `src/ui/Modal.js`

Modal ها `aria-modal="true"` و `role="dialog"` ندارند. کلید Tab از modal خارج می‌شود.

---

### ۲۷. Floating toolbar ها فقط با mouse قابل دسترسی هستند

Floating toolbar های تصویر و جدول فقط با mouse ظاهر می‌شوند. هیچ keyboard trigger یا focus management وجود ندارد.

---

## 🔵 کیفیت کد

### ۲۸. `Math.random()` برای تولید ID استفاده می‌شود

در **۱۲ جا** از `Math.random().toString(36).substr(2, 9)` برای ID استفاده شده. مشکلات:
- `substr` منسوخ شده (باید `substring` باشد)
- `Math.random()` برای ID ها collision-safe نیست
- باید از `crypto.randomUUID()` استفاده شود

---

### ۲۹. `console.warn` و `console.error` در کد production

موارد یافت شده در source (غیر از test files):

| فایل | نوع |
|------|-----|
| `DraftManager.js` | `console.warn` (۳ مورد) |
| `DraftStorage.js` | `console.warn` |
| `DraftPlugin.js` | `console.warn` (۲ مورد) |
| `FindReplacePlugin.js` | `console.warn` (۳ مورد) |
| `ImagePlugin/index.js` | `console.error` |
| `TableTransaction.js` | `console.warn` |
| `PluginManager.js` | `console.warn` (۲ مورد) |
| `CommandManager.js` | `console.warn` |
| `I18nManager.js` | `console.warn` |

این موارد باید پشت یک debug flag قرار بگیرند.

---

### ۳۰. نام‌گذاری ناسازگار

`src/plugins/Suggestedpostsplugin.js` — حرف `p` کوچک است در حالی که تمام پلاگین‌های دیگر PascalCase هستند.

---

### ۳۱. پوشه `server/uploads` حاوی فایل‌های واقعی است

پوشه `server/uploads` شامل ۶۰+ فایل تصویری واقعی است که در git commit شده‌اند. این فایل‌ها نباید در repository باشند. باید به `.gitignore` اضافه شوند.

---

### ۳۲. هیچ script برای `test:coverage` وجود ندارد

`@vitest/coverage-v8` نصب شده اما در `package.json` هیچ script ای برای اجرای coverage وجود ندارد. Coverage هرگز اندازه‌گیری یا enforce نمی‌شود.

---

## جدول خلاصه

| دسته | تعداد | اولویت |
|------|--------|--------|
| 🔴 مسدودکننده انتشار | ۷ | باید قبل از release رفع شود |
| 🟠 امنیتی | ۵ | باید قبل از release رفع شود |
| 🟡 باگ / عملکردی | ۵ | باید قبل از release رفع شود |
| 🟡 آمادگی توزیع | ۶ | باید قبل از release رفع شود |
| 🔵 دسترسی‌پذیری | ۴ | توصیه می‌شود |
| 🔵 کیفیت کد | ۵ | توصیه می‌شود |
| **جمع** | **۳۲** | |

---

## اولویت‌بندی پیشنهادی برای رفع

### فاز ۱ — امنیت و باگ‌های بحرانی
1. رفع باگ indent/outdent در `ListPlugin`
2. اضافه کردن `fileFilter` و `limits` به multer
3. محدود کردن CORS به domain مشخص
4. متغیر محیطی برای `BASE_URL` سرور
5. پاکسازی اتریبیوت‌های داخلی در `getContent()`
6. رفع memory leak در `destroy()`
7. جایگزینی `alert()`/`confirm()` با modal داخلی
8. اعتبارسنجی `href` با allowlist
9. sanitize کردن ورودی `setContent()`

### فاز ۲ — آمادگی توزیع
10. رفع `package.json` (main، module، exports، files، author، keywords)
11. فعال کردن minification در vite.config.js
12. انتقال express/cors/multer به devDependencies
13. نوشتن README اصلی
14. اضافه کردن `server/uploads` به `.gitignore`
15. جایگزینی `Math.random()` با `crypto.randomUUID()`

### فاز ۳ — بهبود کیفیت
16. رفع `navigator.platform` deprecated
17. اضافه کردن `aria-label` و `aria-pressed` به toolbar
18. اضافه کردن `role` و `aria-label` به editableArea
19. اضافه کردن focus trap به Modal
20. اضافه کردن script برای `test:coverage`

---

*این گزارش بر اساس بررسی استاتیک کد و اجرای test suite تهیه شده است. تست‌های E2E و بررسی دستی در مرورگر نیز توصیه می‌شود.*
