import { FloatingUI } from '../ui/FloatingUI.js';

/**
 * SuggestedPostsPlugin
 * Allows users to insert a "Suggested Posts" block into the editor.
 */

function generateId() {
  return 'sp-' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function setupSuggestedPostsPlugin(editor) {
  let items = [];
  let editingId = null;
  let floatingUI = null;
  let currentSelectedBlock = null;
  let editingBlock = null;

  // ── تابع کمکی برای پاکسازی حالت انتخاب ──────────────────────────────────
  function hideToolbar() {
    if (floatingUI) floatingUI.hide();
    currentSelectedBlock = null;
    editor.editableArea.querySelectorAll('.penman-suggested-posts').forEach(el => {
      el.style.outline = 'none';
    });
  }

  // ── ساخت منوی شناور (Floating UI) ─────────────────────────────────────────────
  function createFloatingUI() {
    floatingUI = new FloatingUI(editor, { offset: 10, placement: 'top' });
    const html = `
      <div class="penman-suggested-posts-toolbar" style="background: white; border: 1px solid #e0e0e0; padding: 4px; border-radius: 6px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; direction: rtl;">
        <div class="penman-floating-tail-inner" style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white; z-index: 2;"></div>
        <div class="penman-floating-tail-outer" style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 7px solid #e0e0e0; z-index: 1;"></div>

        <button type="button" class="penman-btn penman-btn-edit-sp" title="Edit" style="padding: 4px; display:flex; align-items:center; color: #111827; background:none; border:none; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-del-sp" title="Delete" style="padding: 4px; display:flex; align-items:center; color: #dc3545; background:none; border:none; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    floatingUI.mount(html);

    const el = floatingUI.element;
    el.querySelector('.penman-btn-edit-sp').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (currentSelectedBlock) editBlock(currentSelectedBlock);
    });

    el.querySelector('.penman-btn-del-sp').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (currentSelectedBlock && currentSelectedBlock.parentNode) {
        currentSelectedBlock.parentNode.removeChild(currentSelectedBlock);
        if (editor.history) editor.history.pushImmediate();
      }
      hideToolbar();
    });
  }

  function editBlock(block) {
    editingBlock = block;
    items = []; 
    const links = block.querySelectorAll('a');
    links.forEach(link => {
      items.push({
        id: generateId(),
        title: link.textContent.trim(),
        url: link.getAttribute('href')
      });
    });
    editingId = null; 
    hideToolbar();
    openModal();
  }

  editor.ui.registry.addButton('suggestedposts', {
    text: 'Suggested posts',
    onAction: () => {
      editingBlock = null;
      items = [];
      openModal();
    },
  });

  editor.editableArea.addEventListener('click', (e) => {
    const block = e.target.closest('.penman-suggested-posts');
    if (block) {
      e.preventDefault(); e.stopPropagation();
      currentSelectedBlock = block;
      if (!floatingUI) createFloatingUI();
      floatingUI.setAnchor(block);
      floatingUI.show();
      
      editor.editableArea.querySelectorAll('.penman-suggested-posts').forEach(el => el.style.outline = 'none');
      block.style.outline = '3px solid #007bff';
    } else {
      hideToolbar();
    }
  });

  editor.editableArea.addEventListener('keydown', hideToolbar);

  // ── مودال (Modal) ─────────────────────────────────────────────────────────
  function openModal() {
    if (editor.selection && typeof editor.selection.save === 'function' && !editingBlock) {
      editor.selection.save();
    }
    const modal = editor.ui.createModal({
      title: 'Suggested content',
      hideFooter: true,
      body: buildModalBody(),
    });
    bindModalEvents(modal.modalElement || modal.element, modal);
  }

  function buildModalBody() {
    return `
      <div class="psp-modal-inner" style="padding: 0 15px 15px; direction: ltr; overflow: auto; max-height: 350px">
        <div id="psp-items-list" style="margin-bottom: 12px;"></div>
        <div class="psp-form" style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-title-input" style="font-size:13px; color:#555;">Post Title</label>
            <input id="psp-title-input" type="text" placeholder="Enter Suggested Post Title" style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit;" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-url-input" style="font-size:13px; color:#555;">Link address (URL)</label>
            <input id="psp-url-input" type="url" placeholder="https://example.com/post" style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit; direction:ltr;" />
          </div>
          <div id="psp-error" style="color:#dc3545; font-size:12px; display:none;"></div>
          <button id="psp-add-btn" type="button" class="penman-btn" style="background:#28a745; color:#fff;">Add link</button>
        </div>
      </div>
      <div class="penman-modal-footer">
        <button class="penman-btn penman-modal-btn-cancel" type="button">Cancel</button>
        <button id="psp-submit-btn" class="penman-btn penman-modal-btn-submit penman-btn-primary" type="button">Confirm</button>
      </div>
    `;
  }

  function renderItemsList(elModal) {
    const listContainer = elModal.querySelector('#psp-items-list');
    if (!listContainer) return;
    if (items.length === 0) { listContainer.innerHTML = ''; return; }

    listContainer.innerHTML = `
      <div style="border:1px solid #E2E8F0; border-radius:6px; overflow:hidden; margin-bottom:4px;">
        <div style="padding:6px 10px; background:#F8FAFC; font-size:12px; color:#64748B; border-bottom:1px solid #E2E8F0;">
          ${items.length} Post(s) added
        </div>
        <ul style="list-style:none; margin:0; padding:0;">
          ${items.map(item => `
            <li data-id="${escapeHtml(item.id)}" style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f0f0f0; font-size:13px;">
              <div style="flex:1; min-width:0; overflow:hidden;">
                <div style="font-weight:500; color:#222; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
                <div style="color:#888; font-size:11px; direction:ltr; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.url)}</div>
              </div>
              <button class="psp-edit-btn" data-id="${escapeHtml(item.id)}" type="button" style="background:none; border:none; cursor:pointer; color:#4285f4;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>
              <button class="psp-delete-btn" data-id="${escapeHtml(item.id)}" type="button" style="background:none; border:none; cursor:pointer; color:#dc3545;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    listContainer.querySelectorAll('.psp-edit-btn').forEach(btn => btn.addEventListener('click', () => startEdit(btn.dataset.id, elModal)));
    listContainer.querySelectorAll('.psp-delete-btn').forEach(btn => btn.addEventListener('click', () => deleteItem(btn.dataset.id, elModal)));
  }

  function bindModalEvents(elModal, modal) {
    renderItemsList(elModal);
    syncAddButton(elModal);

    const urlInput = elModal.querySelector('#psp-url-input');
    const titleInput = elModal.querySelector('#psp-title-input');
    const errorEl = elModal.querySelector('#psp-error');
    const addBtn = elModal.querySelector('#psp-add-btn');

    addBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      const title = titleInput.value.trim();
      if (!url || !title) return showError(errorEl, 'Please fill in both fields.');
      try { new URL(url); } catch (_) { return showError(errorEl, 'The entered URL is invalid.'); }

      hideError(errorEl);
      if (editingId) {
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) items[idx] = { id: editingId, title, url };
        editingId = null;
        addBtn.textContent = 'Add link';
        addBtn.style.background = '#28a745';
      } else {
        items.push({ id: generateId(), title, url });
      }

      urlInput.value = ''; titleInput.value = '';
      renderItemsList(elModal);
      syncAddButton(elModal);
      urlInput.focus();
    });

    elModal.querySelector('#psp-submit-btn').addEventListener('click', () => {
      if (items.length === 0) return showError(errorEl, 'Please add at least one post.');
      insertBlock();
      modal.close();
    });

    elModal.querySelector('.penman-modal-btn-cancel').addEventListener('click', () => modal.close());
  }

  function startEdit(id, elModal) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    const addBtn = elModal.querySelector('#psp-add-btn');
    elModal.querySelector('#psp-url-input').value = item.url;
    elModal.querySelector('#psp-title-input').value = item.title;
    addBtn.textContent = 'Save changes';
    addBtn.style.background = '#fd7e14';
    elModal.querySelector('#psp-url-input').focus();
  }

  function deleteItem(id, elModal) {
    items = items.filter(i => i.id !== id);
    if (editingId === id) {
      editingId = null;
      const addBtn = elModal.querySelector('#psp-add-btn');
      elModal.querySelector('#psp-url-input').value = '';
      elModal.querySelector('#psp-title-input').value = '';
      addBtn.textContent = 'Add link';
      addBtn.style.background = '#28a745';
    }
    renderItemsList(elModal);
    syncAddButton(elModal);
  }

  function syncAddButton(elModal) {
    const btn = elModal.querySelector('#psp-submit-btn');
    if (!btn) return;
    const disabled = items.length === 0;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  function showError(el, msg) { el.textContent = msg; el.style.display = 'block'; }
  function hideError(el) { el.textContent = ''; el.style.display = 'none'; }

  function insertBlock() {
    if (items.length === 0) return;
    const listItems = items.map(item => `
      <li class="penman-suggested-posts-item">
        <a href="${escapeHtml(item.url)}" class="penman-suggested-posts-link" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </li>`).join('');

    const html = `
      <div class="penman-suggested-posts" contenteditable="false">
        <div class="penman-suggested-posts-title">Suggested posts</div>
        <ul class="penman-suggested-posts-list">${listItems}</ul>
      </div>
    `;

    if (editingBlock && editingBlock.parentNode) {
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();
      editingBlock.parentNode.replaceChild(temp.firstChild, editingBlock);
      editingBlock = null; 
    } else {
      if (editor.selection?.restore) editor.selection.restore();
      editor.insertContent(html);
    }
    if (editor.history) editor.history.pushImmediate();
  }
}