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
  editable.fill("This is a strict test. We need to replace the word strict safely. Very strict!")

  page.keyboard.press("Control+f")

  modal = page.locator(".penman-modal")
  expect(modal).to_be_visible()

  page.locator("#fr-find").fill("strict")
  page.locator("#fr-replace").fill("awesome")

  page.locator("#fr-btn-find").click()
  page.locator("#fr-btn-replace-all").click()

  content = editable.inner_text()
  assert "awesome" in content
  assert "strict" not in content

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_editor_svg_icons(page)
      test_editor_find_replace_e2e(page)
      print("Playwright E2E tests passed successfully.")
    finally:
      browser.close()
