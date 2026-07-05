# ⚓ Anchor Down: A Vanderbilt Campus Adventure

A fully explorable, interactive 2D simulation of Vanderbilt University's core campus,
built as a single self-contained HTML5 canvas game — no dependencies, no build step.

## Play

Open `index.html` in any modern browser. That's it.

```bash
# or serve it locally
python3 -m http.server 8000
# → http://localhost:8000/vanderbilt-campus-game/
```

Works on desktop (keyboard) and mobile (touch joystick + action button).

## The campus

A stylized top-down map of Vanderbilt's historic core, bounded by West End Avenue
and 21st Avenue South, featuring 12 landmark buildings:

| Landmark | Detail |
|---|---|
| Kirkland Hall | Working clock tower — the hands track in-game time |
| FirstBank Stadium | Full gridiron, oldest stadium in the SEC |
| Memorial Gymnasium | Arched roof; trivia covers its famous baseline benches |
| Central Library, Rand Hall, Sarratt | The academic/dining core |
| Stevenson Center & Featheringill Hall | Science and Engineering |
| Branscomb Quad, EBI & Zeppos Colleges | Residential campus |
| Wyatt Center | Peabody's copper dome, across 21st |

Plus Alumni Lawn, the Cornelius Vanderbilt statue, the Bicentennial Oak
(older than the nation — the whole campus is an arboretum), a coffee cart,
wandering student NPCs with campus chatter, and the famously fearless Vandy squirrels.

## Gameplay

- **⚓ Scavenger hunt** — 10 glowing anchors hidden across campus
- **🎓 Trivia** — 8 landmarks each pose one Vanderbilt trivia question (one attempt each!)
- **🐿️ Squirrel diplomacy** — approach slowly (walk, don't sprint) and befriend them
- **☕ Coffee cart** — grab a latte for a 20-second sprint boost
- **Day/night cycle** — a full campus day every 4 minutes: dusk tint, glowing
  street lamps, randomly lit building windows, dynamic light radii
- **Living world** — wandering NPCs with speech bubbles, skittish squirrel AI,
  particle effects, completion fireworks over Kirkland
- Minimap, objective tracker, autosaved progress (localStorage)

## Controls

| Input | Action |
|---|---|
| `WASD` / arrows | Move |
| `Shift` | Sprint (squirrels will flee!) |
| `E` | Interact / advance dialog |
| `M` | Toggle minimap |
| `Esc` | Close dialog |
| Touch | On-screen joystick + `E` button |

## Tech

Vanilla JavaScript, single file (~1,100 lines). Canvas 2D renderer with
y-sorted entities, AABB collision, camera lerp with world clamping, a
`destination-out` compositing pass for night lighting, seeded procedural
decoration placement, WebAudio-synthesized sound effects, and localStorage saves.
