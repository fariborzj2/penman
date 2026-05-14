import { FloatingUI } from '../../ui/FloatingUI.js';
import { uniqueId } from '../../utils/uniqueId.js';
import { escapeHtml, safeUrl } from '../../utils/html.js';
import __faStrings from './lang/fa.js';
import __enStrings from './lang/en.js';
import __icons from './icons/index.js';

/**
 * SuggestedPostsPlugin
 * Allows users to insert a "Suggested Posts" block into the editor.
 */

function generateId() {
  return uniqueId('sp-');
}

// escapeHtml is now imported from utils/html.js (shared with all plugins).

export function setupSuggestedPostsPlugin(editor) {
  // Register plugin-owned data (lang + icons). Self-contained: removing
  // this plugin removes its strings and icons cleanly.
  if (editor.i18n && typeof editor.i18n.register === 'function') {
    editor.i18n.register('plugins.suggestedPosts', { fa: __faStrings, en: __enStrings });
  }
  if (editor.ui && editor.ui.iconProvider && typeof editor.ui.iconProvider.register === 'function') {
    editor.ui.iconProvider.register(__icons);
  }

  let items = [];
  let editingId = null;
  let floatingUI = null;
  let currentSelectedBlock = null;
  let editingBlock = null;

  // ── تابع کمکی برای پاکسازی حالت انتخاب ──────────────────────────────────
  function hideToolbar() {
    if (floatingUI) floatingUI.hide();
    currentSelectedBlock = null;
    editor.editableArea.querySelectorAll('.penman-suggested-posts-wrapper').forEach(el => {
      el.style.outline = 'none';
    });
  }

  // ── ساخت منوی شناور (Floating UI) ─────────────────────────────────────────────
  function createFloatingUI() {
    floatingUI = new FloatingUI(editor, { offset: 10, placement: 'top' });
    const html = `
      <div class="penman-suggested-posts-wrapper-toolbar" style="background: white; border: 1px solid #e0e0e0; padding: 4px; border-radius: 6px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; direction: rtl;">
        <div class="penman-floating-tail-inner" style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white; z-index: 2;"></div>
        <div class="penman-floating-tail-outer" style="position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 7px solid #e0e0e0; z-index: 1;"></div>

        <button type="button" class="penman-btn penman-btn-edit-sp" title="${editor.i18n.t('ui.edit')}" style="padding: 4px; display:flex; align-items:center; color: #111827; background:none; border:none; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>
        </button>
        <button type="button" class="penman-btn penman-btn-del-sp" title="${editor.i18n.t('ui.delete')}" style="padding: 4px; display:flex; align-items:center; color: #dc3545; background:none; border:none; cursor:pointer;">
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
    text: editor.i18n.t('plugins.suggestedPosts.title'),
    onAction: () => {
      editingBlock = null;
      items = [];
      openModal();
    },
  });

  editor.on('nodeSelected', (node) => {
    if (node && node.classList.contains("penman-suggested-posts-wrapper")) {
      currentSelectedBlock = node;
      if (!floatingUI) createFloatingUI();
      floatingUI.setAnchor(node);
      floatingUI.show();
    } else {
      hideToolbar();
    }
  });

  // ── مودال (Modal) ─────────────────────────────────────────────────────────
  function openModal() {
    if (editor.selection && typeof editor.selection.save === 'function' && !editingBlock) {
      editor.selection.save();
    }

    // Build the dynamic items-list panel as a custom field. The list re-renders
    // itself whenever an item is added / edited / deleted.
    const listEl = document.createElement('div');
    listEl.className = 'psp-items-list';

    // Build the "Add" button as a custom field below the inputs.
    const addBtnWrap = document.createElement('div');
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'penman-btn penman-btn-primary';
    addBtn.textContent = editor.i18n.t('plugins.suggestedPosts.addLink');
    addBtnWrap.appendChild(addBtn);

    // Error line shown when the add-form is invalid.
    const errorEl = document.createElement('div');
    errorEl.className = 'penman-form-error';
    errorEl.hidden = true;

    const formModal = editor.ui.createFormModal({
      title: editor.i18n.t('plugins.suggestedPosts.title'),
      hideFooter: true, // we render our own footer via `buttons` below
      fields: [
        { type: 'custom', render: () => listEl },
        {
          type: 'text',
          name: 'title',
          label: editor.i18n.t('plugins.suggestedPosts.lable'),
          placeholder: editor.i18n.t('plugins.suggestedPosts.titlePlaceholder')
        },
        {
          type: 'url',
          name: 'url',
          label: editor.i18n.t('plugins.suggestedPosts.urlLabel'),
          placeholder: editor.i18n.t('plugins.suggestedPosts.urlPlaceholder'),
          dir: 'ltr'
        },
        { type: 'custom', render: () => errorEl },
        { type: 'custom', render: () => addBtnWrap }
      ]
    });

    // Build a custom footer (the FormModal was created with hideFooter: true).
    const footer = document.createElement('div');
    footer.className = 'penman-modal-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'penman-btn';
    cancelBtn.textContent = editor.i18n.t('ui.cancel');
    cancelBtn.addEventListener('click', () => formModal.close());
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'penman-btn penman-btn-primary';
    submitBtn.textContent = editor.i18n.t('ui.ok');
    submitBtn.addEventListener('click', () => {
      if (items.length === 0) return showError(editor.i18n.t('plugins.suggestedPosts.minOnePost'));
      insertBlock();
      formModal.close();
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    formModal.modalElement.appendChild(footer);

    function renderItemsList() {
      if (items.length === 0) { listEl.innerHTML = ''; return; }
      listEl.innerHTML = `
        <div class="psp-items-wrap">
          <div class="psp-items-header">
            ${items.length} ${editor.i18n.t('plugins.suggestedPosts.postsAdded')}
          </div>
          <ul class="psp-items">
            ${items.map(item => `
              <li data-id="${escapeHtml(item.id)}" class="psp-item">
                <div class="psp-item-body">
                  <div class="psp-item-title">${escapeHtml(item.title)}</div>
                  <div class="psp-item-url">${escapeHtml(item.url)}</div>
                </div>
                <button class="psp-edit-btn penman-btn-icon" data-id="${escapeHtml(item.id)}" type="button" aria-label="${editor.i18n.t('ui.edit')}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button class="psp-delete-btn penman-btn-icon" data-id="${escapeHtml(item.id)}" type="button" aria-label="${editor.i18n.t('ui.delete')}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      listEl.querySelectorAll('.psp-edit-btn').forEach(btn => btn.addEventListener('click', () => startEdit(btn.dataset.id)));
      listEl.querySelectorAll('.psp-delete-btn').forEach(btn => btn.addEventListener('click', () => deleteItem(btn.dataset.id)));
      syncSubmitState();
    }

    function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
    function hideError()    { errorEl.textContent = ''; errorEl.hidden = true; }

    function syncSubmitState() {
      submitBtn.disabled = items.length === 0;
    }

    function setAddMode(mode) {
      if (mode === 'edit') {
        addBtn.textContent = editor.i18n.t('plugins.suggestedPosts.saveChanges');
        addBtn.classList.add('penman-btn-warning');
      } else {
        addBtn.textContent = editor.i18n.t('plugins.suggestedPosts.addLink');
        addBtn.classList.remove('penman-btn-warning');
      }
    }

    function startEdit(id) {
      const item = items.find(i => i.id === id);
      if (!item) return;
      editingId = id;
      formModal.getField('title').value = item.title;
      formModal.getField('url').value = item.url;
      setAddMode('edit');
      formModal.getField('url').focus();
    }

    function deleteItem(id) {
      items = items.filter(i => i.id !== id);
      if (editingId === id) {
        editingId = null;
        formModal.getField('title').value = '';
        formModal.getField('url').value = '';
        setAddMode('add');
      }
      renderItemsList();
    }

    addBtn.addEventListener('click', () => {
      const data = formModal.collect();
      const title = (data.title || '').trim();
      const rawUrl = (data.url || '').trim();
      if (!rawUrl || !title) return showError(editor.i18n.t('plugins.suggestedPosts.fillBothFields'));
      // URL() throws for syntactically invalid URLs; safeUrl() additionally
      // rejects unsafe schemes like javascript:/vbscript:/data: that would
      // otherwise become live XSS vectors when rendered as <a href="...">.
      try { new URL(rawUrl); } catch (_) { return showError(editor.i18n.t('plugins.suggestedPosts.invalidUrl')); }
      const url = safeUrl(rawUrl);
      if (!url) return showError(editor.i18n.t('plugins.suggestedPosts.invalidUrl'));
      hideError();
      if (editingId) {
        const idx = items.findIndex(i => i.id === editingId);
        if (idx !== -1) items[idx] = { id: editingId, title, url };
        editingId = null;
        setAddMode('add');
      } else {
        items.push({ id: generateId(), title, url });
      }
      formModal.getField('title').value = '';
      formModal.getField('url').value = '';
      renderItemsList();
      formModal.getField('url').focus();
    });

    renderItemsList();
    syncSubmitState();
  }

  function insertBlock() {
    if (items.length === 0) return;
    const listItems = items.map(item => `
      <li class="penman-suggested-posts-wrapper-item">
        <a href="${escapeHtml(item.url)}" class="penman-suggested-posts-wrapper-link" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </li>`).join('');

    const html = `
      <div class="penman-suggested-posts-wrapper" contenteditable="false">
        <div class="penman-suggested-posts-wrapper-title">${editor.i18n.t('plugins.suggestedPosts.title')}</div>
        <ul class="penman-suggested-posts-wrapper-list">${listItems}</ul>
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