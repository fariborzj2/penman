/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Modal } from './Modal.js';

describe('Modal Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render and open correctly', () => {
    const modal = new Modal({
      title: 'Test Modal',
      body: '<p>Modal Body Content</p>'
    });
    modal.open();

    const overlay = document.querySelector('.penman-modal-overlay');
    expect(overlay).not.toBeNull();

    const title = overlay.querySelector('.penman-modal-header h3');
    expect(title.textContent).toBe('Test Modal');

    const body = overlay.querySelector('.penman-modal-body p');
    expect(body.textContent).toBe('Modal Body Content');
  });

  it('should close on close button click', () => {
    const modal = new Modal({ title: 'Test' });
    modal.open();

    expect(document.querySelector('.penman-modal-overlay')).not.toBeNull();

    const closeBtn = document.querySelector('.penman-modal-close');
    closeBtn.click();

    expect(document.querySelector('.penman-modal-overlay')).toBeNull();
  });

  it('should collect input data and trigger onSubmit', () => {

    let submittedData = null;
    const onSubmitSpy = (data) => { submittedData = data; };

    const modal = new Modal({
      title: 'Form Modal',
      body: '<input type="text" name="username" value="testuser">',
      onSubmit: onSubmitSpy
    });
    modal.open();

    const submitBtn = document.querySelector('.penman-modal-btn-submit');
    submitBtn.click();


    expect(submittedData).toEqual({ username: 'testuser' });

    // Should close after submit
    expect(document.querySelector('.penman-modal-overlay')).toBeNull();
  });
});
