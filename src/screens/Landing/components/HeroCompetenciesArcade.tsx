import { useEffect, useRef } from 'react';

const LW = 248;
const LH = 88;
const TILE = 8;
const COLS = 31;
const ROWS = 3;
const OY = 24;
const SPEED = 12;

/* Paleta editorial CIELO */
const P = [
  '#537BAC', // Comunicativa (Azul CIELO)
  '#DEAE4D', // Pensamiento Lógico (Amarillo CIELO)
  '#EB8847', // Resolución de Problemas (Naranja CIELO)
  '#689C63', // Científica y Tecnológica (Verde CIELO)
  '#4D8C7A', // Ambiental y de la Salud (Verde editorial)
  '#DB5B48', // Ética y Ciudadana (Rojo CIELO)
  '#8B6D9C', // Desarrollo Personal y Espiritual (Ciruela editorial)
];

const RED = '#DB5B48';
const WALL = '#537BAC';
const INK = '#2E3330';
const DOT = '#C9C1AE';
const DIM = '#E3DFD3';

/* Tipografía bitmap 5x7 */
const FONT: Record<string, string> = {
  A: 'ehhvhhh',
  B: 'uhhuhhu',
  C: 'ehggghe',
  D: 'uhhhhhu',
  E: 'vgguggv',
  F: 'vgguggg',
  G: 'ehgnhhf',
  H: 'hhhvhhh',
  I: 'e44444e',
  J: '72222ic',
  K: 'hikokih',
  L: 'ggggggv',
  M: 'hrllhhh',
  N: 'hpljhhh',
  O: 'ehhhhhe',
  P: 'uhhuggg',
  Q: 'ehhhlid',
  R: 'uhhukih',
  S: 'fgge11u',
  T: 'v444444',
  U: 'hhhhhhe',
  V: 'hhhhha4',
  W: 'hhhllrh',
  X: 'hha4ahh',
  Y: 'hha4444',
  Z: 'v1248gv',
  '0': 'ehjlphe',
  '1': '4c4444e',
  '2': 'eh1248v',
  '3': 'u11e11u',
  '4': '26aiv22',
  '5': 'vgu11he',
  '6': '68guhhe',
  '7': 'v124888',
  '8': 'ehhehhe',
  '9': 'ehhf12c',
  '!': '4444404',
  '¡': '4044444',
  '.': '0000004',
  ',': '0000048',
  '-': '000v000',
  '«': '05aka50',
  '»': '0ka5ak0',
  '/': '122488g',
  ' ': '0000000',
};

const ICONS = [
  ['.######.', '########', '#.#.#.##', '########', '.######.', '..###...', '...##...', '....#...'],
  ['..####..', '.######.', '########', '########', '.######.', '..####..', '...##...', '..####..'],
  ['..###...', '.#...#..', '.#...#..', '..###...', '...#....', '...##...', '...#....', '...###..'],
  ['..####..', '...##...', '...##...', '..####..', '.######.', '########', '########', '.######.'],
  ['......##', '....####', '..######', '.#######', '.######.', '#.####..', '#.##....', '#.......'],
  ['...##...', '########', '#..##..#', '#..##..#', '...##...', '...##...', '..####..', '.######.'],
  ['...##...', '...##...', '..####..', '########', '########', '..####..', '...##...', '...##...'],
];

const NAMES: [string, string][] = [
  ['COMPETENCIA', 'COMUNICATIVA'],
  ['PENSAMIENTO LÓGICO,', 'CREATIVO Y CRÍTICO'],
  ['RESOLUCIÓN', 'DE PROBLEMAS'],
  ['CIENTÍFICA', 'Y TECNOLÓGICA'],
  ['AMBIENTAL', 'Y DE LA SALUD'],
  ['ÉTICA', 'Y CIUDADANA'],
  ['DESARROLLO PERSONAL', 'Y ESPIRITUAL'],
];

const ITEM_AT = [4, 8, 12, 16, 20, 24, 28];

const isAcc = (c: string) => c >= '\u0300' && c <= '\u036f';

function txt(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  sc: number,
  col: string,
  al?: 'c' | 'r'
) {
  const norm = s.normalize('NFD');
  const w = [...norm].filter((c) => !isAcc(c)).length * 6 * sc - sc;
  let cx = x;
  if (al === 'c') cx -= Math.floor(w / 2);
  else if (al === 'r') cx -= w;
  ctx.fillStyle = col;
  for (const ch of norm) {
    if (isAcc(ch)) {
      const px = cx - 6 * sc;
      if (ch === '\u0301') {
        ctx.fillRect(px + 3 * sc, y - sc, sc, sc);
        ctx.fillRect(px + 4 * sc, y - 2 * sc, sc, sc);
      } else if (ch === '\u0303') {
        ctx.fillRect(px + sc, y - sc, sc, sc);
        ctx.fillRect(px + 2 * sc, y - 2 * sc, sc, sc);
        ctx.fillRect(px + 3 * sc, y - sc, sc, sc);
      }
      continue;
    }
    const g = FONT[ch.toUpperCase()];
    if (g) {
      for (let r = 0; r < 7; r++) {
        const v = parseInt(g[r], 32);
        for (let c = 0; c < 5; c++) {
          if ((v >> (4 - c)) & 1) ctx.fillRect(cx + c * sc, y + r * sc, sc, sc);
        }
      }
    }
    cx += 6 * sc;
  }
}

const mkCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function pacSprite(dir: number, fr: number) {
  const c = mkCanvas(12, 12);
  const g = c.getContext('2d')!;
  const half = ([0, 24, 50][fr] * Math.PI) / 180;
  g.fillStyle = RED;
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const dx = i + 0.5 - 6;
      const dy = j + 0.5 - 6;
      const r = Math.hypot(dx, dy);
      if (r > 5.8) continue;
      if (fr && r > 0.9) {
        let a = Math.atan2(dy, dx) - (dir * Math.PI) / 2;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < half) continue;
      }
      g.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

function iconSprite(rows: string[], col: string) {
  const c = mkCanvas(8, 8);
  const g = c.getContext('2d')!;
  g.fillStyle = col;
  rows.forEach((r, y) => {
    [...r].forEach((p, x) => {
      if (p === '#') g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

type Particle =
  | { k: 'ring'; x: number; y: number; life: number; max: number; c: string }
  | { k: 'txt'; x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; t: string }
  | { k: 'sq'; x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; c: string; s: number };

export function HeroCompetenciesArcade({
  compact = false,
  onComplete,
}: {
  compact?: boolean;
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayFnRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const cv = canvasRef.current;
    const root = containerRef.current;
    if (!cv || !root) return;

    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Recorrido recto */
    const PATH: number[] = [];
    for (let x = 1; x <= 29; x++) PATH.push(1 * COLS + x);
    const wall = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    PATH.forEach((c) => {
      wall[(c / COLS) | 0][c % COLS] = 0;
    });

    const PAC = [0, 1, 2, 3].map((d) => [0, 1, 2].map((f) => pacSprite(d, f)));
    const items = ITEM_AT.map((pi, i) => {
      const c = PATH[pi];
      return {
        pi,
        c,
        x: c % COLS,
        y: (c / COLS) | 0,
        i,
        col: P[i],
        spr: iconSprite(ICONS[i], P[i]),
        wh: iconSprite(ICONS[i], INK),
        dim: iconSprite(ICONS[i], DIM),
        done: 0,
        doneT: -9,
      };
    });

    const dots = new Uint8Array(COLS * ROWS);
    const dotList = PATH.filter((_, i) => i > 0 && !ITEM_AT.includes(i));

    /* Paredes cacheadas */
    const wN = (() => {
      const c = mkCanvas(COLS * TILE, ROWS * TILE);
      const g = c.getContext('2d')!;
      g.fillStyle = WALL;
      const open = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < COLS && y < ROWS && !wall[y][x];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (wall[y][x]) {
            const X = x * TILE;
            const Y = y * TILE;
            if (open(x, y - 1)) g.fillRect(X, Y, TILE, 1);
            if (open(x, y + 1)) g.fillRect(X, Y + TILE - 1, TILE, 1);
            if (open(x - 1, y)) g.fillRect(X, Y, 1, TILE);
            if (open(x + 1, y)) g.fillRect(X + TILE - 1, Y, 1, TILE);
            for (const [dx, dy] of [
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
            ]) {
              if (open(x + dx, y + dy) && !open(x + dx, y) && !open(x, y + dy)) {
                g.fillRect(dx < 0 ? X : X + TILE - 1, dy < 0 ? Y : Y + TILE - 1, 1, 1);
              }
            }
          }
        }
      }
      return c;
    })();

    let S: 'ready' | 'run' | 'eat' | 'win' = 'ready';
    let t = 0;
    let idx = 0;
    let score = 0;
    let pac = { x: PATH[0] % COLS, y: (PATH[0] / COLS) | 0, dir: 0 };
    let q: number[] = [];
    let eatT = 0;
    let eatDone = 0;
    let winT = 0;
    let anim = 0;
    let started = true;
    let vis = true;
    let last = 0;
    let rafId = 0;
    const parts: Particle[] = [];

    function reset() {
      S = 'ready';
      t = 0;
      idx = 0;
      score = 0;
      winT = 0;
      parts.length = 0;
      q = [];
      eatT = 0;
      eatDone = 0;
      pac = { x: PATH[0] % COLS, y: (PATH[0] / COLS) | 0, dir: 0 };
      items.forEach((item) => {
        item.done = 0;
        item.doneT = -9;
      });
      dots.fill(0);
      dotList.forEach((c) => {
        dots[c] = 1;
      });
    }

    function leg() {
      const cur = PATH.indexOf(Math.round(pac.y) * COLS + Math.round(pac.x));
      q = PATH.slice(cur + 1, items[idx].pi + 1);
    }

    function burst(it: (typeof items)[number]) {
      const x = it.x * TILE + 4;
      const y = OY + it.y * TILE + 4;
      const k = RM ? 0.5 : 1;
      parts.push({ k: 'ring', x, y, life: 0.4, max: 0.4, c: it.col });
      parts.push({ k: 'txt', x, y: y - 8, vx: 0, vy: -22, life: 0.8, max: 0.8, c: it.col, t: '500' });
      for (let j = 0; j < 18 * k; j++) {
        const a = Math.random() * 6.283;
        const s = 30 + Math.random() * 60;
        parts.push({
          k: 'sq',
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          g: 70,
          life: 0.4 + Math.random() * 0.4,
          max: 0.8,
          c: j % 4 ? it.col : RED,
          s: 2,
        });
      }
    }

    function arrive(x: number, y: number) {
      const c = y * COLS + x;
      if (dots[c]) {
        dots[c] = 0;
        score += 10;
      }
      if (idx < 7 && c === items[idx].c) {
        S = 'eat';
        eatT = 0;
        eatDone = 0;
      }
    }

    function move(dt: number) {
      let d = SPEED * dt;
      while (d > 0 && S === 'run') {
        if (!q.length) {
          leg();
          break;
        }
        const c = q[0];
        const tx = c % COLS;
        const ty = (c / COLS) | 0;
        const dx = tx - pac.x;
        const dy = ty - pac.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dx > 0) pac.dir = 0;
        else if (dx < 0) pac.dir = 2;
        else if (dy > 0) pac.dir = 1;
        else if (dy < 0) pac.dir = 3;
        if (d >= dist - 1e-9) {
          pac.x = tx;
          pac.y = ty;
          d -= dist;
          q.shift();
          arrive(tx, ty);
        } else {
          pac.x += Math.sign(dx) * d;
          pac.y += Math.sign(dy) * d;
          d = 0;
        }
      }
    }

    function update(dt: number) {
      anim += dt;
      if (S === 'ready') {
        t += dt;
        if (started && t > 1.2) {
          S = 'run';
          leg();
        }
      } else if (S === 'run') {
        move(dt);
      } else if (S === 'eat') {
        eatT += dt;
        if (!eatDone && eatT >= 0.14) {
          eatDone = 1;
          const it = items[idx];
          it.done = 1;
          it.doneT = anim;
          score += 500;
          burst(it);
          idx++;
        }
        if (eatT >= 0.45) {
          if (idx >= 7) {
            S = 'win';
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          } else {
            S = 'run';
            leg();
          }
        }
      } else if (S === 'win') {
        winT += dt;
        // Se repite automáticamente en bucle continuo tras una breve celebración
        if (winT >= 1.6) {
          reset();
          S = 'run';
          leg();
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        if (p.k === 'ring') continue;
        if (p.k === 'sq' && p.g) p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    function pacFrame() {
      if (S === 'ready') return 1;
      if (S === 'eat') return eatT < 0.14 ? 2 : eatT < 0.26 ? 0 : 1;
      if (S === 'run' && q.length === 1) return 2;
      return [0, 1, 2, 1][Math.floor(anim * 16) % 4];
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, LW, LH);
      const win = S === 'win';

      /* Laberinto y puntos */
      ctx.drawImage(wN, 0, OY);
      ctx.fillStyle = DOT;
      for (const c of dotList) {
        if (dots[c]) ctx.fillRect((c % COLS) * TILE + 3, OY + ((c / COLS) | 0) * TILE + 3, 2, 2);
      }

      /* Competencias */
      for (const it of items) {
        if (it.done) continue;
        const eating = S === 'eat' && items[idx] === it && eatT < 0.14;
        const flash = eating && Math.floor(eatT * 30) % 2 === 0;
        ctx.drawImage(
          flash ? it.wh : it.spr,
          it.x * TILE,
          OY + it.y * TILE + (eating ? 0 : -(Math.floor(anim * 3) % 2))
        );
      }

      /* Pac-Man */
      const f = win ? [0, 1, 2, 1][Math.floor(anim * 16) % 4] : pacFrame();
      ctx.drawImage(PAC[pac.dir][f], Math.round(pac.x * TILE) - 2, OY + Math.round(pac.y * TILE) - 2);

      /* Pie: objetivo actual + progreso */
      const tg = items[Math.min(idx, 6)];
      const nm = NAMES[tg.i];
      const cl = tg.col;
      if (S === 'ready') {
        txt(ctx, '¡LISTO!', 124, 56, 2, RED, 'c');
      } else {
        txt(ctx, nm[0], 124, 54, 1, cl, 'c');
        txt(ctx, nm[1], 124, 65, 1, cl, 'c');
      }

      items.forEach((it, i) => {
        const d = anim - it.doneT;
        ctx.drawImage(
          !it.done ? it.dim : d < 0.35 && Math.floor(d * 20) % 2 === 0 ? it.wh : it.spr,
          72 + i * 16,
          76
        );
      });

      /* Partículas */
      for (const p of parts) {
        const a = p.life / p.max;
        if (p.k === 'ring') {
          const r = 3 + (1 - a) * 13;
          ctx.fillStyle = p.c;
          for (let j = 0; j < 16; j++) {
            const an = (j / 16) * 6.283;
            ctx.fillRect(Math.round(p.x + Math.cos(an) * r), Math.round(p.y + Math.sin(an) * r), 1, 1);
          }
        } else if (p.k === 'txt') {
          txt(ctx, p.t, Math.round(p.x), Math.round(p.y), 1, p.c, 'c');
        } else {
          ctx.fillStyle = p.c;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        }
      }
    }

    function fit() {
      if (!root || !cv) return;
      const av = root.clientWidth;
      if (!av) return;
      const raw = av / LW;
      const scale = raw >= 2 ? Math.floor(raw) : raw;
      const maxScale = compact ? 2 : 3;
      const clamped = Math.min(scale, maxScale);
      cv.style.width = `${Math.round(LW * clamped)}px`;
      cv.style.height = `${Math.round(LH * clamped)}px`;
    }

    function replay() {
      if (S === 'win') {
        reset();
        started = true;
        t = 0.8;
      }
    }
    replayFnRef.current = replay;

    function frame(now: number) {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000 || 0, 0.05);
      last = now;
      if (!vis) return;
      update(dt);
      draw();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        replay();
      }
    };

    cv.addEventListener('click', replay);
    cv.addEventListener('keydown', onKeyDown);

    const resizeObs = new ResizeObserver(fit);
    resizeObs.observe(root);
    window.addEventListener('resize', fit);

    const interObs = new IntersectionObserver(
      (entries) => {
        const r = entries[0]?.intersectionRatio ?? 0;
        vis = r > 0.08;
        if (r >= 0.3) started = true;
      },
      { threshold: [0, 0.08, 0.3, 0.6] }
    );
    interObs.observe(cv);

    reset();
    fit();
    update(0);
    draw();
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      cv.removeEventListener('click', replay);
      cv.removeEventListener('keydown', onKeyDown);
      resizeObs.disconnect();
      window.removeEventListener('resize', fit);
      interObs.disconnect();
      replayFnRef.current = null;
    };
  }, [compact]);

  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-120' : 'max-w-160'}`}>
      <div ref={containerRef} className="flex w-full justify-center">
        <canvas
          ref={canvasRef}
          width={LW}
          height={LH}
          tabIndex={0}
          role="img"
          aria-label="Animación continua: un personaje rojo recorre un camino recto y recoge en bucle las siete competencias fundamentales del currículo dominicano."
          className="block touch-manipulation bg-transparent cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DEAE4D]"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}

