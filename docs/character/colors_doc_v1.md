Core palette
Brand + hero colors
:root {
  --color-hot-pink: #f94d8a;
  --color-deep-pink: #d62f5f;
  --color-rose-pink: #da4d6b;
  --color-blush-rose: #cf868e;

  --color-lime-zebra: #c1c34d;
  --color-soft-peach: #fedbb0;
  --color-warm-skin: #cca48f;
}
UI background colors
:root {
  --color-mint-fog: #b5f3ec;
  --color-aqua-mist: #cde6e7;
  --color-lilac-haze: #e0bed3;
  --color-soft-lavender: #d1c8d4;
  --color-powder-rose: #e9c3ba;
  --color-cream-blush: #f4ece6;
  --color-soft-white: #f8f9fa;
}
Text + neutral structure
:root {
  --color-text-main: #3b2b1c;
  --color-text-muted: #615a50;
  --color-text-soft: #76747f;
  --color-sage-muted: #788c78;
  --color-pale-sage: #d2ddc0;
  --color-light-peach: #f7dcca;
}
Recommended semantic tokens

Use these instead of raw color values everywhere.

:root {
  /* Backgrounds */
  --bg-app: linear-gradient(135deg, #b5f3ec 0%, #cde6e7 28%, #e0bed3 65%, #fedbb0 100%);
  --bg-surface: rgba(248, 249, 250, 0.72);
  --bg-surface-strong: rgba(244, 236, 230, 0.88);
  --bg-surface-tint: rgba(224, 190, 211, 0.45);
  --bg-card-pink: linear-gradient(180deg, #f7dcca 0%, #e0bed3 100%);
  --bg-card-purple: linear-gradient(180deg, #e0bed3 0%, #d1c8d4 100%);
  --bg-card-event: linear-gradient(180deg, rgba(249, 77, 138, 0.18) 0%, rgba(224, 190, 211, 0.35) 100%);

  /* Text */
  --text-primary: #3b2b1c;
  --text-secondary: #615a50;
  --text-tertiary: #76747f;
  --text-inverse: #f8f9fa;
  --text-accent: #d62f5f;

  /* Accent */
  --accent-primary: #f94d8a;
  --accent-primary-hover: #d62f5f;
  --accent-secondary: #c1c34d;
  --accent-soft: #cf868e;
  --accent-glow: rgba(249, 77, 138, 0.22);

  /* Borders */
  --border-soft: rgba(255, 255, 255, 0.45);
  --border-muted: rgba(118, 116, 127, 0.18);
  --border-accent: rgba(249, 77, 138, 0.28);

  /* Shadows */
  --shadow-card: 0 12px 30px rgba(59, 43, 28, 0.12);
  --shadow-soft: 0 8px 20px rgba(118, 116, 127, 0.10);
  --shadow-glow-pink: 0 0 24px rgba(249, 77, 138, 0.18);

  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.22);
  --glass-bg-strong: rgba(255, 255, 255, 0.36);
  --glass-blur: blur(20px);
}
Typography direction

This UI wants rounded, airy, modern type.

:root {
  --font-sans: "Inter", "SF Pro Display", "Segoe UI", sans-serif;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 20px;
  --text-xl: 28px;
  --text-2xl: 40px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
}
Type rules
body {
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-app);
}

.ui-title {
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.ui-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-tertiary);
}

.ui-body {
  font-size: var(--text-md);
  color: var(--text-secondary);
}

.ui-accent-text {
  color: var(--text-accent);
}
Radius, spacing, and overall feel

This design is very soft and pill-heavy.

:root {
  --radius-sm: 14px;
  --radius-md: 22px;
  --radius-lg: 30px;
  --radius-xl: 40px;
  --radius-pill: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
}
Component recipes
1. App shell
.app-shell {
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--text-primary);
}
2. Glass cards
.glass-card {
  background: var(--bg-surface);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
3. Sidebar buttons
.sidebar-button {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-pill);
  background: rgba(248, 249, 250, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: var(--shadow-soft);
  color: var(--text-tertiary);
}

.sidebar-button:hover {
  background: rgba(255, 255, 255, 0.88);
  color: var(--accent-primary);
}
4. Input bar
.input-bar {
  height: 72px;
  padding: 0 24px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 10px 24px rgba(59, 43, 28, 0.10);
  color: var(--text-secondary);
}
5. Primary button
.button-primary {
  background: linear-gradient(180deg, #f94d8a 0%, #d62f5f 100%);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-glow-pink);
}

.button-primary:hover {
  background: linear-gradient(180deg, #ff6198 0%, #da4d6b 100%);
}
6. Soft utility button
.button-soft {
  background: rgba(255, 255, 255, 0.34);
  color: var(--text-secondary);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-pill);
}
7. Calendar/event cards
.event-card {
  background: linear-gradient(180deg, rgba(249, 77, 138, 0.20) 0%, rgba(224, 190, 211, 0.50) 100%);
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
}

.event-card .time {
  color: var(--accent-primary-hover);
  font-weight: 600;
}

.event-card .title {
  color: var(--text-primary);
}
8. Habit tracker bubbles
.habit-bubble {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #e0bed3 0%, #f7dcca 45%, #cf868e 100%);
  color: var(--text-inverse);
  box-shadow: 0 10px 28px rgba(207, 134, 142, 0.18);
}
9. Speech bubble
.speech-bubble {
  background: rgba(248, 249, 250, 0.82);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 28px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(12px);
}
Suggested gradient set

These match the screenshot’s vibe pretty closely.

:root {
  --gradient-main: linear-gradient(135deg, #b5f3ec 0%, #cde6e7 30%, #d1c8d4 58%, #fedbb0 100%);
  --gradient-card-soft: linear-gradient(180deg, #f8f9fa 0%, #f4ece6 100%);
  --gradient-card-pink: linear-gradient(180deg, #f7dcca 0%, #e0bed3 100%);
  --gradient-accent-pink: linear-gradient(180deg, #f94d8a 0%, #d62f5f 100%);
  --gradient-bubble: radial-gradient(circle at 35% 30%, #f8f9fa 0%, #e0bed3 45%, #cf868e 100%);
  --gradient-lime-fashion: linear-gradient(180deg, #d2ddc0 0%, #c1c34d 100%);
}
Full starter CSS guide
:root {
  --color-hot-pink: #f94d8a;
  --color-deep-pink: #d62f5f;
  --color-rose-pink: #da4d6b;
  --color-blush-rose: #cf868e;
  --color-lime-zebra: #c1c34d;
  --color-soft-peach: #fedbb0;
  --color-warm-skin: #cca48f;

  --color-mint-fog: #b5f3ec;
  --color-aqua-mist: #cde6e7;
  --color-lilac-haze: #e0bed3;
  --color-soft-lavender: #d1c8d4;
  --color-powder-rose: #e9c3ba;
  --color-cream-blush: #f4ece6;
  --color-soft-white: #f8f9fa;

  --color-text-main: #3b2b1c;
  --color-text-muted: #615a50;
  --color-text-soft: #76747f;
  --color-sage-muted: #788c78;
  --color-pale-sage: #d2ddc0;
  --color-light-peach: #f7dcca;

  --bg-app: linear-gradient(135deg, #b5f3ec 0%, #cde6e7 28%, #e0bed3 65%, #fedbb0 100%);
  --bg-surface: rgba(248, 249, 250, 0.72);
  --bg-surface-strong: rgba(244, 236, 230, 0.88);

  --text-primary: #3b2b1c;
  --text-secondary: #615a50;
  --text-tertiary: #76747f;
  --text-inverse: #f8f9fa;
  --text-accent: #d62f5f;

  --accent-primary: #f94d8a;
  --accent-primary-hover: #d62f5f;
  --accent-secondary: #c1c34d;

  --border-soft: rgba(255,255,255,0.45);
  --border-muted: rgba(118,116,127,0.18);
  --shadow-card: 0 12px 30px rgba(59,43,28,0.12);
  --shadow-soft: 0 8px 20px rgba(118,116,127,0.10);

  --radius-sm: 14px;
  --radius-md: 22px;
  --radius-lg: 30px;
  --radius-xl: 40px;
  --radius-pill: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;

  --font-sans: "Inter", "SF Pro Display", "Segoe UI", sans-serif;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--bg-app);
  color: var(--text-primary);
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow-card);
}

.button-primary {
  background: linear-gradient(180deg, var(--accent-primary), var(--accent-primary-hover));
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-pill);
  padding: 12px 20px;
}

.button-soft {
  background: rgba(255,255,255,0.32);
  color: var(--text-secondary);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-pill);
  padding: 12px 20px;
}

.input {
  background: rgba(255,255,255,0.28);
  border: 1px solid rgba(255,255,255,0.42);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  padding: 16px 22px;
  backdrop-filter: blur(18px);
}