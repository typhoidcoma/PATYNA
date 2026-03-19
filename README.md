<p align="center">
  <img src="assets/patyna_logo.svg" alt="Patyna" width="128" height="128" />
</p>

<h1 align="center">PATYNA</h1>

<p align="center">Real-time AI avatar with voice interaction, memory, and an interactive student dashboard.</p>

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- An [ElevenLabs](https://elevenlabs.io/) API key (for TTS)
- An [Aelora](https://github.com/your-org/aelora) backend running (for chat, memory, and user data)

### Install

```bash
git clone https://github.com/your-org/patyna.git
cd patyna
npm install
```

### Configure

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key for streaming TTS |
| `VITE_ELEVENLABS_VOICE_ID` | ElevenLabs voice ID (Flash v2.5 recommended) |
| `VITE_AELORA_WS_URL` | Aelora WebSocket endpoint (e.g. `wss://your-server/aelora/ws`) |
| `VITE_AELORA_API_KEY` | Aelora REST API key |
| `VITE_USER_ID` | User ID for the Aelora session |
| `VITE_USERNAME` | Display name shown in the UI |
| `VITE_SESSION_ID` | Session identifier (defaults to `patyna-web`) |

### Run

```bash
npm run dev        # Dev server on http://localhost:3005
npm run build      # Production build
npm run preview    # Preview production build on http://localhost:4173
```

---

## Apps

Patyna ships three entry points, all served from the same dev server:

### Main App (`/`)

Full 3D avatar experience with mic, camera, and voice interaction.

1. Open `http://localhost:3005`
2. Click "Click to begin"
3. Grant mic + camera permissions
4. Talk to Patyna

### P0 Demo (`/demo.html`)

Interactive task dashboard with draggable widgets and LLM coaching.

- Text-only input (no mic/camera required)
- Enter a username on the login screen
- Dashboard widgets: schedule card, goals with progress bars, tasks with checkboxes + points
- LLM responds to task completions and free-text chat
- Celebration effects on task complete (particles, flash, chime)

### LUMINORA (`/demo2.html`)

Polished student productivity dashboard with a coaching avatar.

- Login with a username to enter the dashboard
- **Left panel** — daily briefing, schedule, due-today checklist, weekly rhythm
- **Center** — 3D avatar with speech bubble, journal input, vault (memory facts)
- **Right panel** — goals, points tracker, TOP 3 priority tasks with timers, all tasks with difficulty bars
- ElevenLabs Flash v2.5 streaming voice
- Vault syncs user-scoped memory facts from Aelora every 30s
- Task completion triggers life events + celebration effects

---

## Features

- 3D butterfly avatar (Three.js) with audio-reactive animation
- Voice conversation: VAD + Web Speech STT + ElevenLabs streaming TTS
- Face tracking via MediaPipe with gaze following
- Mood-driven animation profiles with smooth state blending
- Presence detection (present / away / gone) with avatar dimming
- Aelora memory API integration with user-scoped vault
- TTS mute toggle to save ElevenLabs credits
- Text input fallback for all modes

---

## Architecture

```
src/
  main.ts                     # Main app entry point
  app.ts                      # Main orchestrator

  core/
    state-machine.ts          # idle > listening > thinking > speaking
    event-bus.ts              # Typed pub/sub event bus

  scene/
    scene-manager.ts          # Three.js renderer, camera, lights
    avatar.ts                 # 3D butterfly avatar mesh
    avatar-controller.ts      # Face-tracking gaze controller
    environment.ts            # Shader background + mood sparkles
    mood-animations.ts        # Mood-driven animation profiles
    mood-colors.ts            # Emotion-to-color mapping

  audio/
    audio-manager.ts          # AudioContext lifecycle
    tts-player.ts             # AudioWorklet + AnalyserNode playback
    elevenlabs-tts.ts         # ElevenLabs WebSocket streaming TTS

  voice/
    voice-manager.ts          # Coordinates VAD + STT
    vad.ts                    # @ricky0123/vad-web
    stt-provider.ts           # STT interface
    web-speech-stt.ts         # Web Speech API implementation

  comm/
    protocol.ts               # Aelora WebSocket protocol + presence
    websocket-client.ts       # Reconnecting WebSocket
    message-codec.ts          # JSON message codec

  api/
    aelora-client.ts          # REST client (users, sessions, memory, mood)

  tracking/
    webcam.ts                 # Camera stream
    face-tracker.ts           # MediaPipe face landmarks
    presence-manager.ts       # Presence detection (present/away/gone)

  ui/
    hud.ts                    # Main app overlay + toggles
    hud.css                   # Main app styles
    sidebar.ts                # Sidebar widget container
    demo-hud.ts               # P0 demo HUD (login, text input, reset)
    demo-sidebar.ts           # P0 demo goals & tasks widgets
    today-card.ts             # Schedule card widget
    speech-bubble.ts          # Floating LLM response bubble
    draggable.ts              # Drag utility for floating widgets

  fx/
    celebration.ts            # Task completion effects (particles, flash, chime)

  demo/
    demo-main.ts              # P0 demo entry point
    demo-app.ts               # P0 demo orchestrator
    demo-state.ts             # P0 demo state (goals, tasks, schedule)
    demo-data.ts              # P0 seed data
    demo-types.ts             # P0 data types
    demo-overrides.css        # P0 demo-specific styles

  demo2/
    demo2-main.ts             # LUMINORA entry point
    demo2-app.ts              # LUMINORA orchestrator
    demo2-state.ts            # State engine (tasks, goals, vault, schedule)
    demo2-data.ts             # Fixture data (goals, tasks, schedule)
    demo2-types.ts            # LUMINORA data types
    demo2.css                 # LUMINORA styles
    components/
      nav-bar.ts              # Top navigation bar
      daily-briefing.ts       # Left panel: briefing + schedule + due today
      avatar-frame.ts         # Center: avatar container + vault button
      goals-tasks-panel.ts    # Right panel: goals, points, TOP 3, all tasks
      journal-bar.ts          # Bottom: text input + send button
      vault-modal.ts          # Memory facts modal
      task-complete-modal.ts  # Task completion celebration modal
      weekly-rhythm-modal.ts  # Weekly rhythm schedule modal
      modal-manager.ts        # Modal open/close coordination

  utils/
    lerp.ts                   # Interpolation helpers
    ring-buffer.ts            # Ring buffer data structure

  types/
    config.ts                 # Config + defaults (reads env vars)
    events.ts                 # EventBus type map
    messages.ts               # WebSocket message types
```

---

## State Machine

```
idle ──> listening ──> thinking ──> speaking ──> idle
                                       |
                          (idle ──> speaking)   // audio race condition
```

| State | Avatar behavior |
|---|---|
| **idle** | Gentle bob, wing shimmer |
| **listening** | Forward lean, wings angled in |
| **thinking** | Visually calm, same as idle |
| **speaking** | Audio-reactive mouth, wings, core glow, antenna tips |

---

## Audio Pipeline

```
ElevenLabs WS ──> Float32 PCM ──> AudioWorklet ring buffer ──> AnalyserNode ──> speakers
                                           |
                                  getAmplitude() per frame
                                           |
                                  avatar mouth, wings, glow
```

60s ring buffer with 1.5s drain grace period for chunk gaps. AnalyserNode `smoothingTimeConstant=0.75`. Frame-rate independent exponential lerp with asymmetric attack/release.

---

## Presence Detection

```
present ──> away (15s no face) ──> gone (2min no face)
   ^__________________________________|  (face detected)
```

| State | Effect |
|---|---|
| **present** | Full animation |
| **away** | Dimmed to 40% |
| **gone** | Dimmed to 10%, eyes closed |

Camera off pauses detection without triggering away/gone.

---

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — AudioWorklet + AnalyserNode
- [MediaPipe](https://mediapipe.dev/) — Face landmark tracking
- [@ricky0123/vad-web](https://github.com/ricky0123/vad) — Voice activity detection
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — Speech-to-text
- [ElevenLabs](https://elevenlabs.io/) — Streaming TTS (Flash v2.5)
- [Aelora](https://github.com/your-org/aelora) — WebSocket chat + REST memory API
- [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) — Build tooling
