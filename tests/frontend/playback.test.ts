import assert from 'node:assert/strict';
import test from 'node:test';
import { updatePlayButton } from '../../web/src/playback-view.ts';
import { emptyWorkspace, setClockPlaying, tickClock } from '../../web/src/workspace-state.ts';

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
  let state = emptyWorkspace();
  for (let cycle = 0; cycle < 4; cycle++) {
    const previousDay = state.clock.ut1Jd;
    state = setClockPlaying(state, true);
    state = tickClock(state, 0.05);
    assert.ok(state.clock.ut1Jd > previousDay);
    state = setClockPlaying(state, false);
    const pausedDay = state.clock.ut1Jd;
    state = tickClock(state, 0.1);
    assert.equal(state.clock.ut1Jd, pausedDay);
    assert.equal(state.clock.playing, false);
  }
});
