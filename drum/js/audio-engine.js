// Audio engine: knows NOTHING about the keyboard or the recorder.
export function playSound(name) {
  const source = document.querySelector(`audio[data-sound="${name}"]`);
  if (!source) return;                       // unknown sound: do nothing

  const voice = source.cloneNode();          // a new instance per hit => overlap (polyphony)
  voice.currentTime = 0;

  const attempt = voice.play();
  if (attempt) attempt.catch(() => {});      // ignore autoplay-policy rejections
}