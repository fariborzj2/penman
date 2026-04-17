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

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_editor_svg_icons(page)
      test_editor_find_replace_e2e(page)
      test_editor_image_plugin_e2e(page)
      test_editor_table_plugin_e2e(page)
      print("Playwright E2E tests passed successfully. Full integrations validated.")
    finally:
      browser.close()
