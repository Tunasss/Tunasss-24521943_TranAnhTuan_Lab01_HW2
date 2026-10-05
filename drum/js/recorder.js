const queue = [];          // FIFO: push to the END, shift from the FRONT
let recording = false;
let startedAt = 0;
let timers = [];

export function start() {
  queue.length = 0;
  startedAt = performance.now();
  recording = true;
}

export function stop() {
  recording = false;
}

export function record(sound) {
  if (!recording) return;
  queue.push({ sound, time: Math.round(performance.now() - startedAt) }); // ms since start
}

export function play(playSound, onDone) {
  cancel();
  const copy = [...queue];                       // never mutate the original => replay works many times
  const last = copy.length ? copy[copy.length - 1].time : 0;

  while (copy.length) {
    const { sound, time } = copy.shift();        // FIFO dequeue
    timers.push(setTimeout(() => playSound(sound), time));
  }
  if (onDone) timers.push(setTimeout(onDone, last + 300));
}

export function cancel() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function getQueue() {
  return [...queue];                             // copy, for debugging in the Console
}