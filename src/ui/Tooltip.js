/**
 * Tooltip — a single, styled popover shared across all triggers on the page.
 *
 * Buttons opt in by setting `data-tooltip="..."` (and optionally
 * `data-tooltip-placement="top|bottom"`). One global delegated listener
 * watches the document, so adding new buttons later "just works".
 *
 * Behaviour:
 *   - Shows after a short hover delay (default 250ms) to avoid flicker
 *     when the cursor passes through a toolbar.
 *   - Hides instantly on mouseleave, click, scroll, blur, or Escape.
 *   - Themed via CSS variables, so it follows the editor's light/dark mode.
 *   - Positions itself above the trigger when there's room, else below.
 *   - Direction-aware: tooltip text aligns with the editor's `dir`.
 *
 * Usage:
 *   import { Tooltip } from './Tooltip.js';
 *   Tooltip.install();  // idempotent — safe to call from every editor
 *
 *   // Then any element with data-tooltip becomes a trigger:
 *   button.dataset.tooltip = 'Insert link';
 *   button.dataset.tooltipShortcut = 'Ctrl+K';   // optional secondary line
 */
const SHOW_DELAY = 250;
const ARROW_SIZE = 6;
const GAP = 8;             // px between tooltip and trigger
const VIEWPORT_PAD = 4;    // px from viewport edge

let installed = false;
let bubbleEl = null;
let arrowEl = null;
let textEl = null;
let shortcutEl = null;

let currentTarget = null;
let showTimer = null;

function injectStyles() {
  // Styles live in penman-ui.css; this is a no-op kept as a hook in case
  // we ever need fallback inline CSS for environments without the stylesheet.
}

function buildBubble() {
  bubbleEl = document.createElement('div');
  bubbleEl.className = 'penman-tooltip';
  bubbleEl.setAttribute('role', 'tooltip');
  bubbleEl.setAttribute('aria-hidden', 'true');

  textEl = document.createElement('span');
  textEl.className = 'penman-tooltip-text';
  bubbleEl.appendChild(textEl);

  shortcutEl = document.createElement('span');
  shortcutEl.className = 'penman-tooltip-shortcut';
  shortcutEl.hidden = true;
  bubbleEl.appendChild(shortcutEl);

  arrowEl = document.createElement('div');
  arrowEl.className = 'penman-tooltip-arrow';
  bubbleEl.appendChild(arrowEl);

  document.body.appendChild(bubbleEl);
}

function findTrigger(el) {
  if (!el || el.nodeType !== 1) return null;
  return el.closest && el.closest('[data-tooltip]');
}

function show(target) {
  if (!bubbleEl) buildBubble();

  const label = target.getAttribute('data-tooltip');
  if (!label) return;

  const shortcut = target.getAttribute('data-tooltip-shortcut');
  textEl.textContent = label;
  if (shortcut) {
    shortcutEl.textContent = shortcut;
    shortcutEl.hidden = false;
  } else {
    shortcutEl.textContent = '';
    shortcutEl.hidden = true;
  }

  // Pick up direction from the nearest editor wrapper (or the trigger itself).
  const dirHost = target.closest('[dir]') || document.documentElement;
  bubbleEl.setAttribute('dir', dirHost.getAttribute('dir') || 'ltr');

  // Render off-screen so we can measure.
  bubbleEl.style.left = '0';
  bubbleEl.style.top  = '0';
  bubbleEl.classList.add('penman-tooltip--visible');
  bubbleEl.setAttribute('aria-hidden', 'false');

  const triggerRect = target.getBoundingClientRect();
  const tipRect = bubbleEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const preferred = target.getAttribute('data-tooltip-placement') || 'top';
  let placement = preferred;

  // Vertical: prefer above; fall back to below if no room above.
  if (placement === 'top' && triggerRect.top - tipRect.height - GAP - ARROW_SIZE < 0) {
    placement = 'bottom';
  } else if (placement === 'bottom'
        && triggerRect.bottom + tipRect.height + GAP + ARROW_SIZE > vh) {
    placement = 'top';
  }

  // Horizontal centering, clamped to viewport.
  const centerX = triggerRect.left + (triggerRect.width / 2);
  let left = centerX - (tipRect.width / 2);
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tipRect.width - VIEWPORT_PAD));

  let top;
  if (placement === 'top') {
    top = triggerRect.top - tipRect.height - GAP;
  } else {
    top = triggerRect.bottom + GAP;
  }

  // Place arrow at the horizontal center of the trigger, relative to bubble.
  const arrowOffset = Math.max(8, Math.min(tipRect.width - 8, centerX - left));
  arrowEl.style.left = `${arrowOffset}px`;

  bubbleEl.dataset.placement = placement;
  bubbleEl.style.left = `${Math.round(left + window.scrollX)}px`;
  bubbleEl.style.top  = `${Math.round(top + window.scrollY)}px`;
}

function hide() {
  if (!bubbleEl) return;
  bubbleEl.classList.remove('penman-tooltip--visible');
  bubbleEl.setAttribute('aria-hidden', 'true');
  currentTarget = null;
}

function clearTimer() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function onPointerEnter(e) {
  const trigger = findTrigger(e.target);
  if (!trigger) return;
  if (trigger === currentTarget) return;
  clearTimer();
  currentTarget = trigger;
  showTimer = setTimeout(() => {
    if (currentTarget === trigger) show(trigger);
  }, SHOW_DELAY);
}

function onPointerLeave(e) {
  const trigger = findTrigger(e.target);
  if (!trigger) return;
  // If the user is moving to a child, ignore.
  if (e.relatedTarget && trigger.contains(e.relatedTarget)) return;
  clearTimer();
  hide();
}

function onFocusIn(e) {
  // Keyboard focus also shows the tooltip — accessibility win.
  const trigger = findTrigger(e.target);
  if (!trigger) return;
  clearTimer();
  currentTarget = trigger;
  show(trigger);
}

function onFocusOut(e) {
  const trigger = findTrigger(e.target);
  if (!trigger) return;
  hide();
}

function onClick(e) {
  // Clicking a trigger should dismiss the tooltip so it doesn't sit over
  // a modal/dropdown that the click might open.
  if (findTrigger(e.target)) hide();
}

function onScrollOrResize() {
  hide();
}

function onKeydown(e) {
  if (e.key === 'Escape') hide();
}

export const Tooltip = {
  /**
   * Install the global tooltip listener. Idempotent — calling multiple times
   * from different editor instances is safe; only the first call binds.
   */
  install() {
    if (installed || typeof document === 'undefined') return;
    installed = true;
    injectStyles();

    document.addEventListener('mouseover', onPointerEnter, true);
    document.addEventListener('mouseout',  onPointerLeave, true);
    document.addEventListener('focusin',   onFocusIn,      true);
    document.addEventListener('focusout',  onFocusOut,     true);
    document.addEventListener('click',     onClick,        true);
    document.addEventListener('keydown',   onKeydown,      true);
    window.addEventListener('scroll',  onScrollOrResize, true);
    window.addEventListener('resize',  onScrollOrResize);
  },

  /** Force-hide the tooltip (e.g., before opening a modal). */
  hide,

  /** For tests only. Returns whether the global listener is installed. */
  _isInstalled() { return installed; }
};
