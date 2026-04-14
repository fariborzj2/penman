from playwright.sync_api import Page, expect, sync_playwright

def test_editor_svg_icons(page: Page):
  # 1. Navigate to the local dev server
  page.goto("http://localhost:5173")

  # 2. Wait for the toolbar to be ready
  toolbar = page.locator(".penman-toolbar")
  expect(toolbar).to_be_visible()

  # 3. Assert that SVG icons are rendered inside buttons
  bold_btn = page.locator(".penman-btn-bold svg")
  expect(bold_btn).to_be_visible()

  italic_btn = page.locator(".penman-btn-italic svg")
  expect(italic_btn).to_be_visible()

  # 4. Take a screenshot for visual verification
  page.screenshot(path="screenshot.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_editor_svg_icons(page)
      print("Playwright test successfully generated screenshot.png")
    finally:
      browser.close()