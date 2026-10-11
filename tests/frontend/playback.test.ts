import assert from 'node:assert/strict';
import test from 'node:test';
import { updatePlayButton } from '../../web/src/playback-view.ts';
import { initialState, reduce } from '../../web/src/state.ts';

test('the playback label is not replaced during unchanged running frames', () => {
  let textChanges = 0;
  let ariaChanges = 0;
  let text = '';
  let aria = '';
  const button = {
    get textContent() { return text; },
    set textContent(value: string | null) { textChanges++; text = value ?? ''; },
    get ariaLabel() { return aria; },
    set ariaLabel(value: string) { ariaChanges++; aria = value; },
  };

  updatePlayButton(button, true, 'en');
  const runningText = button.textContent;
  for (let frame = 0; frame < 100; frame++) updatePlayButton(button, true, 'en');
  assert.equal(button.textContent, runningText);
  assert.equal(textChanges, 1);
  assert.equal(ariaChanges, 1);

  updatePlayButton(button, false, 'en');
  assert.equal(button.textContent, '▶  Play');
  assert.equal(textChanges, 2);
  updatePlayButton(button, false, 'mn');
  assert.equal(button.textContent, '▶  Эхлүүлэх');
  assert.equal(textChanges, 3);
});

test('one playback state stops day progression across repeated cycles', () => {
  let state = initialState();
  for (let cycle = 0; cycle < 4; cycle++) {
    const previousDay = state.day;
    state = reduce(state, { type: 'togglePlay' });
    state = reduce(state, { type: 'tick', seconds: 0.05 });
    assert.ok(state.day > previousDay);
    state = reduce(state, { type: 'togglePlay' });
    const pausedDay = state.day;
    state = reduce(state, { type: 'tick', seconds: 0.1 });
    assert.equal(state.day, pausedDay);
    assert.equal(state.playing, false);
  }
});
