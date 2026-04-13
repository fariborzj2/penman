# 17 - مشخصات افزونه جدول (Table Plugin Spec - Ultimate Invariant Level)

این سند مرجع نهایی و تغییرناپذیر (Invariant Level) معماری جدول در Penman برای مقیاس‌های سنگین ویرایش (Heavy Editing Scale) است. این معماری تضمین می‌کند که هیچ سناریویی از جمله Undo متوالی، انتخاب ترکیبی یا خرابی حین اجرا نتواند پایداری گرید جدول و ادیتور را به هم بریزد.

## اصل صفرم: قوانین تغییرناپذیر (The Ultimate Invariants)

1. **Staging Buffer (Atomicity):** تغییرات تدریجی (Incremental Mutation) مجاز هستند، اما **فقط** روی یک کپی (Clone) موقت از لایه‌ی درگیر (Partial Staging). هیچ Mutation مستقیمی روی DOM زنده بدون تاییدِ یکپارچگی (Commit Phase) انجام نمی‌شود. اگر تایید نشد، کپی دور ریخته می‌شود.
2. **Logical Exclusion:** هیچ Node ای از جدول حذف (Destroy) نمی‌شود و از `display: none` نیز استفاده نخواهد شد (چرا که در Selection موتور مرورگرها اختلال و پرش فوکوس ایجاد می‌کند). در عوض سلول‌های Merge شده با `data-merged="true"` و `aria-hidden="true"` نشانه گذاری می‌شوند و سیستم رندر (Rendering Logic) آن‌ها را از جریان Layout خارج می‌کند.
3. **Merge Descriptors:** فرایند Split هرگز نباید برای بازیابی حالت از DOM "اسکن" (Scan) کند. هر Merge موظف است یک شناسنامه بازگشتی (Descriptor) ذخیره کند تا اعمال Split یک بازگشت قطعی ساختاری (Deterministic Structural Revert) باشد.
4. **Shadow Selection:** انتخاب مرورگر با Cell Selection جایگزین/حذف (Collapse) نمی‌شود، بلکه به صورت آینه‌ای (Mirrored) مدیریت می‌گردد تا پرش فوکوس (Flicker) و قطع جریان ورودی رخ ندهد.
5. **Range-based Formatting:** هیچ عملیات قالب‌بندی (Formatting) به صورت Wrapping کورکورانه (Blind Wrapping) و هیچ استفاده‌ای از `execCommand` مجاز نیست. تمام قالب‌بندی‌ها روی Range‌های استاندارد DOM سوار می‌شوند.

---

## 1. مدل یکپارچگی گرید (Grid Integrity Model)

**DOM منبع قطعی (Source of Truth) است** اما وضعیت سلول‌های غیرفعال (Merged) به روش Exclusion مدیریت می‌شود.
- `TableGrid`: همچنان وظیفه Align کردن مختصات (Coordinates) و کشف خطای هندسی را بر عهده دارد.

---

## 2. سیستم تراکنش اتمیک (Partial Staging Transaction)

برای جلوگیری از layout reflow سنگین کل جدول، تراکنش‌های ما فقط بخش‌هایی که تغییر می‌کنند (مانند یک سطر یا مجموعه‌ای از سطرهای درگیر) را در یک `DocumentFragment` یا یک Clone موقت دستکاری کرده و سپس با Node‌های قدیمی در لحظه (Atomic Commit) جایگزین می‌کنند.

---

## 3. الگوریتم Merge و Split (Descriptor-based)

**Merge Cells:**
1. یک سلول Anchor پیدا می‌شود.
2. محتوای سایر سلول‌ها به Anchor اضافه (Append) می‌شود.
3. در Anchor Cell یک مشخصه `data-merge-descriptor` ذخیره می‌شود که لیست آیدی سلول‌های جذب شده را نگه می‌دارد: `data-merge-descriptor='["c-2", "c-3"]'`.
4. سلول‌های جذب شده مقادیر `data-merged="true"` و `aria-hidden="true"` دریافت کرده و محتوایشان خالی (یا فقط `<br>`) می‌شود. (رندر شدن اینها به نحوی با استایل‌های جدولی خنثی می‌شود تا فضای فیزیکی نگیرند).
5. Spanهای Anchor بروز می‌شود.

**Split Cell:**
1. فقط سلول‌هایی می‌توانند Split شوند که دارای `data-merge-descriptor` باشند.
2. سیستم این Descriptor را می‌خواند.
3. دقیقاً روی لیست آیدی‌های ذکر شده، وضعیت `data-merged` پاک شده و `aria-hidden` برداشته می‌شود.
4. Spanهای Anchor به `1` برمی‌گردند.
5. هیچ حدس یا اسکن DOM ای رخ نمی‌دهد. بازگشت کاملاً Deterministic است.

---

## 4. انتخاب شبح‌وار (Shadow Selection)

هنگام کشیدن ماوس (Drag):
- انتخاب اصلی مرورگر در پس‌زمینه بین نود شروع و پایان وجود دارد (تخریب نمی‌شود).
- سیستم یک `CellSelection` ایجاد می‌کند که مختصات را محاسبه و Overlayهای کلاس `.penman-cell-selected` را روشن می‌کند.
- این یعنی ادیتور درک می‌کند کاربر کدام بلوک را انتخاب کرده، اما State بومی مرورگر سالم باقی می‌ماند تا Keyboard Navigation و رویدادهای Copy/Paste بومی نشکنند.

---

## 5. قالب‌بندی مبتنی بر محدوده (Range-based Formatting)

وقتی قرار است چند سلول را Bold کنیم:
- برای هر سلولِ درون CellSelection، یک `Range` مجازی روی محتوای آن سلول (از ابتدا تا انتهای TextNode ها) ایجاد می‌شود.
- قالب‌بندی با استخراج (extractContents) و کپسوله کردن (Wrap) درون تگ مربوطه (مثل `<strong>`) فقط در داخل همان رنج اعمال می‌شود.
- از `document.execCommand` مطلقاً استفاده نخواهد شد. این تضمین می‌کند که تگ‌ها با هم Overlap نکرده و DOM به شکل پایدار و کنترل شده جهش کند.

---

## 6. مشخصات دستورات (Command System)

تمامی این دستورات به عنوان توابع اتمیک داخل `TableTransaction.commit()` بسته‌بندی می‌شوند:
- `INSERT_TABLE(rows: number, cols: number, withHeader: boolean)`
- `DELETE_TABLE(tableId: string)`
- `ADD_ROW(tableId: string, anchorCellId: string, position: 'before' | 'after')`
- `REMOVE_ROW(tableId: string, anchorCellId: string)`
- `ADD_COLUMN(tableId: string, anchorCellId: string, position: 'before' | 'after')`
- `REMOVE_COLUMN(tableId: string, anchorCellId: string)`
- `MERGE_CELLS(tableId: string, cellIds: string[])`
- `SPLIT_CELL(tableId: string, cellId: string)`
- `SET_TABLE_PROPERTY(tableId: string, property: string, value: string)`
- `SET_CELL_PROPERTY(tableId: string, cellIds: string[], property: string, value: string)`

---

## 7. رابط کاربری (User Interface)

### الف) منوی اصلی درج جدول (Insert Table Menu)
- **منوی اصلی:** یک Dropdown با شبکه‌ی ۱۰x۱۰ (Grid Selector). با حرکت ماوس روی خانه‌ها (Hover)، ابعاد به صورت زنده نمایش داده شده (مثلاً ۴x۴) و با کلیک، جدول با ابعاد مشخص درج می‌شود.
- **گزینه‌های زیرمنو (Submenu Items):** (اگر جدولی از قبل انتخاب شده باشد، این منو تغییر حالت می‌دهد)
  - **سلول (Cell):** ادغام (Merge) و تقسیم (Split).
  - **ردیف (Row):** درج در بالا (Insert Row Before)، درج در پایین (Insert Row After) و حذف ردیف (Delete Row).
  - **ستون (Column):** درج در چپ (Insert Col Before)، درج در راست (Insert Col After) و حذف ستون (Delete Col).
- **بخش تنظیمات نهایی:**
  - ویژگی‌های جدول (Table Properties): مدال یا منو برای تنظیم Border, Padding و عرض جدول.
  - حذف جدول (Delete Table).

### ب) ابزار شناور متنی (Contextual Floating Toolbar)
یک مینی‌تولبار (Mini Toolbar) که با ورود فوکوس به جدول یا رفتن ماوس روی جدول در بالا یا کنار آن ظاهر می‌شود. (پیاده‌سازی شده با `FloatingUI.js`)
شامل گزینه‌های دسترسی سریع:
- **درج ردیف در پایین (Add Row After)**: آیکون + افقی.
- **درج ستون در سمت راست (Add Col After)**: آیکون + عمودی.
- **تنظیمات استایل (Background Color)**: انتخاب رنگ پس‌زمینه ردیف/سلول (مثلاً برای Header).
- **حذف جدول (Delete Table)**: آیکون سطل زباله (Trash icon).
