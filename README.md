# Sketch Relay 💕 - The Couple Drawing Relay Game

A cute, mobile-first real-time drawing relay game designed specifically for couples!

---

## ✨ Features

- **📱 Mobile Specific & Single-Page (Zero Scrolling)**: Locked viewport (`100dvh`), responsive touch-canvas with `touch-action: none` to prevent pull-to-refresh or accidental screen gestures while drawing.
- **🎨 6 Turns Relay (45s Each)**:
  - Each partner gets **3 turns** (Alternating: Turns 1, 3, 5 for Partner 1; Turns 2, 4, 6 for Partner 2).
  - Partners draw **on top of what was previously drawn**, creating a collaborative relay masterpiece!
  - Spectator partner watches their partner's strokes and bucket fills **stream live in real time**!
- **🎲 Curated Prompts (Never Repeats)**:
  - Over 40+ cute, whimsical, and romantic couple drawing prompts.
  - Prompts are tracked per room session so you will never get a repeat prompt!
- **⏱️ Top Bar Controls**:
  - Live **Network Ping** indicator (e.g. `24ms` with green signal).
  - Active **Turn Dots (1-6)** with drawer highlighted.
  - **45s Animated Timer** with sound cues and urgency pulse when under 10 seconds.
  - **Pause / Resume** button to freeze the timer whenever needed.
- **📡 Disconnection & Reconnection Protection**:
  - If either partner loses connection or disconnects, the timer **instantly freezes**.
  - A friendly reconnecting card appears: *"Reconnecting your partner... / Connecting you, please check your internet"*.
  - When connection is restored, the relay resumes seamlessly with the canvas state intact!
- **🖌️ Full Whiteboard Tools**:
  - **Brush** with S / M / L stroke sizes.
  - **Eraser**.
  - **Color Filling Bucket** (High-performance flood-fill algorithm).
  - **Direct Quick Color Palette**: 10 essential cute colors directly visible on screen (no tedious color picker taps required).
  - **Custom Color Chooser**: Dedicated gradient picker for any custom shade.
  - **Undo** and **Clear** actions.
- **💬 Couple Live Chat & Reactions (Sabse Neeche)**:
  - Compact bottom chat pinned to the bottom.
  - One-tap cute emoji reactions (💖, 😂, 🎨, ⏳, 🙈, 👏, 🥺).
  - Text messaging with cute floating bubble toasts over the canvas.
  - Expandable chat drawer for full message history.
- **🏆 Results Screen & Play Again**:
  - Confetti celebration and cute fanfare.
  - Prompt title prominently displayed.
  - Polaroid-style framed artwork with artist signatures.
  - **Save / Download Artwork** button (saves high-res PNG to your phone).
  - **Play Again!** button for the next round with a brand new prompt.
- **🔑 Room Code & Instant Share Link**:
  - Partner 1 enters nicknames and gets a room code (e.g. `LOVE-42`).
  - Partner 2 enters the code or taps the shared invite link (`/?room=CODE`) to join instantly!

---

## 🚀 How to Run

### 1. Start Server
```bash
npm start
```
The server runs on **port 3000**.

### 2. Open on Mobile Phones
- **Local machine**: [http://localhost:3000](http://localhost:3000)
- **Partner's Phone (Same Wi-Fi network)**: `http://<YOUR_LOCAL_IP>:3000` (e.g. `http://10.139.163.171:3000`)
