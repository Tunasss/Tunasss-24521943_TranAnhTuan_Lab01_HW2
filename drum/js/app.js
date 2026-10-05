import { playSound } from './audio-engine.js';
import { onHit } from './input.js';
import * as recorder from './recorder.js';

const status = document.querySelector('#rec-status');

onHit((sound) => recorder.record(sound));

document.querySelector('#rec-start').addEventListener('click', () => {
  recorder.start();
  status.textContent = 'Recording... play some beats';
});

document.querySelector('#rec-stop').addEventListener('click', () => {
  recorder.stop();
  status.textContent = `Recorded ${recorder.getQueue().length} beats`;
});

document.querySelector('#rec-play').addEventListener('click', () => {
  if (recorder.getQueue().length === 0) {
    status.textContent = 'Nothing recorded yet';
    return;
  }
  status.textContent = 'Playing...';
  recorder.play(playSound, () => {
    status.textContent = `Recorded ${recorder.getQueue().length} beats`;
  });
});