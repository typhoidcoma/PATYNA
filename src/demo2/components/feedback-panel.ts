/**
 * FeedbackPanel — lightweight feedback capture modal for Demo2.
 */

import { ModalManager } from './modal-manager.ts';

export interface FeedbackEntry {
  tag: string;
  comment: string;
}

const FEEDBACK_TAGS = [
  'UI',
  'UX',
  'Frontend',
  'Backend',
  'Performance',
  'Content',
  'Bug',
  'Other',
];

export class FeedbackPanel {
  private modal: ModalManager;
  onSubmit?: (data: FeedbackEntry) => void;

  constructor(modal: ModalManager) {
    this.modal = modal;
  }

  open(): void {
    const el = document.createElement('div');
    el.className = 'lum-feedback';

    const header = document.createElement('div');
    header.className = 'lum-feedback-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'lum-feedback-title';
    title.textContent = 'Share feedback';

    const subtitle = document.createElement('div');
    subtitle.className = 'lum-feedback-subtitle';
    subtitle.textContent = 'Help us improve the app with quick notes on what is working, confusing, or missing.';
    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lum-feedback-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close feedback panel');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.modal.close());

    header.append(titleWrap, closeBtn);

    const commentLabel = document.createElement('label');
    commentLabel.className = 'lum-feedback-label';
    commentLabel.textContent = 'Comment';

    const textarea = document.createElement('textarea');
    textarea.className = 'lum-feedback-textarea';
    textarea.placeholder = 'What is working well, what feels confusing, or what is missing?';
    textarea.maxLength = 800;

    const tagLabel = document.createElement('label');
    tagLabel.className = 'lum-feedback-label';
    tagLabel.textContent = 'Category';

    const select = document.createElement('select');
    select.className = 'lum-feedback-select';
    select.setAttribute('aria-label', 'Feedback category');
    for (const tag of FEEDBACK_TAGS) {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      select.appendChild(option);
    }

    const counterRow = document.createElement('div');
    counterRow.className = 'lum-feedback-counter-row';
    const counter = document.createElement('span');
    counter.className = 'lum-feedback-counter';
    counter.textContent = '0/800';

    counterRow.appendChild(counter);

    const helper = document.createElement('div');
    helper.className = 'lum-feedback-helper';
    helper.textContent = 'Saved locally for now so we can review and iterate quickly.';

    const actions = document.createElement('div');
    actions.className = 'lum-feedback-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'lum-feedback-cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.modal.close());

    const submitBtn = document.createElement('button');
    submitBtn.className = 'lum-feedback-submit';
    submitBtn.type = 'button';
    submitBtn.textContent = 'Save feedback';
    submitBtn.disabled = true;

    const updateState = () => {
      const length = textarea.value.trim().length;
      counter.textContent = `${length}/800`;
      submitBtn.disabled = length === 0;
    };

    textarea.addEventListener('input', updateState);
    textarea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !submitBtn.disabled) {
        submitBtn.click();
      }
    });

    submitBtn.addEventListener('click', () => {
      const comment = textarea.value.trim();
      if (!comment) {
        textarea.focus();
        return;
      }

      this.onSubmit?.({
        tag: select.value,
        comment,
      });
      this.modal.close();
    });

    actions.append(cancelBtn, submitBtn);
    el.append(header, commentLabel, textarea, counterRow, tagLabel, select, helper, actions);

    this.modal.open(el);
    requestAnimationFrame(() => textarea.focus());
  }
}
