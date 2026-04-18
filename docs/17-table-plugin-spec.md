# 17 - مشخصات افزونه جدول (Table Plugin Spec - Ultimate Invariant Level)

این سند مرجع نهایی و تغییرناپذیر (Invariant Level) معماری جدول در Penman برای مقیاس‌های سنگین ویرایش (Heavy Editing Scale) است.

## اصل صفرم: قوانین تغییرناپذیر (The Ultimate Invariants)

1. **Staging Buffer (Atomicity):** تغییرات تدریجی (Incremental Mutation) مجاز هستند، اما **فقط** روی DOM زنده با snapshot قبل از شروع تراکنش. اگر `commit()` با Grid Integrity Check شکست بخورد، `rollback()` از طریق `innerHTML` بازگردانی می‌شود.

2. **Physical Removal on Merge (رفتار واقعی):** سلول‌های merged به صورت فیزیکی از DOM حذف می‌شوند (`domNode.remove()`). اطلاعات ساختاری آن‌ها در `data-merge-descriptor` روی Anchor Cell ذخیره می‌گردد تا عملیات Split قطعی باشد.
   > **توضیح:** نسخه قبلی این spec ادعا می‌کرد سلول‌ها با `data-merged="true"` پنهان می‌شوند. پیاده‌سازی واقعی حذف فیزیکی را انتخاب کرده که پایداری بیشتری در مرورگرهای مختلف دارد و با `display: none` که در Selection موتور مرورگر اختلال ایجاد می‌کند تعارض ندارد.

3. **Merge Descriptors:** فرایند Split هرگز نباید برای بازیابی حالت از DOM "اسکن" (Scan) کند. هر Merge موظف است یک شناسنامه بازگشتی (Descriptor) ذخیره کند: `data-merge-descriptor='[{"id":"c-2","r":0,"c":1,"rs":1,"cs":1}]'`. Split از همین Descriptor برای بازسازی قطعی استفاده می‌کند.

4. **Shadow Selection:** انتخاب مرورگر با Cell Selection حذف (Collapse) نمی‌شود. در `selectRange()` انتخاب بومی مرورگر حفظ می‌شود تا پرش فوکوس و قطع جریان ورودی رخ ندهد.

5. **Range-based Formatting for Cell Selection:** قالب‌بندی چند سلول از طریق `applyFormatToSelection()` در `TableSelectionManager` انجام می‌شود. این متد DOM را مستقیماً با `createElement`/`insertBefore`/`removeChild` manipulate می‌کند و از `execCommand` در این مسیر استفاده نمی‌کند.

---

## 1. مدل یکپارچگی گرید (Grid Integrity Model)

**DOM منبع قطعی (Source of Truth) است.** `TableGrid` وظیفه Align کردن مختصات و کشف خطای هندسی را دارد. پس از هر `commit()` یک Grid Integrity Check انجام می‌شود.

---

## 2. سیستم تراکنش (Transaction)

`TableTransaction` مراحل زیر را اجرا می‌کند:
1. `begin()`: snapshot از `innerHTML`، `style`، و attributeها می‌گیرد و Grid را می‌سازد.
2. Mutation: عملیات مستقیماً روی DOM زنده اعمال می‌شود.
3. `commit()`: Grid Integrity Check. اگر valid باشد تغییرات نگه داشته می‌شود. اگر نه، `rollback()` اجرا می‌شود.
4. `rollback()`: `innerHTML` و تمام attributeها از snapshot بازیابی می‌شوند.

---

## 3. الگوریتم Merge و Split (Descriptor-based)

**Merge Cells:**
1. سلول Anchor شناسایی می‌شود (گوشه بالا-چپ bounding box).
2. محتوای سلول‌های جذب‌شده به Anchor اضافه می‌شود.
3. اطلاعات سلول‌های جذب‌شده در `data-merge-descriptor` روی Anchor ذخیره می‌شود.
4. سلول‌های جذب‌شده فیزیکاً با `remove()` حذف می‌شوند.
5. `rowspan` و `colspan` روی Anchor به‌روز می‌شوند.

**Split Cell:**
1. فقط سلول‌هایی که `data-merge-descriptor` دارند قابل Split هستند.
2. Descriptor خوانده می‌شود.
3. سلول‌های جذب‌شده با `data-cell-id` اصلی‌شان بازسازی و در موقعیت اصلی‌شان در DOM درج می‌شوند.
4. Span‌های Anchor به `1` برمی‌گردند و Descriptor حذف می‌شود.
5. هیچ اسکن DOM رخ نمی‌دهد. بازگشت کاملاً Deterministic است.

---

## 4. انتخاب شبح‌وار (Shadow Selection)

انتخاب بومی مرورگر در پس‌زمینه وجود دارد (تخریب نمی‌شود). سیستم `CellSelection` ایجاد می‌کند که مختصات را محاسبه و Overlayهای کلاس `.penman-cell-selected` را روشن می‌کند.

---

## 5. قالب‌بندی مبتنی بر Cell Selection

وقتی چند سلول انتخاب شده‌اند:
- `applyFormatToSelection(cmd, value)` در `TableSelectionManager` اجرا می‌شود.
- قالب‌بندی با `createElement` و unwrapping مستقیم DOM اعمال می‌شود.
- از `document.execCommand` برای cell selection formatting استفاده نمی‌شود.

---

## 6. مشخصات دستورات (Command System)

تمامی این دستورات به عنوان توابع اتمیک داخل `TableTransaction.commit()` بسته‌بندی می‌شوند:
- `INSERT_TABLE(rows: number, cols: number)`
- `DELETE_TABLE(tableId: string)`
- `ADD_ROW(tableId: string, anchorCellId: string, position: 'before' | 'after')`
- `REMOVE_ROW(tableId: string, anchorCellId: string)`
- `ADD_COLUMN(tableId: string, anchorCellId: string, position: 'before' | 'after')`
- `REMOVE_COLUMN(tableId: string, anchorCellId: string)`
- `MERGE_CELLS(tableId: string, cellIds: string[])`
- `SPLIT_CELL(tableId: string, cellId: string)`
- `SET_TABLE_PROPERTIES(tableId: string, properties: Object)`
- `SET_CELL_PROPERTY(tableId: string, cellIds: string[], property: string, value: string)` — history snapshot می‌گیرد

---

## 7. رابط کاربری (User Interface)

### الف) منوی اصلی درج جدول (Insert Table Menu)
منوی Dropdown با شبکه‌ی ۱۰x۱۰ (Grid Selector). با کلیک، جدول با ابعاد مشخص درج می‌شود.

**گزینه‌های زیرمنو:**
- **سلول:** ادغام (Merge) و تقسیم (Split).
- **ردیف:** درج در بالا، درج در پایین، حذف ردیف.
- **ستون:** درج در چپ، درج در راست، حذف ستون.
- ویژگی‌های جدول (Table Properties)، حذف جدول.

### ب) ابزار شناور متنی (Contextual Floating Toolbar)
با ورود فوکوس به جدول ظاهر می‌شود. دسترسی سریع به:
- درج ردیف در پایین، درج ستون در راست
- Background Color (با ColorPicker — اکنون Undoable است)
- حذف جدول
