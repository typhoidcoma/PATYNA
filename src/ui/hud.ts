import { eventBus } from '@/core/event-bus.ts';
import type { AppState } from '@/types/config.ts';
import './hud.css';

export class HUD {
  private root: HTMLDivElement;
  private statusDot: HTMLDivElement;
  private statusLabel: HTMLSpanElement;
  private transcript: HTMLDivElement;
  private startOverlay: HTMLDivElement;

  /** Resolves when the user clicks "begin" */
  readonly ready: Promise<void>;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';

    // Top bar
    const top = document.createElement('div');
    top.className = 'hud-top';

    const wordmark = document.createElement('span');
    wordmark.className = 'hud-wordmark';
    wordmark.textContent = 'PATYNA';

    const status = document.createElement('div');
    status.className = 'hud-status';

    this.statusDot = document.createElement('div');
    this.statusDot.className = 'hud-status-dot';
    this.statusDot.dataset.state = 'idle';

    this.statusLabel = document.createElement('span');
    this.statusLabel.className = 'hud-status-label';
    this.statusLabel.textContent = 'idle';

    status.append(this.statusDot, this.statusLabel);
    top.append(wordmark, status);

    // Bottom transcript
    const bottom = document.createElement('div');
    bottom.className = 'hud-bottom';

    this.transcript = document.createElement('div');
    this.transcript.className = 'hud-transcript';
    bottom.append(this.transcript);

    // Start overlay
    this.startOverlay = document.createElement('div');
    this.startOverlay.className = 'hud-start';
    const startText = document.createElement('span');
    startText.className = 'hud-start-text';
    startText.textContent = 'Click to begin';
    this.startOverlay.append(startText);

    this.root.append(top, bottom, this.startOverlay);
    container.appendChild(this.root);

    // Ready promise — resolves on first click
    this.ready = new Promise((resolve) => {
      this.startOverlay.addEventListener('click', () => {
        this.startOverlay.classList.add('hidden');
        resolve();
      }, { once: true });
    });

    // Listen for state changes
    eventBus.on('state:change', ({ to }) => this.setState(to));

    // Listen for transcripts
    eventBus.on('voice:transcript', ({ text, isFinal }) => {
      this.setTranscript(text, isFinal);
    });
  }

  private setState(state: AppState): void {
    this.statusDot.dataset.state = state;
    this.statusLabel.textContent = state;
  }

  private setTranscript(text: string, isFinal: boolean): void {
    this.transcript.textContent = text;
    this.transcript.classList.toggle('visible', text.length > 0);
    if (isFinal) {
      // Fade out after a delay
      setTimeout(() => {
        this.transcript.classList.remove('visible');
      }, 3000);
    }
  }
}
