import { FloatingUI } from '../ui/FloatingUI.js';

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
  // ── وضعیت‌های سطح پلاگین ───────────────────────────────────────────────────
  let items = [];
  let editingId = null;
  let floatingUI = null;
  let currentSelectedBlock = null;
  let editingBlock = null;

  // ── ساخت منوی شناور (Floating UI) ─────────────────────────────────────────────
  function createFloatingUI() {
    floatingUI = new FloatingUI(editor, { offset: 10, placement: 'top' });
    const html = `
      <div class="penman-suggested-posts-toolbar" style="background: white; border: 1px solid #e0e0e0; padding: 4px; border-radius: 6px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; direction: rtl;">
        <div class="penman-floating-tail-inner" style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white; z-index: 2;"></div>
        <div class="penman-floating-tail-outer" style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 7px solid #e0e0e0; z-index: 1;"></div>

        <button type="button" class="penman-btn penman-btn-edit-sp" title="Edite" style="padding: 4px; display:flex; align-items:center; color: #111827; background:none; border:none; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-del-sp" title="Delete" style="padding: 4px; display:flex; align-items:center; color: #dc3545; background:none; border:none; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    floatingUI.mount(html);

    const el = floatingUI.element;
    const editBtn = el.querySelector('.penman-btn-edit-sp');
    const delBtn = el.querySelector('.penman-btn-del-sp');

    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentSelectedBlock) {
        editBlock(currentSelectedBlock);
      }
    });

    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentSelectedBlock && currentSelectedBlock.parentNode) {
        currentSelectedBlock.parentNode.removeChild(currentSelectedBlock);
        if (editor.history) editor.history.pushImmediate();
      }
      if (floatingUI) floatingUI.hide();
      currentSelectedBlock = null;
    });
  }

  // ── تابع ویرایش بلاک موجود ─────────────────────────────────────────────
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

    if (floatingUI) floatingUI.hide();
    openModal();
  }

  // ── دکمه در تولبار ────────────────────────────────────────────────────────
  editor.ui.registry.addButton('suggestedposts', {
    text: 'Suggested posts',
    onAction: () => {
      editingBlock = null;
      items = []; // پاک کردن آیتم‌ها برای بلاک جدید
      openModal();
    },
  });

  // ── مدیریت کلیک روی ادیتور (نمایش منوی شناور) ──────────────────────────────────
  editor.editableArea.addEventListener('click', (e) => {
    const block = e.target.closest('.penman-suggested-posts');
    if (block) {
      e.preventDefault();
      e.stopPropagation();

      currentSelectedBlock = block;
      if (!floatingUI) createFloatingUI();
      floatingUI.setAnchor(block);
      floatingUI.show();
      
      // حذف هایلایت از بقیه
      editor.editableArea.querySelectorAll('.penman-suggested-posts').forEach(el => {
        el.style.outline = 'none';
      });
      // هایلایت بلاک فعلی
      block.style.outline = '3px solid #007bff';
    } else {
      if (floatingUI) floatingUI.hide();
      currentSelectedBlock = null;
      editor.editableArea.querySelectorAll('.penman-suggested-posts').forEach(el => {
        el.style.outline = 'none';
      });
    }
  });

  editor.editableArea.addEventListener('keydown', () => {
    if (floatingUI) floatingUI.hide();
    currentSelectedBlock = null;
    editor.editableArea.querySelectorAll('.penman-suggested-posts').forEach(el => {
      el.style.outline = 'none';
    });
  });

  // ── مودال (Modal) ─────────────────────────────────────────────────────────
  function openModal() {
    if (editor.selection && typeof editor.selection.save === 'function' && !editingBlock) {
      editor.selection.save();
    }

    const modal = editor.ui.createModal({
      title: 'مطالب پیشنهادی',
      hideFooter: true,
      body: buildModalBody(),
    });

    const elModal = modal.modalElement || modal.element;
    bindModalEvents(elModal, modal);
  }

  function buildModalBody() {
    return `
      <div class="psp-modal-inner" style="padding: 0 15px 15px; min-width: 420px; direction: rtl;">

        <!-- Items list (rendered dynamically) -->
        <div id="psp-items-list" style="margin-bottom: 12px;"></div>

        <div class="psp-form" style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-title-input" style="font-size:13px; color:#555;">Post Title</label>
            <input
              id="psp-title-input"
              type="text"
              placeholder="Enter Suggested Post Title"
              style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit;"
            />
          </div>

          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-url-input" style="font-size:13px; color:#555;">آدرس لینک (URL)</label>
            <input
              id="psp-url-input"
              type="url"
              placeholder="https://example.com/post"
              style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit; direction:ltr;"
            />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label for="psp-title-input" style="font-size:13px; color:#555;">عنوان مطلب</label>
            <input
              id="psp-title-input"
              type="text"
              placeholder="عنوان مطلب پیشنهادی را بنویسید"
              style="padding:7px 10px; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit;"
            />
          </div>
          <div id="psp-error" style="color:#dc3545; font-size:12px; display:none;"></div>
          <button
            id="psp-add-btn"
            type="button"
            style="align-self:flex-start; padding:7px 18px; background:#4285f4; color:#fff; border:none; border-radius:4px; font-size:14px; font-family:inherit; cursor:pointer;"
          >افزودن</button>
        </div>

        <!-- Footer actions -->
        <div style="border-top:1px solid #E2E8F0; padding-top:12px; display:flex; justify-content:flex-end; gap:8px;">
          <button id="psp-cancel-btn" type="button"
            style="padding:7px 16px; background:#fff; color:#555; border:1px solid #ccc; border-radius:4px; font-size:14px; font-family:inherit; cursor:pointer;"
          >انصراف</button>
          <button id="psp-submit-btn" type="button"
            style="padding:7px 18px; background:#28a745; color:#fff; border:none; border-radius:4px; font-size:14px; font-family:inherit; cursor:pointer;"
          >ثبت نهایی</button>
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

    if (items.length === 0) {
      listContainer.innerHTML = '';
      return;
    }

    listContainer.innerHTML = `
      <div style="border:1px solid #E2E8F0; border-radius:6px; overflow:hidden; margin-bottom:4px;">
        <div style="padding:6px 10px; background:#F8FAFC; font-size:12px; color:#64748B; border-bottom:1px solid #E2E8F0;">
          ${items.length} Post added
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
                title="ویرایش"
                style="background:none; border:none; cursor:pointer; padding:4px; color:#4285f4; font-size:16px; line-height:1; flex-shrink:0;">✏️</button>
              <button class="psp-delete-btn" data-id="${escapeHtml(item.id)}" type="button"
                title="حذف"
                style="background:none; border:none; cursor:pointer; padding:4px; color:#dc3545; font-size:16px; line-height:1; flex-shrink:0;">🗑</button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    listContainer.querySelectorAll('.psp-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.id, elModal));
    });
    listContainer.querySelectorAll('.psp-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteItem(btn.dataset.id, elModal));
    });
  }

  function bindModalEvents(elModal, modal) {
    renderItemsList(elModal);
    syncAddButton(elModal);

    const urlInput   = elModal.querySelector('#psp-url-input');
    const titleInput = elModal.querySelector('#psp-title-input');
    const errorEl    = elModal.querySelector('#psp-error');
    const addBtn     = elModal.querySelector('#psp-add-btn');
    const submitBtn  = elModal.querySelector('#psp-submit-btn');

    addBtn.addEventListener('click', () => {
      const url   = urlInput.value.trim();
      const title = titleInput.value.trim();

      if (!url || !title) {
        showError(errorEl, 'Please fill in both fields.');
        return;
      }

      try {
        new URL(url);
      } catch (_) {
        showError(errorEl, 'The entered URL is invalid.');
        return;
      }

      hideError(errorEl);

      if (editingId) {
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) {
          items[idx] = { id: editingId, title, url };
        }
        editingId = null;
        addBtn.textContent = 'افزودن';
        addBtn.style.background = '#4285f4';
      } else {
        items.push({ id: generateId(), title, url });
      }

      urlInput.value   = '';
      titleInput.value = '';
      renderItemsList(elModal);
      syncAddButton(elModal);
      urlInput.focus();
    });

    [urlInput, titleInput].forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addBtn.click();
        }
      });
    });

    submitBtn.addEventListener('click', () => {
      if (items.length === 0) {
        showError(errorEl, 'Please add at least one post.');
        return;
      }
      insertBlock();
      items    = [];
      editingId = null;
      modal.close();
    });
  }

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
    addBtn.textContent = 'Save changes';
    addBtn.style.background = '#fd7e14';
    hideError(errorEl);
    urlInput.focus();
  }

  function deleteItem(id, elModal) {
    items = items.filter(i => i.id !== id);

    if (editingId === id) {
      editingId = null;
      const urlInput   = elModal.querySelector('#psp-url-input');
      const titleInput = elModal.querySelector('#psp-title-input');
      const addBtn     = elModal.querySelector('#psp-add-btn');
      if (urlInput)   urlInput.value   = '';
      if (titleInput) titleInput.value = '';
      if (addBtn) {
        addBtn.textContent = 'افزودن';
        addBtn.style.background = '#4285f4';
      }
    }

    renderItemsList(elModal);
    syncAddButton(elModal);
  }

  function syncAddButton(elModal) {
    const submitBtn = elModal.querySelector('#psp-submit-btn');
    if (!submitBtn) return;
    submitBtn.disabled = items.length === 0;
    submitBtn.style.opacity = items.length === 0 ? '0.5' : '1';
    submitBtn.style.cursor  = items.length === 0 ? 'not-allowed' : 'pointer';
  }

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

  // ── درج یا جایگزینی بلاک HTML ─────────────────────────────────────────────
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

    // استفاده از contenteditable="false" برای یکپارچگی بلاک
    const html = `
      <div class="penman-suggested-posts"
           style="border:1px solid #E2E8F0; border-radius:6px; padding:12px 16px; margin:12px 0; background:#F8FAFC; direction:rtl;">
        <div style="font-size:13px; font-weight:700; color:#374151; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #E2E8F0;">
          مطالب پیشنهادی
        </div>
        <ul class="penman-suggested-posts-list">
          ${listItems}
        </ul>
      </div>
    `;

    if (editingBlock && editingBlock.parentNode) {
      // جایگزینی بلاک قدیمی
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();
      const newBlock = temp.firstChild;
      editingBlock.parentNode.replaceChild(newBlock, editingBlock);
      
      editingBlock = null; 
    } else {
      // ساخت بلاک جدید
      if (editor.selection && typeof editor.selection.restore === 'function') {
        editor.selection.restore();
      }
      editor.insertContent(html);
    }
    
    if (editor.history) editor.history.pushImmediate();
  }
}