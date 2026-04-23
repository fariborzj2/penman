/**
 * SuggestedPostsPlugin
 * Allows users to insert a "Suggested Posts" block into the editor.
 * Follows existing plugin architecture patterns.
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
  // ── Plugin-level state ───────────────────────────────────────────────────
  // State is kept at plugin scope so it survives modal open/close
  let items = [];       // Array of { id, title, url }
  let editingId = null; // id of item currently being edited, or null

  // ── Toolbar button ────────────────────────────────────────────────────────
  editor.ui.registry.addButton('suggestedposts', {
    text: 'مطالب پیشنهادی',
    onAction: () => openModal(),
  });

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal() {
    // Save selection so we know where to insert later
    if (editor.selection && typeof editor.selection.save === 'function') {
      editor.selection.save();
    }

    const modal = editor.ui.createModal({
      title: 'Suggested content',
      hideFooter: true,
      body: buildModalBody(),
    });

    const elModal = modal.modalElement || modal.element;

    // Bootstrap internal references
    bindModalEvents(elModal, modal);
  }

  // ── Build modal HTML ──────────────────────────────────────────────────────
  function buildModalBody() {
    return `
      <div class="psp-modal-inner" style="padding: 0 15px 15px; direction: ltr; overflow: auto; max-height: 350px">

        <!-- Items list (rendered dynamically) -->
        <div id="psp-items-list" style="margin-bottom: 12px;"></div>

        <!-- Form -->
        <div class="psp-form" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-url-input" style="font-size:13px; color:#555;">Link address (URL)</label>
            <input
              id="psp-url-input"
              type="url"
              placeholder="https://example.com/post"
              style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit; direction:ltr;"
            />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-title-input" style="font-size:13px; color:#555;">Article title</label>
            <input
              id="psp-title-input"
              type="text"
              placeholder="Enter the title of the proposed article."
              style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit;"
            />
          </div>
          <div id="psp-error" style="color:#dc3545; font-size:12px; display:none;"></div>
          <button
            id="psp-add-btn"
            type="button" class="penman-btn" style="background:#28a745; color:#fff;">Add link</button>
        </div>

      </div>

        <!-- Footer actions -->
      <div class="penman-modal-footer">
          <button id="psp-cancel-btn" type="button" class="penman-btn">Cancel</button>
          <button id="psp-submit-btn" type="button" class="penman-btn penman-btn-primary">insert</button>
      </div>
    `;
  }

  // ── Render items list inside modal ────────────────────────────────────────
  function renderItemsList(elModal) {
    const listContainer = elModal.querySelector('#psp-items-list');
    if (!listContainer) return;

    if (items.length === 0) {
      listContainer.innerHTML = '';
      return;
    }

    listContainer.innerHTML = `
      <div style="border:1px solid #E2E8F0; border-radius:6px; overflow:hidden; margin-bottom:4px;">
        <div style="padding:6px 10px; background:#F8FAFC; font-size:12px; color:#64748B; border-bottom:1px solid #E2E8F0;">
          ${items.length} مطلب اضافه شده
        </div>
        <ul style="list-style:none; margin:0; padding:0;">
          ${items.map(item => `
            <li data-id="${escapeHtml(item.id)}"
              style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f0f0f0; font-size:13px;">
              <div style="flex:1; min-width:0; overflow:hidden;">
                <div style="font-weight:500; color:#222; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escapeHtml(item.title)}
                </div>
                <div style="color:#888; font-size:11px; direction:ltr; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escapeHtml(item.url)}
                </div>
              </div>
              <button class="psp-edit-btn" data-id="${escapeHtml(item.id)}" type="button"
                title="Edite"
                style="background:none; border:none; cursor:pointer; padding:4px; color:#4285f4; font-size:16px; line-height:1; flex-shrink:0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button class="psp-delete-btn" data-id="${escapeHtml(item.id)}" type="button"
                title="Remove"
                style="background:none; border:none; cursor:pointer; padding:4px; color:#dc3545; font-size:16px; line-height:1; flex-shrink:0;">
                  <svg  width="18" height="18" viewBox="0 0 24 24" fill="none"  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    // Bind edit/delete actions
    listContainer.querySelectorAll('.psp-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.id, elModal));
    });
    listContainer.querySelectorAll('.psp-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteItem(btn.dataset.id, elModal));
    });
  }

  // ── Bind modal interactivity ───────────────────────────────────────────────
  function bindModalEvents(elModal, modal) {
    // Initial render
    renderItemsList(elModal);
    syncAddButton(elModal);

    const urlInput   = elModal.querySelector('#psp-url-input');
    const titleInput = elModal.querySelector('#psp-title-input');
    const errorEl    = elModal.querySelector('#psp-error');
    const addBtn     = elModal.querySelector('#psp-add-btn');
    const submitBtn  = elModal.querySelector('#psp-submit-btn');
    const cancelBtn  = elModal.querySelector('#psp-cancel-btn');

    // ── Add / Save-edit ────────────────────────────────────────────────────
    addBtn.addEventListener('click', () => {
      const url   = urlInput.value.trim();
      const title = titleInput.value.trim();

      if (!url || !title) {
        showError(errorEl, 'لطفاً هر دو فیلد را پر کنید.');
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch (_) {
        showError(errorEl, 'آدرس URL وارد شده معتبر نیست.');
        return;
      }

      hideError(errorEl);

      if (editingId) {
        // Replace existing item
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) {
          items[idx] = { id: editingId, title, url };
        }
        editingId = null;
        addBtn.textContent = 'insert';
        addBtn.style.background = '#4285f4';
      } else {
        // Add new item
        items.push({ id: generateId(), title, url });
      }

      urlInput.value   = '';
      titleInput.value = '';
      renderItemsList(elModal);
      syncAddButton(elModal);
      urlInput.focus();
    });

    // Allow Enter key in inputs to trigger add
    [urlInput, titleInput].forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addBtn.click();
        }
      });
    });

    // ── Final submit ───────────────────────────────────────────────────────
    submitBtn.addEventListener('click', () => {
      if (items.length === 0) {
        showError(errorEl, 'حداقل یک مطلب اضافه کنید.');
        return;
      }
      insertBlock();
      // Reset state for next use
      items    = [];
      editingId = null;
      modal.close();
    });

    // ── Cancel ─────────────────────────────────────────────────────────────
    cancelBtn.addEventListener('click', () => {
      // Reset edit mode but keep items for now (user may reopen)
      editingId = null;
      modal.close();
    });
  }

  // ── Edit an existing item ─────────────────────────────────────────────────
  function startEdit(id, elModal) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    editingId = id;

    const urlInput   = elModal.querySelector('#psp-url-input');
    const titleInput = elModal.querySelector('#psp-title-input');
    const addBtn     = elModal.querySelector('#psp-add-btn');
    const errorEl    = elModal.querySelector('#psp-error');

    urlInput.value   = item.url;
    titleInput.value = item.title;
    addBtn.textContent = 'ذخیره تغییرات';
    addBtn.style.background = '#fd7e14';
    hideError(errorEl);
    urlInput.focus();
  }

  // ── Delete an item ────────────────────────────────────────────────────────
  function deleteItem(id, elModal) {
    items = items.filter(i => i.id !== id);

    // If we were editing this item, cancel edit mode
    if (editingId === id) {
      editingId = null;
      const urlInput   = elModal.querySelector('#psp-url-input');
      const titleInput = elModal.querySelector('#psp-title-input');
      const addBtn     = elModal.querySelector('#psp-add-btn');
      if (urlInput)   urlInput.value   = '';
      if (titleInput) titleInput.value = '';
      if (addBtn) {
        addBtn.textContent = 'insert';
        addBtn.style.background = '#4285f4';
      }
    }

    renderItemsList(elModal);
    syncAddButton(elModal);
  }

  // ── Sync submit-btn disabled state ────────────────────────────────────────
  function syncAddButton(elModal) {
    const submitBtn = elModal.querySelector('#psp-submit-btn');
    if (!submitBtn) return;
    submitBtn.disabled = items.length === 0;
    submitBtn.style.opacity = items.length === 0 ? '0.5' : '1';
    submitBtn.style.cursor  = items.length === 0 ? 'not-allowed' : 'pointer';
  }

  // ── Error helpers ─────────────────────────────────────────────────────────
  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
  function hideError(el) {
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
  }

  // ── Build & insert HTML block ─────────────────────────────────────────────
  function insertBlock() {
    if (items.length === 0) return;

    const listItems = items.map(item => `
      <li style="margin:0 0 6px 0; padding:0;">
        <a href="${escapeHtml(item.url)}"
           style="color:#0052cc; text-decoration:none; font-size:14px; line-height:1.5;"
           target="_blank"
           rel="noopener noreferrer">
          ${escapeHtml(item.title)}
        </a>
      </li>
    `).join('');

    const html = `
      <div class="penman-suggested-posts"
           style="border:1px solid #E2E8F0; border-radius:6px; padding:12px 16px; margin:12px 0; background:#F8FAFC; direction:ltr;">
        <div style="font-size:13px; font-weight:700; color:#374151; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #E2E8F0;">
          مطالب پیشنهادی
        </div>
        <ul style="list-style:none; margin:0; padding:0;">
          ${listItems}
        </ul>
      </div>
    `;

    if (editor.selection && typeof editor.selection.restore === 'function') {
      editor.selection.restore();
    }

    editor.insertContent(html);
  }
}