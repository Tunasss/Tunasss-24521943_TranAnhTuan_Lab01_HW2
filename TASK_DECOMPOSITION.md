# TASK_DECOMPOSITION_HW2: Drum Kit Engine (contract-first)

Course: Web Application Development, Lab 1: Modern Web Foundations & AI-Assisted Engineering
Assignment: HW2 (Drum Kit Engine). HW1 is documented in [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md).

## 0. Overview

### Goal
A keyboard-driven drum kit where the **HTML is the contract** (which key plays which sound), a polyphonic audio engine plays overlapping sounds, an input layer listens to the keyboard, and a FIFO recorder captures and replays beats. Each layer is built and committed on its own.

### Rules I must follow
- **Contract-first:** the HTML `data-key` / `data-sound` contract is committed **before any JavaScript** exists.
- **Strict order:** Step 1 (contract) -> Step 2 (audio engine) -> Step 3 (keydown listener) -> Step 4 (recorder). No jumping ahead.
- **Atomic commits:** one concern per commit, one branch and one small PR per step, no monolithic PRs.
- **No one-shot AI code:** I write, run, and understand every step myself.
- **No inline handlers:** `onclick=...` and similar attributes are banned (the page runs under the same strict CSP as HW1).
- **Live defense:** the instructor changes a key binding and I must refactor in under 3 minutes.

### Planned commit order
| # | Task | Commit message |
|---|------|----------------|
| 1 | Step 1 | `docs(contract): define data-key/data-sound contract` |
| 2 | Step 2 | `feat(audio): polyphonic playback engine` |
| 3 | Step 3 | `feat(input): keydown listener with repeat throttling` |
| 4 | Step 4 | `feat(recorder): FIFO beat recorder` |

### Architecture (each layer only knows the layer below it)
```
index.html (contract: data-key -> data-sound)
      ^ read at load time
input.js ---- calls ----> audio-engine.js (playSound)
      | onHit(callback)            ^
      v                            | receives playSound as an argument
recorder.js <------ app.js wires the layers together
```
- `audio-engine.js` knows nothing about the keyboard or the recorder.
- `input.js` imports only the audio engine and exposes `onHit(callback)`.
- `recorder.js` imports nothing; it receives `playSound` as an argument.
- `app.js` is the only file that knows all three.

### Target structure
```
drum/
├── index.html          # the contract (+ buttons and scripts in later steps)
├── css/drum.css
├── sounds/             # kick.wav, snare.wav, hihat.wav, clap.wav
└── js/
    ├── audio-engine.js # Step 2
    ├── input.js        # Step 3
    ├── recorder.js     # Step 4
    └── app.js          # Step 4 (wiring)
docs/evidence/          # screenshots and GIFs
```

### Git workflow for each step
1. `git checkout main && git pull`, then `git checkout -b <branch>`.
2. Do the sub-steps below and run the verification each time.
3. Stage only the files of this step.
4. Commit with the exact required message.
5. Push, open a small PR, merge with a **merge commit** (not squash, to keep the message), delete the branch.

### How to run and test
- `npx serve .` then open `http://localhost:3000/drum/` (ES modules do not work from `file://`).
- Do not use VS Code Live Server for CSP checks: it injects an inline script that the CSP blocks.
- Browsers only allow audio after a user gesture, so click the page once before testing sound.

---

## Step 1: HTML data-sound contract
- **Branch:** `feat/hw2-contract`
- **Goal:** declare which key plays which sound in HTML only, before touching JavaScript.
- **Files touched:** `drum/index.html`, `drum/css/drum.css`, `drum/sounds/*.wav` (and **no `.js` files**)
- **Sub-steps:**
  1. Create `drum/`, `drum/css/`, `drum/sounds/` and copy the four sound files into `drum/sounds/`.
  2. In `drum/index.html`, create one `<button class="pad" type="button">` per sound, each carrying `data-key` (a `KeyboardEvent.code` value such as `KeyA`) and `data-sound`:
     ```html
     <button class="pad" type="button" data-key="KeyA" data-sound="kick"><kbd>A</kbd><span>Kick</span></button>
     <button class="pad" type="button" data-key="KeyS" data-sound="snare"><kbd>S</kbd><span>Snare</span></button>
     ```
     Buttons are used instead of `div` elements because they are keyboard-focusable and semantically correct without extra attributes.
  3. Add one audio element per sound: `<audio data-sound="kick" src="sounds/kick.wav" preload="auto"></audio>`.
  4. Write the contract rules as an HTML comment:
     - `data-key` = the `event.code` that triggers the pad.
     - `data-sound` = the name of the matching `<audio>` element.
     - JavaScript must never hardcode a key or a sound name.
  5. Add the page basics: `lang`, `<title>`, viewport, meta description, favicon link, and the same strict CSP meta tag as HW1 (with `media-src 'self'` so the sounds can load).
  6. Create `drum/css/drum.css` for layout and the `.pad`, `.playing`, and `:focus-visible` styles (CSS is allowed in this step; JavaScript is not).
  7. **Verify the contract:** every pad's `data-sound` has exactly one `<audio>` with the same value:
     ```bash
     grep -o 'class="pad"[^>]*data-sound="[a-z]*"' drum/index.html
     grep -o '<audio data-sound="[a-z]*"' drum/index.html
     ```
  8. **Verify no JavaScript:** `grep -n '<script' drum/index.html` returns nothing and `drum/js/` is empty.
- **Definition of done:**
  - Every pad has both attributes and every `data-sound` has a matching `<audio>`.
  - The commit contains no `.js` file (`git show --stat HEAD` proves it).
  - The page opens with no Console errors (there is no sound yet, which is correct).
- **Risks:** forgetting the CSP `media-src` makes audio fail to load later; typos between `data-sound` values and `<audio>` elements silently break sounds.
- **Evidence:** `docs/evidence/hw2-step1-no-js.png` (terminal showing `git show --stat HEAD` without `.js` files).
- **Commit:** `docs(contract): define data-key/data-sound contract`

## Step 2: Polyphonic audio engine (independent)
- **Branch:** `feat/hw2-audio`
- **Goal:** a module that plays overlapping sounds and knows nothing about the keyboard.
- **Files touched:** `drum/js/audio-engine.js`
- **Sub-steps:**
  1. Export `playSound(name)`. Look up `audio[data-sound="${name}"]`; return silently if it is missing.
  2. Play a **clone** (`cloneNode()`) of the element so a new hit does not cut off the previous one (polyphony), and reset `currentTime = 0`. A single `<audio>` element has only one playback head, so each hit needs its own instance.
  3. Handle the promise returned by `play()` with `.catch(() => {})` for autoplay restrictions.
  4. No manual cleanup is needed: the clone is never attached to the document, so it is garbage-collected after it finishes playing.
  5. Do **not** load the module from the HTML yet (no input layer exists).
  6. **Test from the Console:** click the page once, then run:
     ```js
     const { playSound } = await import('./js/audio-engine.js');
     for (let i = 0; i < 5; i++) setTimeout(() => playSound('kick'), i * 80);
     playSound('does-not-exist');
     ```
     Five overlapping kicks must be audible and the unknown name must stay silent without an error.
  7. **Verify independence:** `grep -nE 'keydown|keyup|keypress' drum/js/audio-engine.js` returns nothing.
- **Definition of done:** rapid calls layer instead of cutting off; unknown names do not throw; the file has no keyboard code.
- **Evidence:** short note or screenshot of the Console test.
- **Commit:** `feat(audio): polyphonic playback engine`

## Step 3: keydown listener with throttling
- **Branch:** `feat/hw2-input`
- **Goal:** connect the keyboard to the engine, ignoring auto-repeat, without hardcoding any key.
- **Files touched:** `drum/js/input.js`, `drum/index.html` (script tag only)
- **Sub-steps:**
  1. Build the key map from the DOM: `new Map(pads.map((pad) => [pad.dataset.key, pad]))` where `pads` is `[...document.querySelectorAll('[data-key]')]`. No keys appear anywhere in the JavaScript.
  2. Implement a `trigger(pad)` function that calls `playSound(pad.dataset.sound)`, notifies subscribers, and adds the `.playing` class.
  3. Export `onHit(callback)` so other layers (the recorder) can subscribe without being imported by the input layer.
  4. Add `document.addEventListener('keydown', handler)`. In the handler:
     - `if (event.repeat) return;` so holding a key does not machine-gun the sound (throttling).
     - Return early when `ctrlKey`, `metaKey`, or `altKey` is pressed so browser shortcuts are not hijacked.
     - Look up `event.code` in the map and call `trigger(pad)` for mapped keys only.
  5. Add click handlers on the pads that call the same `trigger(pad)`, so mouse and touch users can play too.
  6. Remove the `.playing` class with `setTimeout(..., 120)`. A timer is more robust than `transitionend`, which may not fire when hits are rapid or when animations are disabled.
  7. Load the module from the HTML with `<script type="module" src="js/input.js"></script>` at the end of `<body>` (no inline script, compatible with the CSP).
  8. **Test:** A/S/D/F make sound and light up; holding A plays once; rapid presses overlap; an unmapped key (Q) does nothing; clicks work; the Console has no CSP errors.
- **Definition of done:** holding a key plays exactly one sound; unmapped keys do nothing; rebinding a key needs only an HTML edit.
- **Live-defense drill (after merging):** change `data-key="KeyS"` to `data-key="KeyK"` in the HTML only, reload, and time myself. Target: under 3 minutes with zero JavaScript edits. Revert with `git restore drum/index.html`.
- **Commit:** `feat(input): keydown listener with repeat throttling`

## Step 4: FIFO Beat Recorder
- **Branch:** `feat/hw2-recorder`
- **Goal:** record key presses as a timestamped queue and replay them with the original rhythm.
- **Files touched:** `drum/js/recorder.js`, `drum/js/app.js`, `drum/index.html` (controls, status line, script tag)
- **Sub-steps:**
  1. Define the data model: `{ sound: string, time: number }`, where `time` is milliseconds since recording started (`performance.now() - startedAt`).
  2. Implement `start()` (clears the queue, sets `startedAt`, sets `recording = true`), `stop()`, and `record(sound)` (push to the **end** of the queue, only while recording).
  3. Implement `play(playSound, onDone)`: copy the queue, then **shift from the front** (FIFO) and schedule each event with `setTimeout(() => playSound(sound), time)`. The original queue must stay intact so replay works any number of times. Keep the timer ids so `cancel()` can stop a replay in progress.
  4. Implement `getQueue()` returning a copy, for debugging and for the status line.
  5. Keep the dependency direction clean: `recorder.js` imports nothing and receives `playSound` as an argument.
  6. Create `drum/js/app.js` that imports the audio engine, `onHit` from the input layer, and the recorder, then wires `onHit((sound) => recorder.record(sound))` and the Record, Stop, and Play buttons with `addEventListener` (no inline handlers).
  7. In `drum/index.html`, add a `.controls` block with three buttons (`#rec-start`, `#rec-stop`, `#rec-play`) and a status line `<p id="rec-status" role="status" aria-live="polite">`, and change the script tag to `js/app.js` (it imports `input.js`, so the keyboard still works).
  8. **Test:**
     - Record 4 beats, stop, and check the status shows `Recorded 4 beats`.
     - Play twice: the rhythm and order match both times.
     - Record again: the old queue is cleared.
     - Keys pressed while not recording are not queued.
     - `console.table((await import('./js/recorder.js')).getQueue())` shows strictly increasing timestamps.
- **Definition of done:** the queue is strictly FIFO with timestamps; replay matches the recording and can be repeated; keys pressed outside recording are ignored; the recorder does not import the input layer.
- **Evidence:** `docs/evidence/hw2-recorder.gif` (Record, play 4 beats, Stop, Play).
- **Commit:** `feat(recorder): FIFO beat recorder`

---

## Live defense plan
1. The instructor names a change (for example "make the snare play on `K`").
2. Open `drum/index.html`, change `data-key="KeyS"` to `data-key="KeyK"` (and the visible label).
3. Reload, press `K`, confirm the snare plays and the old key no longer does.
4. Explain why no JavaScript changed: the key map is built from the HTML contract at load time.
5. Time budget: under 3 minutes.

### Other changes the instructor may ask for (all HTML-only)
| Request | Edit |
|---|---|
| Change the key of a pad | `data-key` (and the label) in `drum/index.html` |
| Add a new sound (for example tom) | A new `<button class="pad" data-key=... data-sound="tom">` and a new `<audio data-sound="tom" src="sounds/tom.wav">` |
| Change the sound file of a pad | The `src` of the matching `<audio>` |
| Two pads sharing one sound | Same `data-sound`, different `data-key` |

### Questions I must be able to answer
1. **Why contract-first?** The HTML is the single source of truth for input -> sound, so changing a key needs no JavaScript change.
2. **Why `cloneNode()`?** One `<audio>` element has one playback head; a clone per hit lets sounds overlap.
3. **What does `event.repeat` do?** Holding a key fires `keydown` repeatedly; `repeat` is `true` after the first event, so ignoring it gives one sound per press.
4. **Why `event.code` and not `event.key`?** `code` is the physical key position, independent of keyboard layout and letter case.
5. **What makes the recorder FIFO?** `push` adds to the end while recording and `shift` removes from the front while replaying; replay uses a copy so the original queue survives.
6. **Why timestamps relative to the start?** Replay needs the relative rhythm, independent of when recording happened.
7. **Why separate files?** Each layer only knows the one below it, so any layer can be replaced or tested alone.
8. **Why does the CSP not break the page?** Every handler is attached with `addEventListener` from same-origin `.js` files; there is no inline script, handler, or style.

## Self-check before submission
- [ ] Step 1 commit contains no JavaScript (`git show --stat <hash>`)
- [ ] Four separate commits with the exact required messages, in the required order
- [ ] Holding a key plays once; rapid presses overlap
- [ ] Changing `data-key` in HTML is enough to rebind a key (under 3 minutes)
- [ ] Recording and replay keep the rhythm and can be repeated
- [ ] No inline handlers, inline scripts, or inline styles; the Console has no CSP errors on `/drum/`
- [ ] Evidence saved in `docs/evidence/` and referenced in the PRs
- [ ] I can explain every line of my code without notes
