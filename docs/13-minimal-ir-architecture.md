# 13 - معماری لایه نمایش میانی (Minimal IR Architecture)

> **[وضعیت سند: تعلیق شده / FROZEN]**
> این معماری به عنوان چشم‌انداز آینده (Future Architecture) ادیتور Penman طراحی شده است. به دلیل محدودیت‌های زمان/بودجه در فاز فعلی، پیاده‌سازی سیستم به صورت DOM-Based (بدون IR) انجام شده است. برای اطلاع از محدودیت‌های سیستم فعلی و شرایط مهاجرت (Migration Triggers) به این معماری، فایل `14-technical-debt-and-limitations.md` را مطالعه کنید.

این سند تصمیمات قطعی و مشخصات فنی (Specification) لایه میانی (Intermediate Representation - IR) ادیتور Penman را تعریف می‌کند. این لایه برای حل مشکلات مقیاس‌پذیری حافظه (O(n) History) و ناپایداری DOM ایجاد می‌شود.

## ۱. مدل منبع حقیقت (Data Model & Source of Truth)
مدل داخلی ادیتور (IR) منبع حقیقت قطعی است. DOM صرفاً یک لایه View است که از روی IR رندر می‌شود (One-way Data Flow). هیچ تغییری به صورت دوطرفه (Two-way Sync) مدیریت نمی‌شود.

### ساختار داده (Data Structure)
برای جلوگیری از پیچیدگی درخت‌های عمیق (Deep Trees)، ساختار داده به صورت یک آرایه خطی از بلاک‌ها (Flat Array of Blocks) مدل‌سازی می‌شود:

```typescript
type EditorState = {
  blocks: Block[];
  selection: SelectionState | null;
};

type Block = {
  id: string; // شناسه یکتا برای ردیابی در DOM
  type: 'paragraph' | 'heading1' | 'blockquote' | 'list-item';
  children: InlineNode[]; // فقط یک سطح فرزند مجاز است
};

type InlineNode = {
  type: 'text';
  text: string;
  formats: ('bold' | 'italic' | 'underline' | 'code')[];
};
```
*تصمیم قطعی:* تودرتویی (Nesting) بیش از یک سطح (بلاک -> متن) ممنوع است. ساختارهایی مثل لیست‌ها با تغییر نوع بلاک (مثلاً `list-item` و یک ویژگی `indentLevel`) پیاده‌سازی می‌شوند، نه با ساختار درختی `<ul><li>...`.

## ۲. مدل تراکنش (Transaction Model)
هرگونه تغییر در وضعیت ادیتور باید از طریق یک شیء تراکنش (Transaction) صورت گیرد تا History Manager بتواند تغییرات را به جای ذخیره کل HTML (Snapshot)، به صورت افزایشی (Delta) ذخیره کند.

### قراردادهای تراکنش
1. **Unit of Work:** هر تراکنش مجموعه‌ای از عملیات اتمیک (مثل `InsertText`, `DeleteRange`, `ApplyFormat`) است.
2. **Coalescing (ادغام تراکنش‌ها):** تراکنش‌های تایپ (`InsertText`) که در فاصله زمانی کمتر از ۵۰۰ میلی‌ثانیه اتفاق می‌افتند، به شرطی که Selection (Caret) جابجا نشده باشد، باید در یک رکورد واحد در `undoStack` ادغام شوند.
3. **Invalidation:** به محض ثبت یک تراکنش و تغییر EditorState، کل DOM مربوط به بلاک‌های تغییر یافته (نه کل سند) مجدداً رندر (Re-render) می‌شود.

## ۳. قرارداد انتخاب (Selection Contract)
برای رهایی از مشکلات `contenteditable` و مارکرهای فیزیکی در DOM (که با Paste و Normalization می‌شکنند)، موقعیت نشانگر فقط روی مدل مجازی محاسبه می‌شود.

### محاسبه طول و آفست
*تصمیم قطعی:* محاسبات افست‌ها بر پایه **UTF-16 Code Units** انجام می‌شود. (با وجود مشکلات ایموجی‌ها، این تصمیم به این دلیل گرفته شده که APIهای پیش‌فرض مرورگر مثل `window.getSelection().anchorOffset` خروجی UTF-16 می‌دهند و تبدیل مداوم آن به Grapheme Clusters باعث افت شدید Performance در زمان همگام‌سازی سریع تایپ موبایل می‌شود).

```typescript
type SelectionState = {
  anchor: { blockId: string, offset: number };
  focus: { blockId: string, offset: number };
};
```
* فرآیند Sync:* هنگام فشردن کلید، افست مرورگر خوانده شده و به State داخلی نگاشت می‌شود. در هنگام رندرِ دوباره‌ی بلاک، Range مرورگر بر اساس محاسبه دستی روی طول رشته‌های TextNode از نو ساخته می‌شود.
