import { eventBus } from '@/core/event-bus.ts';
import type { AppState } from '@/types/config.ts';
import './hud.css';

/**
 * Heads-Up Display — overlays connection status, state indicator,
 * persistent AI response text, user speech indicator, text input, and error toasts.
 */
export class HUD {
  private root: HTMLDivElement;
  private statusDot: HTMLDivElement;
  private statusLabel: HTMLSpanElement;
  private connDot: HTMLDivElement;
  private responseArea: HTMLDivElement;
  private responseText: HTMLDivElement;
  private responseBuffer = '';
  private userText: HTMLDivElement;
  private inputRow: HTMLDivElement;
  private input: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private toast: HTMLDivElement;
  private startOverlay: HTMLDivElement;
  private toastTimer = 0;
  private userTextTimer = 0;

  /** Resolves when the user clicks "begin" */
  readonly ready: Promise<void>;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';

    // ── Top bar ──
    const top = document.createElement('div');
    top.className = 'hud-top';

    const leftGroup = document.createElement('div');
    leftGroup.style.display = 'flex';
    leftGroup.style.alignItems = 'center';

    const wordmark = document.createElement('span');
    wordmark.className = 'hud-wordmark';
    wordmark.textContent = 'PATYNA';

    this.connDot = document.createElement('div');
    this.connDot.className = 'hud-conn';
    this.connDot.dataset.conn = 'disconnected';

    leftGroup.append(wordmark, this.connDot);

    const status = document.createElement('div');
    status.className = 'hud-status';

    this.statusDot = document.createElement('div');
    this.statusDot.className = 'hud-status-dot';
    this.statusDot.dataset.state = 'idle';

    this.statusLabel = document.createElement('span');
    this.statusLabel.className = 'hud-status-label';
    this.statusLabel.textContent = 'idle';

    status.append(this.statusDot, this.statusLabel);
    top.append(leftGroup, status);

    // ── Error toast ──
    this.toast = document.createElement('div');
    this.toast.className = 'hud-toast';

    // ── AI Response area (persistent) ──
    this.responseArea = document.createElement('div');
    this.responseArea.className = 'hud-response-area';

    this.responseText = document.createElement('div');
    this.responseText.className = 'hud-response';
    this.responseArea.appendChild(this.responseText);

    // ── Bottom area ──
    const bottom = document.createElement('div');
    bottom.className = 'hud-bottom';

    // User speech text (brief, fades)
    this.userText = document.createElement('div');
    this.userText.className = 'hud-user-text';

    // Text input row (always visible)
    this.inputRow = document.createElement('div');
    this.inputRow.className = 'hud-input-row';

    this.input = document.createElement('input');
    this.input.className = 'hud-input';
    this.input.type = 'text';
    this.input.placeholder = 'Type a message\u2026';
    this.input.autocomplete = 'off';

    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'hud-send';
    this.sendBtn.textContent = '\u27A4';
    this.sendBtn.disabled = true;

    this.inputRow.append(this.input, this.sendBtn);
    bottom.append(this.userText, this.inputRow);

    // ── Start overlay ──
    this.startOverlay = document.createElement('div');
    this.startOverlay.className = 'hud-start';
    const startText = document.createElement('span');
    startText.className = 'hud-start-text';
    startText.textContent = 'Click to begin';
    this.startOverlay.append(startText);

    this.root.append(top, this.toast, this.responseArea, bottom, this.startOverlay);
    container.appendChild(this.root);

    // ── Ready promise ──
    this.ready = new Promise((resolve) => {
      this.startOverlay.addEventListener('click', () => {
        this.startOverlay.classList.add('hidden');
        resolve();
      }, { once: true });
    });

    // ── Text input handlers ──
    this.input.addEventListener('input', () => {
      this.sendBtn.disabled = this.input.value.trim().length === 0;
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.sendBtn.disabled) {
        this.submitText();
      }
    });
    this.sendBtn.addEventListener('click', () => this.submitText());

    // ── Event bus subscriptions ──
    eventBus.on('state:change', ({ to }) => this.setState(to));

    // User speech transcripts (from STT only)
    eventBus.on('voice:transcript', ({ text, isFinal }) => {
      this.setUserText(text, isFinal);
    });

    // AI response text (streamed from backend)
    eventBus.on('comm:textDelta', ({ text }) => {
      this.appendResponse(text);
    });
    eventBus.on('comm:textDone', ({ text }) => {
      this.finalizeResponse(text);
    });

    // Connection status
    eventBus.on('comm:connected', () => {
      this.connDot.dataset.conn = 'connected';
    });
    eventBus.on('comm:disconnected', () => {
      this.connDot.dataset.conn = 'disconnected';
    });

    // Errors
    eventBus.on('comm:error', ({ message }) => {
      this.showToast(message);
    });
  }

  // ── AI response methods ──

  /** Append streaming delta text to the response area */
  private appendResponse(delta: string): void {
    // Clear old response when a new one starts streaming
    if (this.responseBuffer.length === 0) {
      this.responseText.textContent = '';
    }
    this.responseBuffer += delta;
    this.responseText.textContent = this.responseBuffer;
    this.responseArea.classList.add('visible');
  }

  /** Finalize the response with the complete text */
  private finalizeResponse(fullText: string): void {
    this.responseBuffer = fullText;
    this.responseText.textContent = fullText;
    this.responseArea.classList.add('visible');
  }

  /** Clear the response buffer (called before new response starts) */
  clearResponse(): void {
    this.responseBuffer = '';
    this.responseText.textContent = '';
    this.responseArea.classList.remove('visible');
  }

  // ── User text methods ──

  private submitText(): void {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this.sendBtn.disabled = true;

    // Emit as a final transcript — same path as voice
    eventBus.emit('voice:transcript', { text, isFinal: true });
  }

  private setState(state: AppState): void {
    this.statusDot.dataset.state = state;
    this.statusLabel.textContent = state;
  }

  private setUserText(text: string, isFinal: boolean): void {
    this.userText.textContent = text;
    this.userText.classList.toggle('visible', text.length > 0);
    clearTimeout(this.userTextTimer);
    if (isFinal) {
      this.userTextTimer = window.setTimeout(() => {
        this.userText.classList.remove('visible');
      }, 4000);
    }
  }

  showToast(message: string, durationMs = 4000): void {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('show');
    }, durationMs);
  }

  destroy(): void {
    this.root.remove();
  }
}
