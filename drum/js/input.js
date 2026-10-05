import { playSound } from './audio-engine.js';

// Build the key map FROM THE HTML CONTRACT. No keys are hardcoded here.
const pads = [...document.querySelectorAll('[data-key]')];
const keyMap = new Map(pads.map((pad) => [pad.dataset.key, pad]));

// Other layers (the recorder) subscribe here instead of being imported.
const hitListeners = [];
export function onHit(callback) {
  hitListeners.push(callback);
}

function trigger(pad) {
  const sound = pad.dataset.sound;
  playSound(sound);
  hitListeners.forEach((callback) => callback(sound));

  pad.classList.add('playing');
  setTimeout(() => pad.classList.remove('playing'), 120);
}

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;                                   // throttle: holding a key = one hit
  if (event.ctrlKey || event.metaKey || event.altKey) return; // do not hijack browser shortcuts
  const pad = keyMap.get(event.code);
  if (pad) trigger(pad);                                      // unmapped keys are ignored
});

pads.forEach((pad) => pad.addEventListener('click', () => trigger(pad)));