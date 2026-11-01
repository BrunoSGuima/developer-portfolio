// The M1 recording. Deterministic: renderAt(t) draws exactly one frame, whatever the machine's speed.
import type { Api } from './stage.ts';
import type { ClipName, ClipLayer, Pose } from './rig.ts';

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface Geo {
  links: { label: string; active: boolean; box: Box; text: Box }[];
  card: Box;
  header: Box;
}

type Kind = 'clip' | 'bones' | 'code';
const BADGE: Record<Kind, { text: string; colour: string }> = {
  clip: { text: 'PROVIDED BY THE MODEL', colour: '#1f6f43' },
  bones: { text: 'CREATED: BONE POSING / BLENDING', colour: '#a4570b' },
  code: { text: 'CREATED: CODE ON TOP OF A CLIP', colour: '#1d4e89' },
};

const smooth = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x * x * (3 - 2 * x);
};
const span = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
const IDLE = (t: number): ClipLayer => ({ clip: 'Idle', time: t % 3.33 });

function el(tag: string, css: string, text?: string) {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (text) e.textContent = text;
  return e;
}

/** Stand → turn → walk → turn → sit along a nav lane, or anywhere: everything the nav needs. */
function navMotion(t: number, fromX: number, toX: number, size: number, walkAt = 1.1, run = false) {
  const dist = Math.abs(toX - fromX);
  // Feet must not skate: a walk cycle covers about one body height per second
  const walkDur = Math.max(0.4, dist / (size * (run ? 2.4 : 1.05)));
  const sign = Math.sign(toX - fromX) || 1;
  const standEnd = walkAt + 0.45;
  const walkStart = standEnd + 0.25;
  const walkEnd = walkStart + walkDur;
  const sitStart = walkEnd + 0.25;
  const u = span(t, walkStart, walkEnd);
  // Linear in the middle for a steady pace
  const raw = Math.min(1, Math.max(0, (t - walkStart) / walkDur));
  const x = fromX + (toX - fromX) * (0.5 * u + 0.5 * raw);
  const walkW =
    span(t, walkStart - 0.2, walkStart + 0.05) * (1 - span(t, walkEnd - 0.05, walkEnd + 0.2));
  const sit = 1 - span(t, walkAt, standEnd) + span(t, sitStart, sitStart + 0.45);
  const yaw = sign * 1.45 * span(t, standEnd, walkStart) * (1 - span(t, walkEnd, sitStart));
  const pose: Pose = {
    layers:
      walkW > 0
        ? [
            { clip: 'Idle', time: t % 3.33, weight: 1 - walkW },
            {
              clip: run ? 'Running' : 'Walking',
              time: (t - walkStart + 9.6) % 0.96,
              weight: walkW,
            },
          ]
        : [IDLE(t)],
    sit: Math.min(1, sit),
    yaw,
  };
  return { x, pose, seated: sit > 0.9, end: sitStart + 0.45 };
}

/** The Jump clip, retimed: its flight is only 0.32 s long, too short for a real distance. */
function jumpMotion(t: number, from: [number, number], to: [number, number], size: number) {
  const ANT = 0.34,
    AIR = 0.62,
    LAND = 0.34;
  let clipTime;
  if (t < ANT) clipTime = (t / ANT) * 0.18;
  else if (t < ANT + AIR) clipTime = 0.18 + ((t - ANT) / AIR) * 0.32;
  else clipTime = Math.min(0.705, 0.5 + ((t - ANT - AIR) / LAND) * 0.205);
  const a = Math.min(1, Math.max(0, (t - ANT) / AIR));
  const x = from[0] + (to[0] - from[0]) * a;
  // A real parabola (quadratic Bezier). Its control height is as high as the top of the page
  // allows, so near the nav it launches or arrives almost flat instead of overshooting off-page.
  const hop = Math.max(size * 0.35, 8);
  const control = Math.max(
    Math.min(from[1], to[1]) - hop,
    Math.min(size, Math.min(from[1], to[1])),
  );
  const y = (1 - a) ** 2 * from[1] + 2 * a * (1 - a) * control + a ** 2 * to[1];
  return {
    x,
    y,
    pose: { layers: [{ clip: 'Jump' as ClipName, time: clipTime }] } as Pose,
    total: ANT + AIR + LAND,
  };
}

export async function createFilm({ rig, draw, clear, W, H, measure }: Api) {
  // The lowest pixel when seated: the feet plane moves by this so the seat rests on the line
  const seatBox = measure({ layers: [{ clip: 'Idle', time: 0 }], sit: 1 });
  const SEAT_LIFT = seatBox.bottom;
  const seatedHeight = seatBox.top - seatBox.bottom;
  (window as unknown as { __seat: unknown }).__seat = seatBox;
  const geometry: Record<string, Geo> = await (await fetch('/plates/geometry.json')).json();
  const root = document.getElementById('root')!;
  root.style.cssText = `position:absolute;inset:0;width:${W}px;height:${H}px;overflow:hidden;background:#1d1c21;font-family:system-ui,sans-serif`;
  const canvas = document.querySelector('canvas')!;
  canvas.style.cssText = 'position:absolute;left:0;top:0;z-index:5;pointer-events:none';
  document.body.append(canvas);
  const layer = el('div', 'position:absolute;inset:0;z-index:1');
  const over = el('div', 'position:absolute;inset:0;z-index:9;pointer-events:none');
  root.append(layer, over);

  const plates = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.keys(geometry).map(
      (key) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.src = `/plates/${key}.png`;
          plates.set(key, img);
        }),
    ),
  );

  /** A window onto a plate at 1:1. Returns the mapping from page to film coordinates. */
  function panel(key: string, fx: number, fy: number, w: number, h: number, sx = 0, sy = 0) {
    const box = el(
      'div',
      `position:absolute;left:${fx}px;top:${fy}px;width:${w}px;height:${h}px;overflow:hidden;background:#fff;box-shadow:0 0 0 1px #000`,
    );
    const img = plates.get(key)!.cloneNode() as HTMLImageElement;
    img.style.cssText = `position:absolute;left:${-sx}px;top:${-sy}px;width:1280px;height:800px`;
    box.append(img);
    layer.append(box);
    return {
      x: (v: number) => fx + v - sx,
      y: (v: number) => fy + v - sy,
      clip: { x: fx, y: fy, w, h },
    };
  }
  const label = (text: string, x: number, y: number, css = '') => {
    over.append(
      el(
        'div',
        `position:absolute;left:${x}px;top:${y}px;color:#f4efe9;font-size:20px;line-height:1.35;${css}`,
        text,
      ),
    );
  };
  const heading = (text: string, sub?: string) => {
    label(text, 40, 22, 'font-size:32px;font-weight:700');
    if (sub) label(sub, 40, 66, 'font-size:20px;color:#c9c2ba;width:1800px');
  };
  const tag = () =>
    label(
      'TEMPORARY CC0 MODEL · NOT THE MASCOT · STATIC SITE SCREENSHOTS, NOT INTEGRATED',
      40,
      H - 40,
      'font-size:16px;color:#c9c2ba;letter-spacing:.04em',
    );
  const linkX = (g: Geo, name: string) => {
    const l = g.links.find((v) => v.label === name)!;
    return (l.box.left + l.box.right) / 2;
  };

  const SIZES = [48, 64, 80];
  /** Measured at 1280 px (out/header-geometry.json); the Home landing spot is below this pill. */
  const PILL_BOTTOM = 95;
  const fit = (size: number, line: number) => {
    const seated = Math.round(seatedHeight * size);
    const standing = size <= line ? 'Standing fits.' : `Standing is cut off by ${size - line} px.`;
    return `${standing} Seated is ${seated} px tall: ${seated <= line ? 'fits' : `cut off by ${seated - line} px`}.`;
  };

  // ---------------------------------------------------- scene: three sizes along the real nav
  const navRows =
    (feet: number, title: string, sub: string, note: (size: number) => string) =>
    (t: number, first: boolean) => {
      if (first) {
        heading(title, sub);
        SIZES.forEach((size, i) => {
          const y = 110 + i * 310;
          label(`${size} px`, 40, y + 6, 'font-size:34px;font-weight:700');
          label(note(size), 40, y + 52, 'width:500px');
        });
        tag();
      }
      SIZES.forEach((size, i) => {
        const y = 110 + i * 310;
        const key = t < 1.1 ? 'light-about' : 'light-projects';
        if (first || Math.abs(t - 1.1) < 0.02) {
          layer.querySelector(`[data-row="${i}"]`)?.remove();
          const before = layer.children.length;
          const p = panel(key, 590, y, 1280, 290);
          layer.children[before]!.setAttribute('data-row', String(i));
          void p;
        }
        const clipBox = { x: 590, y, w: 1280, h: 290 };
        const g = geometry['light-about']!;
        const a = linkX(g, 'About'),
          b = linkX(g, 'Projects');
        const m = navMotion(t, a, b, size);
        draw(m.pose, 590 + m.x, y + feet + (m.pose.sit ?? 0) * size * SEAT_LIFT, size, clipBox);
      });
    };

  // ---------------------------------------------------- scene: catalogue of every motion
  interface Item {
    name: string;
    kind: Kind;
    note: string;
    pose: (t: number) => Pose;
    lift?: (t: number) => number;
  }
  const clipItem = (clip: ClipName, note: string, speed = 1): Item => ({
    name: clip,
    kind: 'clip',
    note,
    pose: (t) => {
      const d = rig.clipDuration(clip);
      return { layers: [{ clip, time: (t * speed) % d }] };
    },
  });
  const pingpong = (t: number, period: number) => {
    const p = (t % period) / period;
    return p < 0.5 ? smooth(p * 2) : smooth((1 - p) * 2);
  };
  const CATALOGUE: Item[] = [
    clipItem(
      'Idle',
      'Loops. Moves only the head and arms (7 channels), so the legs never shift weight.',
    ),
    clipItem('Walking', 'In place: the walk across the nav is added by code.'),
    clipItem(
      'Running',
      'In place. The likely answer for long distances, where walking would be too slow.',
    ),
    clipItem('Jump', 'In place, 0.71 s. Includes its own crouch, flight and landing dip.'),
    clipItem('WalkJump', 'A jump from a walk. Not used in the plan so far.'),
    clipItem(
      'Sitting',
      'NOT a seated pose: only an 11% dip. Unsuitable for sitting on the nav.',
      0.5,
    ),
    clipItem('Standing', 'The reverse of the dip above. Same limitation.', 0.5),
    clipItem('Wave', 'A possible subtle reaction, but large at this scale.'),
    clipItem('ThumbsUp', 'A possible reaction on the card.'),
    clipItem('Yes', 'Head nod. A good subtle idle reaction.'),
    clipItem('No', 'Head shake.'),
    clipItem('Punch', 'Not useful here.'),
    clipItem('Dance', 'Not useful here.'),
    clipItem('Death', 'Not useful here.'),
    {
      name: 'Surprised expression',
      kind: 'clip',
      note: 'A morph target in the model. Good for the landing.',
      pose: (t) => ({ layers: [IDLE(t)], face: { Surprised: pingpong(t, 2.6) } }),
    },
    {
      name: 'Sad expression',
      kind: 'clip',
      note: 'A morph target in the model.',
      pose: (t) => ({ layers: [IDLE(t)], face: { Sad: pingpong(t, 2.6) } }),
    },
    {
      name: 'Angry expression',
      kind: 'clip',
      note: 'A morph target in the model. No smile exists.',
      pose: (t) => ({ layers: [IDLE(t)], face: { Angry: pingpong(t, 2.6) } }),
    },
    {
      name: 'Seated (hold)',
      kind: 'bones',
      note: 'Built from bones, legs toward the viewer so nothing hangs over the nav label.',
      pose: (t) => ({ layers: [IDLE(t)], sit: 1 }),
      lift: () => 1,
    },
    {
      name: 'Sit down / stand up',
      kind: 'bones',
      note: 'Bone seat pose blended with Idle. There is no clip for this.',
      pose: (t) => ({ layers: [IDLE(t)], sit: pingpong(t, 2.6) }),
      lift: (t) => pingpong(t, 2.6),
    },
    {
      name: 'Point up-right',
      kind: 'bones',
      note: 'No pointing clip exists. Arm, wrist and fingers aimed from bones, blended over Idle.',
      pose: (t) => ({ layers: [IDLE(t)], point: { weight: pingpong(t, 2.6), x: 0.8, y: 0.55 } }),
    },
    {
      name: 'Point down at the card',
      kind: 'bones',
      note: 'The same technique aimed downward. Works for either arm.',
      pose: (t) => ({ layers: [IDLE(t)], point: { weight: pingpong(t, 2.6), x: 0.7, y: -0.6 } }),
    },
    {
      name: 'Look around',
      kind: 'bones',
      note: 'Head bone added over Idle: a candidate for occasional, subtle idle reactions.',
      pose: (t) => ({ layers: [IDLE(t)], look: { yaw: Math.sin(t * 1.6) * 0.5, pitch: -0.1 } }),
    },
    {
      name: 'Turn and walk',
      kind: 'code',
      note: 'Body turn from code, crossfaded Idle → Walking → Idle.',
      pose: (t) => {
        const w = pingpong(t, 2.6);
        return {
          layers: [
            { clip: 'Idle', time: t % 3.33, weight: 1 - w },
            { clip: 'Walking', time: t % 0.96, weight: w },
          ],
          yaw: w * 1.45,
        };
      },
    },
    {
      name: 'Landing squash',
      kind: 'code',
      note: 'Stretch applied to the whole character. Simple but effective.',
      pose: (t) => ({ layers: [IDLE(t)], squash: 0.6 * Math.max(0, Math.sin(t * 4.8)) ** 2 }),
    },
  ];
  const ITEM_S = 2.6;

  const catalogue = (t: number, first: boolean) => {
    const i = Math.min(CATALOGUE.length - 1, Math.floor(t / ITEM_S));
    const item = CATALOGUE[i]!;
    const local = t - i * ITEM_S;
    if (first || Math.floor((t - 1 / 30) / ITEM_S) !== i) {
      layer.innerHTML = '';
      over.innerHTML = '';
      layer.append(el('div', 'position:absolute;inset:0;background:#fbf3ea'));
      over.append(
        el(
          'div',
          `position:absolute;left:760px;top:60px;padding:8px 14px;border-radius:6px;background:${BADGE[item.kind].colour};color:#fff;font-size:20px;font-weight:700;letter-spacing:.03em`,
          BADGE[item.kind].text,
        ),
      );
      over.append(
        el(
          'div',
          'position:absolute;left:760px;top:118px;font-size:52px;font-weight:700;color:#2a2b30',
          item.name,
        ),
      );
      over.append(
        el(
          'div',
          'position:absolute;left:760px;top:192px;width:1080px;font-size:26px;line-height:1.35;color:#2a2b30',
          item.note,
        ),
      );
      over.append(
        el(
          'div',
          'position:absolute;left:760px;top:330px;font-size:20px;color:#5c5650',
          'Actual size, at 1× pixels:',
        ),
      );
      SIZES.forEach((size, s) =>
        over.append(
          el(
            'div',
            `position:absolute;left:${810 + s * 190}px;top:540px;font-size:18px;color:#5c5650`,
            `${size} px`,
          ),
        ),
      );
      over.append(
        el(
          'div',
          `position:absolute;left:40px;bottom:16px;font-size:16px;color:#5c5650;letter-spacing:.04em`,
          `TEMPORARY CC0 MODEL · NOT THE MASCOT · motion ${i + 1} of ${CATALOGUE.length}`,
        ),
      );
    }
    const pose = item.pose(local);
    const lift = item.lift?.(local) ?? 0;
    draw(pose, 380, 880 + lift * 600 * SEAT_LIFT, 600);
    SIZES.forEach((size, s) => draw(pose, 830 + s * 190, 525 + lift * size * SEAT_LIFT, size));
  };

  // ---------------------------------------------------- scene: the concept, start to finish
  const concept = (theme: 'light' | 'dark') => {
    let shown = '';
    return (t: number, first: boolean) => {
      const size = 64;
      const F = 320,
        T = 170;
      const FEET = 66;
      const geo = geometry[`${theme}-about`]!;
      const a = linkX(geo, 'About'),
        b = linkX(geo, 'Projects');
      const card = geometry[`${theme}-projects`]!.card;
      const seatY = (sit: number) => FEET + sit * size * SEAT_LIFT;

      const nav = navMotion(t, a, b, size, 1);
      const WAIT = 2;
      const jumpAt = nav.end + WAIT;
      // Clear of the 2D peeking mascot, which still occupies the card's left part in these screenshots
      const landX = card.right - 70;
      const up = jumpMotion(t - jumpAt - 0.5, [b, FEET], [landX, card.top], size);
      const onCardFrom = jumpAt + 0.5 + up.total;
      const pointEnd = onCardFrom + 2.6;
      const returnAt = pointEnd + 1.7;
      // Back to the nav at the nearest lane position, then along it to the new item
      const lastLink = linkX(geo, 'Contact');
      const navLand = Math.min(landX, lastLink);
      const back = jumpMotion(t - returnAt, [landX, card.top], [navLand, FEET], size);
      const backDone = returnAt + back.total;

      const key = t < 1 ? `${theme}-about` : t < returnAt ? `${theme}-projects` : `${theme}-about`;
      if (first || key !== shown) {
        shown = key;
        layer.innerHTML = '';
        panel(key, F, T, 1280, 800);
      }
      if (first) {
        heading(
          theme === 'dark'
            ? 'The whole concept, dark theme (64 px)'
            : 'The whole concept at real size (64 px)',
          'Mock on static screenshots: page swaps are picture changes, not route changes. The 10 s wait is shortened to 2 s. About → Projects → jump → point → About.',
        );
        tag();
      }
      const clip = { x: F, y: T, w: 1280, h: 800 };

      let x: number, y: number, pose: Pose;
      if (t < jumpAt) {
        x = nav.x;
        y = seatY(nav.pose.sit ?? 0);
        pose = nav.pose;
      } else if (t < jumpAt + 0.5) {
        const sit = 1 - span(t, jumpAt, jumpAt + 0.45);
        x = b;
        y = seatY(sit);
        pose = { layers: [IDLE(t)], sit };
      } else if (t < onCardFrom) {
        x = up.x;
        y = up.y;
        pose = up.pose;
      } else if (t < returnAt) {
        const p =
          span(t, onCardFrom + 0.1, onCardFrom + 0.7) * (1 - span(t, pointEnd - 0.4, pointEnd));
        const reaction =
          span(t, pointEnd, pointEnd + 0.4) * (1 - span(t, returnAt - 0.3, returnAt));
        const landing = 1 - span(t, onCardFrom, onCardFrom + 0.24);
        x = landX;
        y = card.top;
        pose = {
          layers: [IDLE(t)],
          point: { weight: p, x: -0.68, y: -0.62, side: 'R' },
          look: { yaw: reaction * 0.3 * Math.sin((t - pointEnd) * 1.8), pitch: 0.05 * p },
          squash: landing * 0.32,
          face: { Surprised: landing * 0.8 },
        };
      } else if (t < backDone) {
        x = back.x;
        y = back.y;
        pose = back.pose;
      } else {
        const run = navMotion(t - backDone, navLand, a, size, -0.45, true);
        x = run.x;
        y = seatY(run.pose.sit ?? 0);
        pose = run.pose;
      }
      draw(pose, F + x, T + y, size, clip);
    };
  };

  // ---------------------------------------------------- scene: the tight Home gap, three sizes
  const home = (t: number, first: boolean) => {
    const g = geometry['light-home']!;
    const clips = SIZES.map((_, i) => ({ fx: 20 + i * 630, w: 620 }));
    if (first) {
      heading(
        'Landing on Home: the tightest gap',
        `The card is 61 px below the language pill at this width, and 52 px at 800 px wide in Portuguese. The approved 2D Home mascot is left in place: whether it stays is decided at a later checkpoint.`,
      );
      SIZES.forEach((size, i) => {
        const top = g.card.top - size;
        const clash = top < PILL_BOTTOM;
        panel('light-home', clips[i]!.fx, 130, 620, 620, 660, 0);
        label(
          `${size} px: ${clash ? `head overlaps the language pill by ${Math.round(PILL_BOTTOM - top)} px` : `clears the language pill by ${Math.round(top - PILL_BOTTOM)} px`}`,
          clips[i]!.fx,
          770,
          `font-size:22px;font-weight:700;width:600px;color:${clash ? '#ff9f8a' : '#a6e3b8'}`,
        );
      });
      tag();
    }
    SIZES.forEach((size, i) => {
      const c = clips[i]!;
      const pose: Pose = {
        layers: [IDLE(t)],
        point: { weight: span(t, 0.8, 1.5), x: -0.68, y: -0.62, side: 'R' },
      };
      draw(pose, c.fx + (g.card.right - 70 - 660), 130 + g.card.top, size, {
        x: c.fx,
        y: 130,
        w: 620,
        h: 620,
      });
    });
  };

  // ---------------------------------------------------- text scenes
  const textScene =
    (title: string, lines: string[], kind?: string) => (_t: number, first: boolean) => {
      if (!first) return;
      label(title, 120, 110, 'font-size:50px;font-weight:700;width:1680px');
      lines.forEach((line, i) =>
        label(
          line,
          120,
          230 + i * 62,
          `font-size:30px;width:1680px;color:${kind && i === 0 ? '#ffc48a' : '#e6e0d9'}`,
        ),
      );
    };

  const scenes: { dur: number; run: (t: number, first: boolean) => unknown }[] = [
    {
      dur: 6,
      run: textScene('Mascot 3D: M1 feasibility spike', [
        'The character is RobotExpressive, a temporary CC0 model chosen only to test motion.',
        'It is not the mascot and will not be used in production.',
        'Pages are static screenshots of the current site, and nothing is integrated.',
        'Sections: sizes on the nav · every available motion · the concept · Home · what is missing.',
      ]),
    },
    {
      dur: 7.5,
      run: navRows(
        57,
        'Sizes on the real nav: feet on top of the link box',
        'The page ends at the top of each panel, so anything cut off there would be cut off in a browser. Link box top: y = 57.',
        (s) => fit(s, 57),
      ),
    },
    {
      dur: 7.5,
      run: navRows(
        66,
        'Sizes on the real nav: feet just above the label',
        'Feet lowered 9 px into the link’s empty padding, just above its text at y = 67. No layout change. It would cross a keyboard focus ring.',
        (s) => fit(s, 66),
      ),
    },
    { dur: CATALOGUE.length * ITEM_S, run: catalogue },
    { dur: 17.5, run: concept('light') },
    { dur: 17.5, run: concept('dark') },
    { dur: 6, run: home },
    {
      dur: 10,
      run: textScene(
        'Not available in this model',
        [
          'Missing entirely, and needed by the final character:',
          '· Blink: the eyes are rigid, and there is no eyelid or morph target for it.',
          '· Smile or any mouth: the model has no mouth at all.',
          '· A true sit clip, sit-to-stand, or a landing clip separate from the jump.',
          '· A pointing clip. Pointing is created here with bones: the arm reads at every size, the fingers at none.',
          '· His identity: face, hair, suit, tie and proportions. A custom model is required.',
        ],
        'x',
      ),
    },
  ];
  const total = scenes.reduce((sum, s) => sum + s.dur, 0);
  let current = -1;

  return {
    duration: total,
    renderAt(t: number) {
      let start = 0,
        index = 0;
      for (; index < scenes.length - 1; index++) {
        if (t < start + scenes[index]!.dur) break;
        start += scenes[index]!.dur;
      }
      const first = index !== current;
      if (first) {
        current = index;
        layer.innerHTML = '';
        over.innerHTML = '';
      }
      clear();
      scenes[index]!.run(t - start, first);
    },
  };
}
