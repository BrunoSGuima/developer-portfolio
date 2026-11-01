import type { Api } from './stage.ts';
import type { ClipName } from './rig.ts';

const ALL: ClipName[] = [
  'Idle',
  'Walking',
  'Running',
  'Jump',
  'WalkJump',
  'Sitting',
  'Standing',
  'Wave',
  'ThumbsUp',
  'Yes',
  'No',
  'Punch',
  'Dance',
  'Death',
];
const only = new URLSearchParams(location.search).get('clips');
const CLIPS = only ? (only.split(',') as ClipName[]) : ALL;
const COLS = 8;

/** Contact sheet: every clip the model provides, across its duration. */
export function runSheet({ rig, draw, clear }: Api) {
  clear();
  const root = document.getElementById('root')!;
  const cell = Number(new URLSearchParams(location.search).get('cell') ?? 120);
  CLIPS.forEach((clip, row) => {
    const duration = rig.clipDuration(clip);
    const label = document.createElement('div');
    label.textContent = `${clip} ${duration.toFixed(2)}s`;
    label.style.cssText = `position:absolute;left:4px;top:${row * cell + 2}px;font:600 14px system-ui;color:#2a2b30`;
    root.append(label);
    for (let i = 0; i < COLS; i++) {
      const time = (duration * i) / (COLS - 1);
      draw(
        { layers: [{ clip, time: Math.min(time, duration - 0.001) }] },
        180 + i * 170,
        (row + 1) * cell - 6,
        cell * 0.72,
      );
    }
  });
}
