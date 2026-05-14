import { Modal } from './Modal.js';
import { uniqueId } from '../utils/uniqueId.js';

/**
 * FormModal — a declarative form modal layered on Modal.js.
 *
 * Plugins describe their form with a `fields` schema; FormModal renders
 * consistent HTML, wires up validation, and hands a clean `data` object to
 * onSubmit. This replaces the previous pattern of every plugin building its
 * own modal body string with inline styles.
 *
 * ─── Supported field types ────────────────────────────────────────────────
 *
 *   text, url, email, number, search, tel, password, color, date
 *      { type, name, label?, value?, placeholder?, required?, dir?,
 *        min?, max?, step?, pattern?, autocomplete?, validate? }
 *
 *   textarea
 *      { type: 'textarea', name, label?, value?, placeholder?, rows?,
 *        required?, dir?, validate? }
 *
 *   select
 *      { type: 'select', name, label?, value?, options: [{value,label}],
 *        required? }
 *
 *   checkbox
 *      { type: 'checkbox', name, label?, checked? }
 *
 *   radio
 *      { type: 'radio', name, label?, value?, options: [{value,label}] }
 *
 *   hidden
 *      { type: 'hidden', name, value }
 *
 *   row     — lay out child fields horizontally
 *      { type: 'row', fields: [...] }
 *
 *   section — visually group fields under a title
 *      { type: 'section', title?, fields: [...] }
 *
 *   html    — raw HTML escape hatch (no data collection)
 *      { type: 'html', html: '<p>...</p>' }
 *
 *   custom  — full escape hatch; render returns a DOM node
 *      { type: 'custom', name?, render: (modal) => HTMLElement,
 *        getValue?: (el) => any }
 *
 * ─── Returned data object ─────────────────────────────────────────────────
 *
 *   onSubmit(data) receives { [field.name]: value } for every field that has
 *   a `name`. Checkboxes return boolean; selects/inputs return the string
 *   value; custom fields call their `getValue(el)` if provided.
 *
 *   `validate(value, allData)` on a field returns a string error to block
 *   submit and show under the field, or undefined/falsy to pass.
 */
export class FormModal {
  constructor(options) {
    this.options = {
      title: '',
      width: null,
      dir: 'ltr',
      submitText: 'OK',
      cancelText: 'Cancel',
      fields: [],
      onSubmit: null,
      onCancel: null,
      buttons: null,        // optional custom footer buttons
      hideFooter: false,
      ...options
    };
    this.editor = this.options.editor;
    this._fieldEntries = []; // [{ field, el, getValue }]
    this._modal = null;
    this._formId = uniqueId('penman-form-');
  }

  /**
   * Build the body HTML/DOM, instantiate the underlying Modal, and open it.
   * Returns the underlying Modal instance.
   */
  open() {
    const bodyEl = document.createElement('div');
    bodyEl.className = 'penman-form';
    bodyEl.id = this._formId;

    this._fieldEntries = [];
    this.options.fields.forEach(field => this._renderField(field, bodyEl));

    // Build modal options. We use `buttons` if provided, otherwise default
    // submit/cancel pair from Modal itself.
    const modalOptions = {
      editor: this.editor,
      title: this.options.title,
      width: this.options.width,
      dir: this.options.dir,
      hideFooter: this.options.hideFooter,
      body: '',
      submitText: this.options.submitText,
      cancelText: this.options.cancelText,
      buttons: this.options.buttons,
      onCancel: () => {
        if (typeof this.options.onCancel === 'function') this.options.onCancel();
      },
      onSubmit: () => {
        // We intercept Modal's auto-collection because our schema may have
        // checkbox/custom fields that need special handling.
        const data = this.collect();

        // Run per-field validators.
        const errors = {};
        for (const { field } of this._fieldEntries) {
          if (typeof field.validate === 'function') {
            const err = field.validate(data[field.name], data);
            if (err) errors[field.name] = err;
          }
          if (field.required && !data[field.name] && data[field.name] !== false) {
            errors[field.name] = errors[field.name] || '';
          }
        }
        if (Object.keys(errors).length > 0) {
          this._showErrors(errors);
          return false; // Modal will not close — but Modal API doesn't read this; see below.
        }

        if (typeof this.options.onSubmit === 'function') {
          this.options.onSubmit(data, this);
        }
      }
    };

    this._modal = new Modal(modalOptions);

    // Inject our body element after Modal builds its own body container.
    const bodyContainer = this._modal.modalElement.querySelector('.penman-modal-body');
    if (bodyContainer) {
      bodyContainer.innerHTML = '';
      bodyContainer.appendChild(bodyEl);
    }

    // Intercept submit so we can block close-on-invalid. The Modal currently
    // always calls close() after onSubmit; override its close flow.
    this._installSubmitInterceptor();

    this._modal.open();
    return this._modal;
  }

  /**
   * Collect current field values into a plain object.
   */
  collect() {
    const data = {};
    for (const entry of this._fieldEntries) {
      if (!entry.field.name) continue;
      data[entry.field.name] = entry.getValue();
    }
    return data;
  }

  /**
   * Return the DOM element for a field by name. Useful for attaching
   * extra event listeners or focusing a specific input.
   *
   * @param {string} name
   * @returns {HTMLElement|null}
   */
  getField(name) {
    const entry = this._fieldEntries.find(e => e.field.name === name);
    return entry ? entry.el : null;
  }

  /**
   * The underlying Modal's DOM element. Plugins that need to query custom
   * footer buttons or other Modal-managed nodes should go through this.
   */
  get modalElement() {
    return this._modal ? this._modal.modalElement : null;
  }

  /**
   * Programmatically close the underlying modal.
   */
  close() {
    if (this._modal) this._modal.close();
  }

  // ── private helpers ─────────────────────────────────────────────────────

  _renderField(field, parent) {
    switch (field.type) {
      case 'row':       return this._renderRow(field, parent);
      case 'section':   return this._renderSection(field, parent);
      case 'select':    return this._renderSelect(field, parent);
      case 'textarea':  return this._renderTextarea(field, parent);
      case 'checkbox':  return this._renderCheckbox(field, parent);
      case 'radio':     return this._renderRadio(field, parent);
      case 'hidden':    return this._renderHidden(field, parent);
      case 'html':      return this._renderRawHtml(field, parent);
      case 'custom':    return this._renderCustom(field, parent);
      default:          return this._renderInput(field, parent);
    }
  }

  _renderRow(field, parent) {
    const row = document.createElement('div');
    row.className = 'penman-form-row';
    (field.fields || []).forEach(sub => this._renderField(sub, row));
    parent.appendChild(row);
  }

  _renderSection(field, parent) {
    const section = document.createElement('fieldset');
    section.className = 'penman-form-section';
    if (field.title) {
      const legend = document.createElement('legend');
      legend.className = 'penman-form-section-title';
      legend.textContent = field.title;
      section.appendChild(legend);
    }
    (field.fields || []).forEach(sub => this._renderField(sub, section));
    parent.appendChild(section);
  }

  _renderField_wrapper(field) {
    const wrap = document.createElement('div');
    wrap.className = 'penman-form-field';
    if (field.name) wrap.dataset.field = field.name;
    return wrap;
  }

  _renderLabel(field, inputId) {
    if (!field.label) return null;
    const label = document.createElement('label');
    label.className = 'penman-form-label';
    label.setAttribute('for', inputId);
    label.textContent = field.label;
    if (field.required) {
      const star = document.createElement('span');
      star.className = 'penman-form-required';
      star.textContent = ' *';
      label.appendChild(star);
    }
    return label;
  }

  _attachError(wrap, fieldName) {
    const err = document.createElement('div');
    err.className = 'penman-form-error';
    err.dataset.errorFor = fieldName || '';
    err.hidden = true;
    wrap.appendChild(err);
  }

  _renderInput(field, parent) {
    const wrap = this._renderField_wrapper(field);
    const id = uniqueId(`${this._formId}-`);
    const label = this._renderLabel(field, id);
    if (label) wrap.appendChild(label);

    const input = document.createElement('input');
    input.id = id;
    input.className = 'penman-form-input';
    input.type = field.type || 'text';
    if (field.name) input.name = field.name;
    if (field.value !== undefined && field.value !== null) input.value = field.value;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;
    if (field.dir) input.setAttribute('dir', field.dir);
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.step !== undefined) input.step = field.step;
    if (field.pattern) input.pattern = field.pattern;
    if (field.autocomplete) input.autocomplete = field.autocomplete;
    if (field.readonly) input.readOnly = true;
    if (field.disabled) input.disabled = true;
    wrap.appendChild(input);

    this._attachError(wrap, field.name);
    parent.appendChild(wrap);

    this._fieldEntries.push({
      field,
      el: input,
      getValue: () => {
        if (input.type === 'number') {
          const v = input.value;
          return v === '' ? null : Number(v);
        }
        return input.value;
      }
    });
  }

  _renderTextarea(field, parent) {
    const wrap = this._renderField_wrapper(field);
    const id = uniqueId(`${this._formId}-`);
    const label = this._renderLabel(field, id);
    if (label) wrap.appendChild(label);

    const ta = document.createElement('textarea');
    ta.id = id;
    ta.className = 'penman-form-textarea';
    if (field.name) ta.name = field.name;
    if (field.placeholder) ta.placeholder = field.placeholder;
    if (field.rows) ta.rows = field.rows;
    if (field.required) ta.required = true;
    if (field.dir) ta.setAttribute('dir', field.dir);
    if (field.readonly) ta.readOnly = true;
    if (field.disabled) ta.disabled = true;
    if (field.value !== undefined && field.value !== null) ta.value = field.value;
    wrap.appendChild(ta);

    this._attachError(wrap, field.name);
    parent.appendChild(wrap);

    this._fieldEntries.push({ field, el: ta, getValue: () => ta.value });
  }

  _renderSelect(field, parent) {
    const wrap = this._renderField_wrapper(field);
    const id = uniqueId(`${this._formId}-`);
    const label = this._renderLabel(field, id);
    if (label) wrap.appendChild(label);

    const sel = document.createElement('select');
    sel.id = id;
    sel.className = 'penman-form-select';
    if (field.name) sel.name = field.name;
    if (field.required) sel.required = true;
    if (field.disabled) sel.disabled = true;

    const opts = field.options || [];
    for (const opt of opts) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (field.value !== undefined && String(opt.value) === String(field.value)) {
        o.selected = true;
      }
      sel.appendChild(o);
    }
    wrap.appendChild(sel);

    this._attachError(wrap, field.name);
    parent.appendChild(wrap);

    this._fieldEntries.push({ field, el: sel, getValue: () => sel.value });
  }

  _renderCheckbox(field, parent) {
    const wrap = this._renderField_wrapper(field);
    wrap.classList.add('penman-form-field--checkbox');
    const id = uniqueId(`${this._formId}-`);

    const inner = document.createElement('label');
    inner.className = 'penman-form-checkbox-label';
    inner.setAttribute('for', id);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = id;
    box.className = 'penman-form-checkbox';
    if (field.name) box.name = field.name;
    if (field.checked) box.checked = true;
    if (field.disabled) box.disabled = true;

    const text = document.createElement('span');
    text.textContent = field.label || '';

    inner.appendChild(box);
    inner.appendChild(text);
    wrap.appendChild(inner);
    parent.appendChild(wrap);

    this._fieldEntries.push({ field, el: box, getValue: () => box.checked });
  }

  _renderRadio(field, parent) {
    const wrap = this._renderField_wrapper(field);
    wrap.classList.add('penman-form-field--radio');
    if (field.label) {
      const label = document.createElement('div');
      label.className = 'penman-form-label';
      label.textContent = field.label;
      wrap.appendChild(label);
    }
    const group = document.createElement('div');
    group.className = 'penman-form-radio-group';
    const inputs = [];
    for (const opt of (field.options || [])) {
      const id = uniqueId(`${this._formId}-`);
      const optWrap = document.createElement('label');
      optWrap.className = 'penman-form-radio-option';
      optWrap.setAttribute('for', id);

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.id = id;
      radio.name = field.name;
      radio.value = opt.value;
      if (field.value !== undefined && String(opt.value) === String(field.value)) {
        radio.checked = true;
      }
      inputs.push(radio);

      const text = document.createElement('span');
      text.textContent = opt.label;

      optWrap.appendChild(radio);
      optWrap.appendChild(text);
      group.appendChild(optWrap);
    }
    wrap.appendChild(group);
    parent.appendChild(wrap);

    this._fieldEntries.push({
      field,
      el: group,
      getValue: () => {
        const picked = inputs.find(r => r.checked);
        return picked ? picked.value : null;
      }
    });
  }

  _renderHidden(field, parent) {
    const input = document.createElement('input');
    input.type = 'hidden';
    if (field.name) input.name = field.name;
    if (field.value !== undefined && field.value !== null) input.value = field.value;
    parent.appendChild(input);
    this._fieldEntries.push({ field, el: input, getValue: () => input.value });
  }

  _renderRawHtml(field, parent) {
    const wrap = document.createElement('div');
    wrap.className = 'penman-form-html';
    wrap.innerHTML = field.html || '';
    parent.appendChild(wrap);
  }

  _renderCustom(field, parent) {
    const wrap = this._renderField_wrapper(field);
    wrap.classList.add('penman-form-field--custom');
    const el = typeof field.render === 'function' ? field.render(this) : null;
    if (el instanceof HTMLElement) wrap.appendChild(el);
    parent.appendChild(wrap);
    this._fieldEntries.push({
      field,
      el: wrap,
      getValue: () => (typeof field.getValue === 'function' ? field.getValue(wrap) : undefined)
    });
  }

  _showErrors(errorsByName) {
    // Clear previous errors first.
    this._modal.modalElement.querySelectorAll('.penman-form-error').forEach(e => {
      e.hidden = true;
      e.textContent = '';
    });
    // Show new ones.
    for (const [name, msg] of Object.entries(errorsByName)) {
      const el = this._modal.modalElement.querySelector(`.penman-form-error[data-error-for="${name}"]`);
      if (el) {
        el.textContent = msg || '';
        el.hidden = !msg;
      }
    }
    // Highlight invalid fields.
    this._modal.modalElement.querySelectorAll('.penman-form-field').forEach(f => {
      const name = f.dataset.field;
      f.classList.toggle('penman-form-field--invalid', !!errorsByName[name]);
    });
  }

  /**
   * Modal's submit handler closes the modal after onSubmit. To support
   * validation blocking the close, we replace the submit button's listener
   * with our own that decides whether to call modal.close().
   */
  _installSubmitInterceptor() {
    const submitBtn = this._modal.modalElement.querySelector('.penman-modal-btn-submit');
    if (!submitBtn) return;
    // Replace the submit handler.
    const fresh = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(fresh, submitBtn);
    fresh.addEventListener('click', (e) => {
      e.preventDefault();
      const data = this.collect();
      const errors = {};
      for (const { field } of this._fieldEntries) {
        if (field.required) {
          const v = data[field.name];
          const empty = v === '' || v === null || v === undefined || (field.type === 'checkbox' && v === false ? false : false);
          if (empty && v !== false) errors[field.name] = errors[field.name] || '';
        }
        if (typeof field.validate === 'function') {
          const err = field.validate(data[field.name], data);
          if (err) errors[field.name] = err;
        }
      }
      if (Object.keys(errors).length > 0) {
        this._showErrors(errors);
        return;
      }
      if (typeof this.options.onSubmit === 'function') {
        this.options.onSubmit(data, this);
      }
      this._modal.close();
    });
  }
}
