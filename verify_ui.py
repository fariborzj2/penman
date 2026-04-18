import os
from playwright.sync_api import Page, expect, sync_playwright

PORT = os.environ.get('VITE_PORT', '5173')
URL = f"http://localhost:{PORT}"

def test_editor_svg_icons(page: Page):
  page.goto(URL)
  toolbar = page.locator(".penman-toolbar")
  expect(toolbar).to_be_visible()
  bold_btn = page.locator(".penman-btn-bold svg")
  expect(bold_btn).to_be_visible()

def test_editor_find_replace_e2e(page: Page):
  page.goto(URL)

  editable = page.locator(".penman-editor-area")
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
  assert "درود دنیا" in content
  assert "درود" in content
  assert "س‌لام" not in content
  assert "سَلام" not in content
  assert "سلام" not in content

def test_editor_image_plugin_e2e(page: Page):
  page.goto(URL)
  editable = page.locator(".penman-editor-area")
  editable.click()

  # Ensure clean slate
  editable.evaluate("node => node.innerHTML = '<p><br></p>'")

  # Open Image Modal
  page.locator(".penman-btn-image").click()
  modal = page.locator(".penman-modal")
  expect(modal).to_be_visible()

  # Test Insert URL
  url_input = page.locator("#penman-image-url-input")
  url_input.fill("https://via.placeholder.com/150")
  page.locator("#penman-image-url-submit").click()

  # Check if figure is inserted
  figure = page.locator(".penman-editor-area figure.penman-image")
  expect(figure).to_be_visible()
  img = figure.locator("img")
  expect(img).to_have_attribute("src", "https://via.placeholder.com/150")

  # Wait a bit for UI to settle
  page.wait_for_timeout(50)

  # Test Image Alignment

  # We can't easily click the exact element since it might be covered or not firing event due to playwright mechanics
  img.click()
  # Wait for UI
  page.wait_for_timeout(200)

  align_center_btn = page.locator(".penman-floating-ui .penman-btn-align-center")
  expect(align_center_btn).to_be_visible()
  align_center_btn.click()

  # Verify alignment class applied to figure
  import re
  expect(figure).to_have_class(re.compile(r"penman-align-center"))

  # Test Image Upload Tab (Using REAL network request to local server)
  page.locator(".penman-btn-image").click()
  page.locator(".penman-image-tab[data-tab='upload']").click()
  upload_input = page.locator("#penman-image-file-input")

  import tempfile
  import re

  # Create a real valid tiny PNG to pass sharp/multer validation if any
  tiny_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82'
  with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
      f.write(tiny_png)
      temp_path = f.name

  try:
      upload_input.set_input_files(temp_path)

      # Wait for the item to appear in the gallery/queue and for real upload to complete
      # The UI shows "SUCCESS" when the upload finishes. There's no specific class, just span text.
      success_indicator = page.locator("span:has-text('SUCCESS')")
      expect(success_indicator).to_be_visible(timeout=5000)

      # Click "Insert"
      page.locator("#penman-image-upload-submit").click()

      # Check if the new image is inserted
      figures = page.locator(".penman-editor-area figure.penman-image")
      expect(figures).to_have_count(2)
      img2 = figures.nth(1).locator("img")
      # Ensure it's a real local server URL
      expect(img2).to_have_attribute("src", re.compile(r"http://localhost:3000/uploads/.*\.png"))
  finally:
      os.remove(temp_path)

  # Test Image Gallery Tab
  # Ensure clean slate again to avoid counting previous images
  editable.evaluate("node => node.innerHTML = '<p><br></p>'")

  page.locator(".penman-btn-image").click()
  page.locator(".penman-image-tab[data-tab='gallery']").click()

  # Wait for gallery items to load from the local backend
  # Look for the div with data-gallery-id which is how items are rendered
  gallery_item = page.locator(".penman-gallery-container div[data-gallery-id]").first
  expect(gallery_item).to_be_visible(timeout=5000)

  # Clicking the gallery item directly inserts it and closes the modal
  gallery_item.click()

  # Verify image insertion from gallery
  gallery_figure = page.locator(".penman-editor-area figure.penman-image")
  expect(gallery_figure).to_be_visible()
  gallery_img = gallery_figure.locator("img")
  expect(gallery_img).to_have_attribute("src", re.compile(r"http://localhost:3000/uploads/.*\.png"))

def test_editor_table_plugin_e2e(page: Page):
  page.goto(URL)
  editable = page.locator(".penman-editor-area")
  editable.click()

  editable.evaluate("node => node.innerHTML = '<p><br></p>'")

  # Insert Table
  page.locator(".penman-btn-table").click()

  # Click the 2x2 cell
  cell = page.locator(".penman-grid-cell[data-row='2'][data-col='2']")
  expect(cell).to_be_visible()
  cell.click()

  table = page.locator(".penman-editor-area table")
  expect(table).to_be_visible()

  # Verify rows and cols
  rows = table.locator("tr")
  expect(rows).to_have_count(2)
  first_row_cells = rows.nth(0).locator("td")
  expect(first_row_cells).to_have_count(2)

  # Test Table Operations: Merge Cells
  # 1. Select two cells
  cell1 = first_row_cells.nth(0)
  cell2 = first_row_cells.nth(1)

  # We can't easily drag in playwright for this custom logic, so let's programmatically trigger the selection
  editable.evaluate("""node => {
      const editor = window.penman.get('#myTextarea');
      const table = node.querySelector('table');
      const cells = table.querySelectorAll('td');
      editor.tableSelectionManager.selectRange(table, cells[0].getAttribute('data-cell-id'), cells[1].getAttribute('data-cell-id'));
  }""")

  page.wait_for_timeout(50)

  # Click merge button on floating toolbar
  merge_btn = page.locator(".penman-floating-ui .penman-btn-merge-cells")
  expect(merge_btn).to_be_visible()
  merge_btn.click()

  # Verify merge (1 cell in first row, colspan 2)
  expect(rows.nth(0).locator("td")).to_have_count(1)
  expect(rows.nth(0).locator("td").first).to_have_attribute("colspan", "2")

  # Test Table Operations: Split Cells
  # Select the merged cell
  editable.evaluate("""node => {
      const editor = window.penman.get('#myTextarea');
      const table = node.querySelector('table');
      const cells = table.querySelectorAll('td');
      editor.tableSelectionManager.selectCell(table, cells[0].getAttribute('data-cell-id'));
  }""")

  page.wait_for_timeout(50)

  split_btn = page.locator(".penman-floating-ui .penman-btn-split-cell")
  expect(split_btn).to_be_visible()
  split_btn.click()

  # Verify split (2 cells in first row again)
  expect(rows.nth(0).locator("td")).to_have_count(2)
  expect(rows.nth(0).locator("td").first).not_to_have_attribute("colspan", "2")

  # Test Table Operations: Add Row below
  editable.evaluate("""node => {
      const editor = window.penman.get('#myTextarea');
      const table = node.querySelector('table');
      const cells = table.querySelectorAll('td');
      editor.tableSelectionManager.selectCell(table, cells[0].getAttribute('data-cell-id'));
  }""")
  page.wait_for_timeout(50)

  add_row_btn = page.locator(".penman-floating-ui .penman-btn-add-row")
  expect(add_row_btn).to_be_visible()
  add_row_btn.click()

  expect(table.locator("tr")).to_have_count(3)

  # Test Table Operations: Remove Row
  remove_row_btn = page.locator(".penman-floating-ui .penman-btn-remove-row")
  expect(remove_row_btn).to_be_visible()
  remove_row_btn.click()

  expect(table.locator("tr")).to_have_count(2)

  # Test Table Background Color using Standalone ColorPicker

  # Before setting color, we need to ensure a cell is selected via the TableSelectionManager
  editable.evaluate("""node => {
      const editor = window.penman.get('#myTextarea');
      const table = node.querySelector('table');
      const cells = table.querySelectorAll('td');
      editor.tableSelectionManager.selectCell(table, cells[0].getAttribute('data-cell-id'));
  }""")
  page.wait_for_timeout(50)

  # Open background color picker
  bg_color_trigger = page.locator(".penman-floating-ui .penman-btn-bg-color-trigger")
  expect(bg_color_trigger).to_be_visible()
  bg_color_trigger.click()

  # Ensure the standalone ColorPicker popup appears
  color_picker_container = page.locator(".penman-color-picker-container")
  expect(color_picker_container).to_be_visible()

  # Hex input should exist
  hex_input = color_picker_container.locator("input[type='text']")
  expect(hex_input).to_be_visible()

  # Fill the hex value. Note that it triggers update on final event (Enter key)
  hex_input.fill("#ff0000")
  page.keyboard.press("Enter")

  # Wait for DOM to update
  page.wait_for_timeout(50)

  # Verify the selected cell background color changed
  expect(table.locator("td").first).to_have_css("background-color", "rgb(255, 0, 0)")

def test_editor_new_plugins_e2e(page: Page):
  page.goto(URL)
  editable = page.locator(".penman-editor-area")
  editable.click()
  editable.evaluate("node => node.innerHTML = '<p>Test text <a href=\"#\">with link</a></p>'")

  # 1. Test Font Size Plugin
  # Select all
  page.keyboard.press("Control+A")

  fontsize_dropdown = page.locator(".penman-btn-fontsize")
  expect(fontsize_dropdown).to_be_visible()
  fontsize_dropdown.click()

  # Select 24px
  # The classes are .penman-fontsize-list and .penman-fontsize-item
  page.locator(".penman-fontsize-list .penman-fontsize-item:has-text('24px')").click()

  # Verify font size wrapper
  expect(editable.locator("span").first).to_have_css("font-size", "24px")

  # 2. Test Remove Format Plugin
  # Select all again
  page.keyboard.press("Control+A")

  removeformat_btn = page.locator(".penman-btn-removeformat")
  expect(removeformat_btn).to_be_visible()
  removeformat_btn.click()

  # Verify span is removed (format cleared)
  expect(editable.locator("span")).to_have_count(0)

  # Before proceeding, we need to recreate the link since it might have been cleared by Remove Format if selection wasn't exact.
  # Let's just make sure we have a link to test.
  editable.evaluate("node => node.innerHTML = '<p>Test text <a href=\"#\">with link</a></p>'")

  # 3. Test Unlink Plugin
  # Click inside the link
  editable.evaluate("""node => {
    const a = node.querySelector('a');
    const range = document.createRange();
    range.setStart(a.firstChild, 1);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }""")

  unlink_btn = page.locator(".penman-btn-unlink")
  expect(unlink_btn).to_be_visible()
  unlink_btn.click()

  # Verify link is removed but text remains
  expect(editable.locator("a")).to_have_count(0)
  expect(editable).to_contain_text("Test text with link")

  # 4. Test Horizontal Rule Plugin
  hr_btn = page.locator(".penman-btn-hr")
  expect(hr_btn).to_be_visible()
  hr_btn.click()

  expect(editable.locator("hr")).to_be_visible()

  # 5. Test Block Type Plugin
  # Select paragraph text
  editable.evaluate("""node => {
    const p = node.querySelector('p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }""")

  blocktype_dropdown = page.locator(".penman-btn-blocktype")
  expect(blocktype_dropdown).to_be_visible()
  blocktype_dropdown.click()

  # Select Warning block type (from config)
  # The classes are .penman-blocktype-list and .penman-blocktype-item
  page.locator(".penman-blocktype-list .penman-blocktype-item:has-text('Warning')").click()

  # Verify div with class warning-block is created
  expect(editable.locator("div.warning-block")).to_be_visible()

def test_editor_format_plugin_e2e(page: Page):
  page.goto(URL)
  editable = page.locator(".penman-editor-area")
  editable.click()
  editable.evaluate("node => node.innerHTML = '<p>Test text</p>'")

  # Select text and apply bold
  page.keyboard.press("Control+A")
  page.locator(".penman-btn-bold").click()

  # CommandManager normalizes 'b' to 'strong'
  expect(editable.locator("strong")).to_be_visible()

def test_editor_list_plugin_e2e(page: Page):
  page.goto(URL)
  editable = page.locator(".penman-editor-area")
  editable.click()
  editable.evaluate("node => node.innerHTML = '<p>List item 1</p>'")

  # Select the text explicitly to ensure the range is correctly set
  editable.evaluate("""node => {
    const range = document.createRange();
    range.selectNodeContents(node.querySelector('p'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }""")

  # Apply bullet list
  page.locator(".penman-btn-bullist").click()

  expect(editable.locator("ul")).to_be_visible()
  expect(editable.locator("ul > li")).to_have_text("List item 1")

def test_editor_link_plugin_e2e(page: Page):
  page.goto(URL)
  editable = page.locator(".penman-editor-area")
  editable.click()
  editable.evaluate("node => node.innerHTML = '<p>Link me</p>'")

  page.keyboard.press("Control+A")
  page.locator(".penman-btn-link").click()

  modal = page.locator(".penman-modal")
  expect(modal).to_be_visible()

  page.locator("#penman-link-url").fill("https://example.com")
  page.locator(".penman-modal-btn-submit").click()

  link = editable.locator("a")
  expect(link).to_be_visible()
  expect(link).to_have_attribute("href", "https://example.com")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_editor_svg_icons(page)
      test_editor_find_replace_e2e(page)
      test_editor_image_plugin_e2e(page)
      test_editor_table_plugin_e2e(page)
      test_editor_new_plugins_e2e(page)
      test_editor_format_plugin_e2e(page)
      test_editor_list_plugin_e2e(page)
      test_editor_link_plugin_e2e(page)
      print("Playwright E2E tests passed successfully. Full integrations validated.")
    finally:
      browser.close()
