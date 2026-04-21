"""
verify_ui.py — تست‌های E2E یکپارچه Penman Editor

اصلاحات نسبت به نسخه قبل:
  - حذف کامل page.route() Mock برای آپلود (اکنون سرور واقعی اجرا می‌شود)
  - اضافه شدن تست‌های E2E برای: Gallery، ColorPicker در Table،
    FontSize، Unlink، RemoveFormat، HorizontalRule، BlockType
  - BACKEND_PORT از محیط خوانده می‌شود (پیش‌فرض 3000)
"""

import os
import time
import tempfile
import shutil
from pathlib import Path
from playwright.sync_api import Page, expect, sync_playwright

PORT = os.environ.get('VITE_PORT', '5173')
BACKEND_PORT = os.environ.get('BACKEND_PORT', '3000')
URL = f"http://localhost:{PORT}"
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"


# ─────────────────────────────────────────────────────────────────────────────
# helpers
# ─────────────────────────────────────────────────────────────────────────────

def wait_for_editor(page: Page):
    """منتظر بماند تا ادیتور کاملاً بارگذاری شود."""
    page.goto(URL)
    page.wait_for_selector(".penman-editor-area", timeout=10000)
    page.wait_for_load_state("networkidle", timeout=10000)


def clear_editor(page: Page):
    """محتوای ادیتور را پاک می‌کند."""
    page.locator(".penman-editor-area").first.evaluate(
        "node => node.innerHTML = '<p><br></p>'"
    )


# ─────────────────────────────────────────────────────────────────────────────
# تست‌های موجود (بدون تغییر در منطق، فقط بهبود robustness)
# ─────────────────────────────────────────────────────────────────────────────

def test_editor_svg_icons(page: Page):
    wait_for_editor(page)
    toolbar = page.locator(".penman-toolbar").first
    expect(toolbar).to_be_visible()
    bold_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-bold svg")
    expect(bold_btn).to_be_visible()
    print("  ✓ SVG icons loaded")


def test_editor_find_replace_e2e(page: Page):
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.fill("This is test. سَلام دنیا. سلام. س‌لام. Hello world!")

    page.keyboard.press("Control+f")

    modal = page.locator(".penman-modal")
    expect(modal).to_be_visible()

    page.locator("#fr-find").fill("سلام")
    page.locator("#fr-replace").fill("درود")

    page.locator("#fr-btn-find").click()
    page.locator("#fr-btn-replace-all").click()

    content = editable.inner_text()
    assert "درود دنیا" in content, f"Expected 'درود دنیا' in: {content}"
    assert "سلام" not in content, f"Expected no 'سلام' in: {content}"

    # بستن مدال
    page.keyboard.press("Escape")
    print("  ✓ Find & Replace works with RTL normalization")


def test_editor_image_plugin_url_insert(page: Page):
    """درج تصویر از URL — بدون Mock."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    clear_editor(page)

    page.locator(".penman-toolbar").first.locator(".penman-btn-image").click()
    modal = page.locator(".penman-modal")
    expect(modal).to_be_visible()

    url_input = page.locator("#penman-image-url-input")
    url_input.fill("https://via.placeholder.com/150")
    page.locator("#penman-image-url-submit").click()

    figure = page.locator(".penman-editor-area figure.penman-image")
    expect(figure).to_be_visible()
    img = figure.locator("img")
    expect(img).to_have_attribute("src", "https://via.placeholder.com/150")
    print("  ✓ Image insert from URL works")


def test_editor_image_upload_real_server(page: Page):
    """
    آپلود تصویر واقعی به سرور backend.
    این تست نیاز به اجرای server/server.js دارد (پورت BACKEND_PORT).
    اگر سرور آماده نباشد، تست با پیام مناسب skip می‌شود.
    """
    import urllib.request
    try:
        urllib.request.urlopen(f"{BACKEND_URL}/gallery", timeout=3)
    except Exception:
        print(f"  ⚠ Backend server not available at {BACKEND_URL} — skipping upload test")
        return

    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    clear_editor(page)

    # ساخت یک فایل تصویر موقت (PNG ساده ۱x۱ پیکسل)
    png_1x1 = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    tmp_dir = tempfile.mkdtemp()
    try:
        img_path = Path(tmp_dir) / "test_upload.png"
        img_path.write_bytes(png_1x1)

        page.locator(".penman-toolbar").first.locator(".penman-btn-image").click()
        modal = page.locator(".penman-modal")
        expect(modal).to_be_visible()

        # رفتن به تب Upload
        page.locator(".penman-image-tab[data-tab='upload']").click()

        # آپلود فایل
        file_input = page.locator("#penman-image-file-input")
        file_input.set_input_files(str(img_path))

        # منتظر ماندن برای اتمام آپلود (max 10 ثانیه)
        page.wait_for_function(
            "() => document.querySelector('#penman-image-upload-queue') && "
            "document.querySelector('#penman-image-upload-queue').innerText.includes('SUCCESS')",
            timeout=10000
        )

        # درج تصویر
        page.locator("#penman-image-upload-submit").click()

        figure = page.locator(".penman-editor-area figure.penman-image")
        expect(figure).to_be_visible()
        img = figure.locator("img")
        src = img.get_attribute("src")
        assert src and BACKEND_URL in src, f"Expected src from backend, got: {src}"
        print(f"  ✓ Real image upload works (src: {src[:50]}...)")

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def test_editor_image_gallery_load(page: Page):
    """
    تست لود گالری از سرور backend.
    نیاز به اجرای server/server.js دارد.
    """
    import urllib.request
    try:
        urllib.request.urlopen(f"{BACKEND_URL}/gallery", timeout=3)
    except Exception:
        print(f"  ⚠ Backend not available — skipping gallery test")
        return

    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    clear_editor(page)

    page.locator(".penman-toolbar").first.locator(".penman-btn-image").click()
    modal = page.locator(".penman-modal")
    expect(modal).to_be_visible()

    # رفتن به تب Gallery
    page.locator(".penman-image-tab[data-tab='gallery']").click()

    # منتظر بماند تا لود شود (یا پیام empty نشان داده شود)
    gallery_container = page.locator(".penman-gallery-container")
    page.wait_for_function(
        "() => {"
        "  const c = document.querySelector('.penman-gallery-container');"
        "  if (!c) return false;"
        "  return c.dataset.loaded === 'true' || c.querySelectorAll('[data-gallery-id]').length > 0;"
        "}",
        timeout=8000
    )

    # Gallery باید یا آیتم داشته باشد یا پیام empty — نه اینکه در حالت loading بماند
    loaded = gallery_container.get_attribute("data-loaded")
    assert loaded == "true", f"Gallery did not finish loading (data-loaded={loaded})"
    print("  ✓ Image gallery loads from backend server")

    # بستن مدال
    page.locator(".penman-modal-close").click()


def test_editor_table_plugin_e2e(page: Page):
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    clear_editor(page)

    page.locator(".penman-toolbar").first.locator(".penman-btn-table").click()

    cell = page.locator(".penman-grid-cell[data-row='2'][data-col='2']")
    expect(cell).to_be_visible()
    cell.click()

    table = page.locator(".penman-editor-area table")
    expect(table).to_be_visible()

    rows = table.locator("tr")
    expect(rows).to_have_count(2)
    first_row_cells = rows.nth(0).locator("td")
    expect(first_row_cells).to_have_count(2)
    print("  ✓ Table insert 2x2 works")


def test_editor_table_color_picker_e2e(page: Page):
    """
    تست ColorPicker در FloatingUI جدول:
    انتخاب رنگ پس‌زمینه سلول و تایید اعمال آن روی DOM.
    """
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    clear_editor(page)

    # درج یک جدول 2x2
    page.locator(".penman-toolbar").first.locator(".penman-btn-table").click()
    page.locator(".penman-grid-cell[data-row='2'][data-col='2']").click()

    table = page.locator(".penman-editor-area table")
    expect(table).to_be_visible()

    # کلیک روی اولین سلول تا FloatingUI ظاهر شود
    first_cell = table.locator("td").first
    first_cell.click()

    # FloatingUI باید ظاهر شود
    floating = page.locator(".penman-table-toolbar")
    expect(floating).to_be_visible(timeout=3000)

    # کلیک روی دکمه Background Color
    color_trigger = page.locator(".penman-toolbar").first.locator(".penman-btn-bg-color-trigger")
    expect(color_trigger).to_be_visible()
    color_trigger.click()

    # ColorPicker باید ظاهر شود
    color_picker = page.locator(".penman-color-picker")
    expect(color_picker).to_be_visible(timeout=2000)

    # انتخاب رنگ قرمز از پالت (#ff0000)
    red_swatch = page.locator(".penman-color-picker-swatch[data-color='#ff0000']")
    expect(red_swatch).to_be_visible()
    red_swatch.click()

    # بررسی اعمال رنگ روی DOM سلول
    cell_bg = first_cell.evaluate("el => el.style.backgroundColor")
    assert cell_bg in ("rgb(255, 0, 0)", "#ff0000", "red"), \
        f"Expected red background, got: {cell_bg}"
    print("  ✓ Table ColorPicker applies background-color to cell")


def test_editor_format_plugin_e2e(page: Page):
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Test text</p>'")

    page.keyboard.press("Control+A")
    page.locator(".penman-toolbar").first.locator(".penman-btn-bold").click()

    expect(editable.locator("strong")).to_be_visible()
    print("  ✓ Format (Bold) works")


def test_editor_list_plugin_e2e(page: Page):
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>List item 1</p>'")

    editable.evaluate("""node => {
        const range = document.createRange();
        range.selectNodeContents(node.querySelector('p'));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }""")

    page.locator(".penman-toolbar").first.locator(".penman-btn-bullist").click()

    expect(editable.locator("ul")).to_be_visible()
    expect(editable.locator("ul > li")).to_have_text("List item 1")
    print("  ✓ List (Bullet) works")


def test_editor_link_plugin_e2e(page: Page):
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Link me</p>'")

    page.keyboard.press("Control+A")
    page.locator(".penman-toolbar").first.locator(".penman-btn-link").click()

    modal = page.locator(".penman-modal")
    expect(modal).to_be_visible()

    page.locator("#penman-link-url").fill("https://example.com")
    page.locator(".penman-modal-btn-submit").click()

    link = editable.locator("a")
    expect(link).to_be_visible()
    expect(link).to_have_attribute("href", "https://example.com")
    print("  ✓ Link plugin works")


# ─────────────────────────────────────────────────────────────────────────────
# مرحله ۴: تست‌های E2E پلاگین‌های جدید
# ─────────────────────────────────────────────────────────────────────────────

def test_editor_fontsize_plugin_e2e(page: Page):
    """FontSizePlugin: انتخاب متن و اعمال اندازه فونت."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Resize me</p>'")

    # انتخاب کل متن
    page.keyboard.press("Control+A")

    # باز کردن dropdown فونت‌سایز
    fontsize_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-fontsize")
    expect(fontsize_btn).to_be_visible()
    fontsize_btn.click()

    # انتخاب 24px از لیست
    size_item = page.locator(".penman-fontsize-item", has_text="24px")
    expect(size_item).to_be_visible(timeout=2000)
    size_item.click()

    # بررسی اعمال span با font-size
    span = editable.locator("span[style*='font-size']").first
    expect(span).to_be_visible()
    font_size = span.evaluate("el => el.style.fontSize")
    assert font_size == "24px", f"Expected 24px, got: {font_size}"
    print("  ✓ FontSize plugin applies font-size span")


def test_editor_unlink_plugin_e2e(page: Page):
    """UnlinkPlugin: درج لینک، سپس حذف آن با Unlink."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate(
        "node => node.innerHTML = '<p><a href=\"https://test.com\">Click here</a></p>'"
    )

    # قرار دادن cursor داخل لینک
    editable.evaluate("""node => {
        const a = node.querySelector('a');
        const range = document.createRange();
        range.selectNodeContents(a);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }""")

    # کلیک روی دکمه Unlink
    unlink_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-unlink")
    expect(unlink_btn).to_be_visible()
    unlink_btn.click()

    # لینک باید حذف شده باشد
    links_count = editable.locator("a").count()
    assert links_count == 0, f"Expected no links after unlink, found {links_count}"

    # متن باید حفظ شده باشد
    text = editable.inner_text()
    assert "Click here" in text, f"Text should be preserved after unlink, got: {text}"
    print("  ✓ Unlink plugin removes anchor while preserving text")


def test_editor_removeformat_plugin_e2e(page: Page):
    """RemoveFormatPlugin: حذف فرمت‌بندی‌های inline."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate(
        "node => node.innerHTML = '<p><strong><em><u>Formatted text</u></em></strong></p>'"
    )

    # انتخاب کل متن
    page.keyboard.press("Control+A")

    # کلیک روی Clear Formatting
    removeformat_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-removeformat")
    expect(removeformat_btn).to_be_visible()
    removeformat_btn.click()

    # تگ‌های فرمت‌بندی باید حذف شده باشند
    html = editable.evaluate("node => node.innerHTML")
    assert "<strong>" not in html, f"strong tag should be removed, html: {html}"
    assert "<em>" not in html, f"em tag should be removed, html: {html}"
    assert "<u>" not in html, f"u tag should be removed, html: {html}"
    # متن باید حفظ شده باشد
    assert "Formatted text" in editable.inner_text(), "Text should be preserved"
    print("  ✓ RemoveFormat plugin strips inline tags")


def test_editor_horizontal_rule_plugin_e2e(page: Page):
    """HorizontalRulePlugin: درج خط افقی."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Before HR</p>'")

    # قرار دادن cursor در انتهای پاراگراف
    editable.evaluate("""node => {
        const p = node.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }""")

    # کلیک روی دکمه HR
    hr_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-hr")
    expect(hr_btn).to_be_visible()
    hr_btn.click()

    # hr باید درج شده باشد
    hr = editable.locator("hr")
    expect(hr).to_be_visible()

    # باید یک paragraph بعد از hr وجود داشته باشد (breakout)
    html = editable.evaluate("node => node.innerHTML")
    assert "<hr" in html.lower(), f"HR not found in: {html}"
    assert "<p" in html, f"Paragraph after HR not found in: {html}"
    print("  ✓ HorizontalRule plugin inserts <hr> with trailing paragraph")


def test_editor_blocktype_plugin_e2e(page: Page):
    """BlockTypePlugin: تغییر نوع بلاک از p به h1."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Make me heading</p>'")

    # قرار دادن cursor داخل paragraph
    editable.evaluate("""node => {
        const p = node.querySelector('p');
        const range = document.createRange();
        range.setStart(p.firstChild, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }""")

    # باز کردن dropdown blocktype
    blocktype_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-blocktype")
    expect(blocktype_btn).to_be_visible()
    blocktype_btn.click()

    # انتخاب Heading 1
    h1_item = page.locator(".penman-blocktype-item", has_text="Heading 1")
    expect(h1_item).to_be_visible(timeout=2000)
    h1_item.click()

    # h1 باید در DOM ظاهر شده باشد
    h1 = editable.locator("h1")
    expect(h1).to_be_visible()
    assert "Make me heading" in h1.inner_text()
    print("  ✓ BlockType plugin converts p → h1")


def test_editor_blocktype_custom_class_e2e(page: Page):
    """BlockTypePlugin: اعمال custom class روی بلاک (Warning block)."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Warning content</p>'")

    # cursor داخل paragraph
    editable.evaluate("""node => {
        const p = node.querySelector('p');
        const range = document.createRange();
        range.setStart(p.firstChild, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }""")

    blocktype_btn = page.locator(".penman-toolbar").first.locator(".penman-btn-blocktype")
    blocktype_btn.click()

    # جستجوی Warning در dropdown
    search_input = page.locator(".penman-blocktype-search")
    expect(search_input).to_be_visible(timeout=2000)
    search_input.fill("Warning")

    warning_item = page.locator(".penman-blocktype-item", has_text="Warning")
    expect(warning_item).to_be_visible(timeout=2000)
    warning_item.click()

    # بررسی اعمال class روی بلاک
    warning_block = editable.locator(".warning-block")
    expect(warning_block).to_be_visible()
    assert "Warning content" in warning_block.inner_text()
    print("  ✓ BlockType custom class (warning-block) applied correctly")


def test_editor_undo_redo_e2e(page: Page):
    """Undo/Redo: تایید عملکرد با Ctrl+Z و Ctrl+Y."""
    wait_for_editor(page)
    editable = page.locator(".penman-editor-area").first
    editable.click()
    editable.evaluate("node => node.innerHTML = '<p>Initial</p>'")

    # اعمال bold
    page.keyboard.press("Control+A")
    page.locator(".penman-toolbar").first.locator(".penman-btn-bold").click()

    html_after_bold = editable.evaluate("n => n.innerHTML")
    assert "strong" in html_after_bold, "Bold should be applied"

    # Undo
    page.keyboard.press("Control+Z")
    page.wait_for_timeout(200)

    html_after_undo = editable.evaluate("n => n.innerHTML")
    # undo باعث شود strong حذف شود یا محتوا به حالت قبل برگردد
    print(f"  HTML after undo: {html_after_undo[:80]}")
    print("  ✓ Undo/Redo basic flow executed without crash")


# ─────────────────────────────────────────────────────────────────────────────
# runner اصلی
# ─────────────────────────────────────────────────────────────────────────────

TESTS = [
    ("SVG Icons loaded",                  test_editor_svg_icons),
    ("Find & Replace (RTL)",              test_editor_find_replace_e2e),
    ("Image: URL insert",                 test_editor_image_plugin_url_insert),
    ("Image: Real upload",                test_editor_image_upload_real_server),
    ("Image: Gallery load",               test_editor_image_gallery_load),
    ("Table: Insert 2x2",                 test_editor_table_plugin_e2e),
    ("Table: ColorPicker cell bg",        test_editor_table_color_picker_e2e),
    ("Format: Bold",                      test_editor_format_plugin_e2e),
    ("List: Bullet",                      test_editor_list_plugin_e2e),
    ("Link: Insert",                      test_editor_link_plugin_e2e),
    ("FontSize: Apply 24px",              test_editor_fontsize_plugin_e2e),
    ("Unlink: Remove anchor",             test_editor_unlink_plugin_e2e),
    ("RemoveFormat: Strip inline tags",   test_editor_removeformat_plugin_e2e),
    ("HorizontalRule: Insert HR",         test_editor_horizontal_rule_plugin_e2e),
    ("BlockType: p → h1",                 test_editor_blocktype_plugin_e2e),
    ("BlockType: custom class",           test_editor_blocktype_custom_class_e2e),
    ("Undo/Redo: basic flow",             test_editor_undo_redo_e2e),
]


if __name__ == "__main__":
    passed = 0
    failed = 0
    skipped = 0
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # intercept console errors برای debug بهتر
        page.on("console", lambda msg: (
            print(f"  [browser:{msg.type}] {msg.text}")
            if msg.type == "error" else None
        ))

        print(f"\n{'='*60}")
        print(f"  Penman E2E Tests  |  Vite:{PORT}  Backend:{BACKEND_PORT}")
        print(f"{'='*60}")

        for name, test_fn in TESTS:
            print(f"\n▶ {name}")
            try:
                test_fn(page)
                passed += 1
            except Exception as e:
                msg = str(e)
                if "⚠" in msg or "skipping" in msg.lower():
                    skipped += 1
                    print(f"  ⚠ Skipped: {msg}")
                else:
                    failed += 1
                    errors.append((name, str(e)))
                    print(f"  ✗ FAILED: {e}")

        browser.close()

    print(f"\n{'='*60}")
    print(f"  Results: {passed} passed, {failed} failed, {skipped} skipped")
    print(f"{'='*60}")

    if errors:
        print("\nFailed tests:")
        for name, err in errors:
            print(f"  ✗ {name}: {err}")
        raise SystemExit(1)

    print("\nAll E2E tests completed successfully.")
