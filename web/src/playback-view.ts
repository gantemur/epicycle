import { message, type Language } from './i18n.ts';

type PlaybackButton = Pick<HTMLButtonElement, 'textContent' | 'ariaLabel'>;

/** Preserve the button's text node while a pointer is pressed during playback. */
export function updatePlayButton(button: PlaybackButton, playing: boolean, language: Language): void {
  const label = message(language, playing ? 'pause' : 'play');
  const text = `${playing ? 'Ⅱ' : '▶'}  ${label}`;
  if (button.textContent !== text) button.textContent = text;
  if (button.ariaLabel !== label) button.ariaLabel = label;
}
