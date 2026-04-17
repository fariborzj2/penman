# تحلیل وضعیت پروژه بر اساس شواهد واقعی

بر اساس قوانین سختگیرانه توسعه (Penman AI Development Rules) و بررسی دقیق کد، تست‌ها و مستندات، وضعیت فازهای پروژه به شرح زیر تحلیل شده است.

## قوانین اعمال شده در تحلیل
- **کامل (Completed)**: نیازمند پیاده‌سازی E2E واقعی (بدون استفاده از Mock، Stub، شبیه‌سازی متدها)، تطابق ۱۰۰٪ با مستندات `/docs` و وجود تست‌های واقعی E2E (مثل Playwright).
- **نیمه‌کاره (In Progress)**: وجود Mock، تناقض با معماری (مثلاً تغییر سطح Trust بدون مجوز)، فقدان تست E2E واقعی، عدم وجود مستندات لازم.
- **شروع‌نشده (Not Started)**: فقدان کامل پیاده‌سازی.

---

## تحلیل وضعیت فازها

### ۱. فاز 1 تا 6 اصلی پروژه
- **وضعیت در PROGRESS.md**: کامل (Completed)
- **وضعیت واقعی**: **نیمه‌کاره (In Progress)**
- **دلایل نقص**:
  - در فایل `src/integration.test.js` و `src/core/Editor.test.js` هنوز از Mock برای توابع Selection و `insertHTML` استفاده می‌شود.
  - تست‌های بسیاری در `src/commands/CommandManager.test.js` و `src/ui/UIManager.test.js` متدهای حیاتی مثل `execCommand` و `queryCommandState` را مسخره (Mock) کرده‌اند. این نقض مستقیم قانون یکپارچگی واقعی است.

### ۲. فاز 7: مستندسازی و تثبیت (Documentation & Stabilization)
- **وضعیت در PROGRESS.md**: شروع نشده (Not Started)
- **وضعیت واقعی**: **شروع‌نشده (Not Started)**
- **دلایل نقص**: هیچ مستندی مطابق با واقعیت نهایی تهیه نشده و بخش زیادی از پلاگین‌ها مستندات `/docs/` کاملی ندارند. (وجود پوشه `plugins-docs` در root که برخلاف قانون مسیر `/docs` است).

### ۳. افزونه جدول (Table Plugin - فاز 1 تا 5)
- **وضعیت در PROGRESS.md**: کامل (Completed)
- **وضعیت واقعی**: **نیمه‌کاره (In Progress)**
- **دلایل نقص**:
  - تمام تست‌های این پلاگین (`TableTransaction.test.js`، `TableSelectionManager.test.js`، `TableMenu.test.js`) به شدت متکی به اشیاء موک شده (Mock objects) مثل `editorMock` و `vi.fn()` هستند. هیچ تست Playwright واقعی برای منوی جدول و تراکنش‌ها در `verify_ui.py` وجود ندارد. این امر خلاف قانون E2E بدون Mock است.

### ۴. افزونه تصویر (Image Plugin - فاز 1 تا 5)
- **وضعیت در PROGRESS.md**: کامل (Completed)
- **وضعیت واقعی**: **نیمه‌کاره (In Progress)**
- **دلایل نقص**:
  - **نقض امنیتی (Trust Immutability Rule)**: در فایل `src/plugins/ImagePlugin/index.js` از دستور `editor.image.insertUntrustedURL` به صورت گسترده برای درج تصاویر Upload شده از Queue و Gallery استفاده می‌شود. این عمل باعث دور زدن اعتبارسنجی‌ها و TrustLevel مشخص شده در `docs/19-image-plugin-spec.md` می‌شود.
  - **نقض تست E2E**: تست‌های این افزونه (`ImagePlugin.stress.test.js`) تماماً بر پایه JSDOM و Mock گسترده‌ی `editor` و `uploadFn` است. در اسکریپت `verify_ui.py` هیچ سناریوی واقعی برای آپلود، گالری یا درج تصویر وجود ندارد.
  - **وضعیت UI نمایشی**: صف آپلود (`uploadQueue`) در رویداد `processQueue` در `index.js` پیشرفت آپلود (Progress) را شبیه‌سازی (Simulate) می‌کند که این یک نوع Mock و UI غیرعملیاتی در مسیر اصلی اجرای کد است.

### ۵. افزونه جستجو و جایگزینی (Find and Replace Plugin)
- **وضعیت در PROGRESS.md**: کامل (Completed)
- **وضعیت واقعی**: **نیمه‌کاره (In Progress)**
- **دلایل نقص**:
  - در فایل `src/plugins/FindReplacePlugin.test.js` از `vi.spyOn(window, 'getSelection').mockReturnValue` و شبیه‌سازی‌های دیگر استفاده شده است.

---

## برنامه مرحله‌به‌مرحله برای تکمیل فازهای نیمه‌کاره

طبق قانون اولویت اجرای اصلاحات: هیچ توسعه جدیدی قبل از رفع کامل مشکلات فعلی مجاز نیست.

**مرحله اول: اصلاح مشکلات امنیتی و معماری Image Plugin**
1. حذف شبیه‌سازی پیشرفت (Progress Simulation) آپلود در `index.js`.
2. اصلاح متد درج تصویر برای آپلود و گالری به طوری که از `TrustLevel.TRUSTED` (یا بر اساس منبع ثبت شده) استفاده کند و به اشتباه از `insertUntrustedURL` که برای تب URL در نظر گرفته شده استفاده نکند.
3. ادغام درست منطق `uploadFn` با UI بدون Mock.

**مرحله دوم: حذف Mockها از تست‌های یکپارچگی و E2E**
1. انتقال تمام تست‌های متکی به `editorMock` در افزونه‌های Table، Image، و Find/Replace به زیرساخت Playwright (`verify_ui.py`).
2. اطمینان از اینکه هیچ `vi.fn()` یا `mockExecute`ای جایگزین متدهای واقعی DOM مرورگر در تست‌های E2E/Integration نمی‌شود. تمامی سناریوها باید End-to-End واقعی در مرورگر اجرا شوند.

**مرحله سوم: اصلاح مستندات**
1. انتقال هرگونه سند خارج از `/docs` به داخل آن و به‌روزرسانی مستندات بر اساس کدهای نهایی شده بدون Mock.
