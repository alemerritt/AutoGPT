# ⚓ Anchor Down: A Vanderbilt Campus Adventure — Mobile Edition

A touch-first copy of [`vanderbilt-campus-game`](../vanderbilt-campus-game/) —
the same fully explorable 2D simulation of Vanderbilt's core campus, with the
gameplay untouched but the controls and UI rebuilt for phones and tablets in
the browser.

## Play

Open `index.html` in any modern browser — on a phone, tablet, or desktop.

```bash
# or serve it locally
python3 -m http.server 8000
# → http://localhost:8000/vanderbilt-campus-game-mobile/
```

## What's different from the original

Gameplay, map, trivia, squirrels, day/night cycle — all identical. Only the
control scheme and mobile ergonomics changed:

- **🕹️ Virtual joystick** (bottom-left) replaces WASD — larger, multi-touch
  safe, with proper `touchcancel` handling
- **⚓ Action button** (bottom-right) replaces `E` — interact and advance dialogs
- **⚡ Sprint button** — hold to sprint, replacing `Shift` (squirrels still flee!)
- **🗺️ Map button** (top-right) replaces `M` to toggle the minimap
- **Tap outside a dialog** to close it, replacing `Esc`
- Dialogs move to screen center (clear of thumbs) with bigger tap targets;
  the minimap lifts above the action buttons; the HUD compacts on small screens
- Safe-area insets (`env(safe-area-inset-*)`) for notched phones,
  `100dvh` canvas sizing, and pinch/double-tap zoom + scroll-bounce prevention
- On-screen hints ("tap ⚓ — …") and the title screen instructions adapt
  automatically to touch devices

Keyboard controls still work everywhere, so the copy remains fully playable
on desktop too.

## Controls

| Touch | Keyboard | Action |
|---|---|---|
| Left joystick | `WASD` / arrows | Move |
| Hold ⚡ | `Shift` | Sprint (squirrels will flee!) |
| ⚓ button | `E` | Interact / advance dialog |
| 🗺️ button | `M` | Toggle minimap |
| Tap outside dialog | `Esc` | Close dialog |

## Gameplay

- **⚓ Scavenger hunt** — 10 glowing anchors hidden across campus
- **🎓 Trivia** — 8 landmarks each pose one Vanderbilt trivia question (one attempt each!)
- **🐿️ Squirrel diplomacy** — approach slowly (walk, don't sprint) and befriend them
- **☕ Coffee cart** — grab a latte for a 20-second sprint boost
- **Day/night cycle** — a full campus day every 4 minutes
- Minimap, objective tracker, autosaved progress (localStorage)

## Tech

Vanilla JavaScript, single file, no dependencies. Same engine as the original:
Canvas 2D renderer with y-sorted entities, AABB collision, camera lerp,
`destination-out` night lighting, WebAudio sound effects, and localStorage saves.
