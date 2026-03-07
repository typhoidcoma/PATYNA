import { eventBus } from '@/core/event-bus.ts';
import type { AppState } from '@/types/config.ts';
import type { MoodData } from '@/types/messages.ts';
import './hud.css';

/**
 * Heads-Up Display — split into two sections:
 *   1. Overlay (inside scene wrapper): top bar, toast, start prompt — never obscured by panel
 *   2. Panel (below scene wrapper): text input + AI response — separate from the 3D scene
 */
export class HUD {
  private overlay: HTMLDivElement;
  private panel: HTMLDivElement;
  private statusDot: HTMLDivElement;
  private statusLabel: HTMLSpanElement;
  private connDot: HTMLDivElement;
  private mediaIcons: HTMLSpanElement;
  private moodLabel: HTMLSpanElement;
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

  /**
   * @param sceneWrap — The scene wrapper div (overlay is positioned absolute inside this)
   * @param container — The root #app container (panel is appended after sceneWrap)
   */
  constructor(sceneWrap: HTMLElement, container: HTMLElement) {
    // ════════════════════════════════════════════
    // OVERLAY — positioned absolute over the 3D scene
    // ════════════════════════════════════════════
    this.overlay = document.createElement('div');
    this.overlay.className = 'hud-overlay';

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

    this.mediaIcons = document.createElement('span');
    this.mediaIcons.className = 'hud-media';

    this.moodLabel = document.createElement('span');
    this.moodLabel.className = 'hud-mood';

    leftGroup.append(wordmark, this.connDot, this.mediaIcons, this.moodLabel);

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

    // ── Start overlay ──
    this.startOverlay = document.createElement('div');
    this.startOverlay.className = 'hud-start';
    const startText = document.createElement('span');
    startText.className = 'hud-start-text';
    startText.textContent = 'Click to begin';
    this.startOverlay.append(startText);

    this.overlay.append(top, this.toast, this.startOverlay);
    sceneWrap.appendChild(this.overlay);

    // ════════════════════════════════════════════
    // PANEL — real DOM element below the 3D scene
    // ════════════════════════════════════════════
    this.panel = document.createElement('div');
    this.panel.className = 'hud-panel';

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

    // AI Response area (persistent, below input)
    this.responseArea = document.createElement('div');
    this.responseArea.className = 'hud-response-area';

    this.responseText = document.createElement('div');
    this.responseText.className = 'hud-response';
    this.responseArea.appendChild(this.responseText);

    this.panel.append(this.userText, this.inputRow, this.responseArea);
    container.appendChild(this.panel);

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
      // Clear response buffer when user sends a new message
      // (next textDelta will start fresh)
      if (isFinal) {
        this.responseBuffer = '';
      }
    });

    // AI response text (streamed from Aelora)
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

    // Media status (mic/camera indicators)
    eventBus.on('media:status', ({ mic, camera }) => {
      this.setMediaStatus(mic, camera);
    });

    // Mood updates
    eventBus.on('comm:mood', (mood) => {
      this.setMood(mood);
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

  // ── Media status ──

  private setMediaStatus(mic: boolean, camera: boolean): void {
    const parts: string[] = [];
    parts.push(mic ? '\u{1F3A4}' : '\u{1F3A4}\u2715');
    parts.push(camera ? '\u{1F4F7}' : '\u{1F4F7}\u2715');
    this.mediaIcons.textContent = parts.join(' ');
    this.mediaIcons.dataset.mic = mic ? 'on' : 'off';
    this.mediaIcons.dataset.camera = camera ? 'on' : 'off';
    this.mediaIcons.classList.add('visible');
  }

  // ── Mood methods ──

  private setMood(mood: MoodData): void {
    if (!mood.active) {
      this.moodLabel.textContent = '';
      this.moodLabel.classList.remove('visible');
      return;
    }
    this.moodLabel.textContent = mood.label;
    this.moodLabel.dataset.emotion = mood.emotion;
    this.moodLabel.dataset.intensity = mood.intensity;
    this.moodLabel.classList.add('visible');
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
    this.overlay.remove();
    this.panel.remove();
  }
}
