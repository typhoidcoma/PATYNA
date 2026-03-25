/**
 * NavBar — top bar with "LUMINORA" logo, TTS toggle, user profile, and sign-out dropdown.
 */

import { eventBus } from '@/core/event-bus.ts';

export interface NavProfile {
  displayName: string;
  avatarUrl?: string | null;
}

export class NavBar {
  readonly el: HTMLDivElement;
  onFeedbackClick?: () => void;
  onSignOut?: () => void;

  private ttsBtn: HTMLButtonElement;
  private ttsEnabled = true;
  private nameEl: HTMLSpanElement;
  private avatarEl: HTMLDivElement;
  private dropdownEl: HTMLDivElement;
  private dropdownVisible = false;
  private userBtn: HTMLDivElement;

  constructor(username: string) {
    this.el = document.createElement('div');
    this.el.className = 'lum-nav';

    const logo = document.createElement('span');
    logo.className = 'lum-nav-logo';
    logo.textContent = 'LUMINORA';

    const user = document.createElement('div');
    user.className = 'lum-nav-user';

    this.ttsBtn = document.createElement('button');
    this.ttsBtn.className = 'lum-nav-tts';
    this.ttsBtn.title = 'Toggle voice';
    this.updateTtsIcon();
    this.ttsBtn.addEventListener('click', () => {
      this.ttsEnabled = !this.ttsEnabled;
      this.updateTtsIcon();
      eventBus.emit('media:ttsToggle', { enabled: this.ttsEnabled });
    });

    const feedbackBtn = document.createElement('button');
    feedbackBtn.className = 'lum-nav-feedback';
    feedbackBtn.type = 'button';
    feedbackBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    feedbackBtn.title = 'Feedback';
    feedbackBtn.addEventListener('click', () => this.onFeedbackClick?.());

    // Clickable user area (name + avatar) that toggles dropdown
    this.userBtn = document.createElement('div');
    this.userBtn.className = 'lum-nav-user-btn';

    this.nameEl = document.createElement('span');
    this.nameEl.className = 'lum-nav-username';
    this.nameEl.textContent = `Hi, ${username}`;

    this.avatarEl = document.createElement('div');
    this.avatarEl.className = 'lum-nav-avatar';
    this.avatarEl.textContent = username.charAt(0).toUpperCase();

    const chevron = document.createElement('span');
    chevron.className = 'lum-nav-chevron';
    chevron.innerHTML = '&#8964;';

    this.userBtn.append(this.nameEl, this.avatarEl, chevron);
    this.userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Dropdown
    this.dropdownEl = document.createElement('div');
    this.dropdownEl.className = 'lum-nav-dropdown';

    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'lum-nav-dropdown-item';
    signOutBtn.textContent = 'Sign out';
    signOutBtn.addEventListener('click', () => {
      this.hideDropdown();
      this.onSignOut?.();
    });

    this.dropdownEl.appendChild(signOutBtn);

    user.append(this.ttsBtn, feedbackBtn, this.userBtn, this.dropdownEl);
    this.el.append(logo, user);

    document.addEventListener('click', () => this.hideDropdown());
  }

  setUsername(name: string): void {
    this.nameEl.textContent = `Hi, ${name}`;
    this.setAvatarInitial(name);
  }

  setProfile(profile: NavProfile): void {
    this.nameEl.textContent = `Hi, ${profile.displayName}`;

    if (profile.avatarUrl) {
      this.avatarEl.textContent = '';
      this.avatarEl.classList.add('lum-nav-avatar--img');
      const existing = this.avatarEl.querySelector('img');
      if (existing) existing.remove();

      const img = document.createElement('img');
      img.src = profile.avatarUrl;
      img.alt = profile.displayName;
      img.referrerPolicy = 'no-referrer';
      this.avatarEl.appendChild(img);
    } else {
      this.setAvatarInitial(profile.displayName);
    }
  }

  private setAvatarInitial(name: string): void {
    this.avatarEl.classList.remove('lum-nav-avatar--img');
    const img = this.avatarEl.querySelector('img');
    if (img) img.remove();
    this.avatarEl.textContent = name.charAt(0).toUpperCase();
  }

  private toggleDropdown(): void {
    this.dropdownVisible = !this.dropdownVisible;
    this.dropdownEl.classList.toggle('lum-nav-dropdown--open', this.dropdownVisible);
  }

  private hideDropdown(): void {
    this.dropdownVisible = false;
    this.dropdownEl.classList.remove('lum-nav-dropdown--open');
  }

  private updateTtsIcon(): void {
    this.ttsBtn.textContent = this.ttsEnabled ? '🔊' : '🔇';
    this.ttsBtn.classList.toggle('lum-nav-tts--off', !this.ttsEnabled);
  }
}
