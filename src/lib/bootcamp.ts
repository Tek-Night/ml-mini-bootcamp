export type Progress = {
  t1: boolean;
  t2: boolean;
  t3: boolean;
  r2?: number;
  accuracy?: number;
  bestSteps?: number;
  finalScore?: number;
  finalCode?: string;
};

const KEY = "ml-mini-bootcamp:v1";
const TIMER_KEY = "ml-mini-bootcamp:start";

export const emptyProgress: Progress = { t1: false, t2: false, t3: false };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProgress;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      t1: !!p.t1,
      t2: !!p.t2,
      t3: !!p.t3,
      r2: num(p.r2),
      accuracy: num(p.accuracy),
      bestSteps: num(p.bestSteps),
      finalScore: num(p.finalScore),
      finalCode: typeof p.finalCode === "string" ? p.finalCode : undefined,
    };
  } catch {
    return emptyProgress;
  }
}

/* ---------- Final score ---------- */

export function scoreBreakdown(p: Progress, optimal: number) {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const reg = Math.min(34, Math.round(clamp(p.r2 ?? 0, 0, 1) * 34));
  const spam = Math.round(((p.accuracy ?? 0) / 100) * 33);
  const maze =
    p.bestSteps === undefined
      ? 0
      : Math.round(clamp(1 - (p.bestSteps - optimal) / optimal, 0, 1) * 33);
  const total = clamp(Math.round(reg + spam + maze), 0, 100);
  return { reg, spam, maze, total };
}

const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PRIME = 381001n;
const SECRET_KEY = 98765n;

export function encryptScore(score: number): string {
  if (score < 0 || score > 100) throw new Error("Score out of range");
  const v = BigInt(Math.trunc(score)) * PRIME + SECRET_KEY;
  const code: string[] = new Array(6);
  let power = 1n;
  for (let i = 0; i < 6; i++) {
    const d = (v / power) % 36n;
    let c = (d + SECRET_KEY + BigInt(i)) % 36n;
    if (c < 0n) c += 36n;
    code[i] = CHARSET[Number(c)]!;
    power *= 36n;
  }
  return code.join("");
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function getStartTime(): number {
  try {
    const raw = window.localStorage.getItem(TIMER_KEY);
    if (raw) return Number(raw);
  } catch {
    /* ignore */
  }
  const now = Date.now();
  try {
    window.localStorage.setItem(TIMER_KEY, String(now));
  } catch {
    /* ignore */
  }
  return now;
}

export function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- Task 1: regression data ---------- */

export type Point = { x: number; y: number };

export const TRUE_SLOPE = 12.5;
export const TRUE_INTERCEPT = 22.5;

// Deterministic pseudo-random so the dataset is stable per session seed.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePoints(seed = 7): Point[] {
  const rnd = mulberry32(seed);
  const pts: Point[] = [];
  for (let i = 0; i < 24; i++) {
    const x = 1 + (4 * (i + rnd() * 0.8)) / 24.8;
    const noise = (rnd() * 2 - 1) * 8;
    const y = Math.min(100, Math.max(20, TRUE_SLOPE * x + TRUE_INTERCEPT + noise));
    pts.push({ x, y });
  }
  return pts;
}

export function leastSquares(points: Point[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

export function rSquared(points: Point[], slope: number, intercept: number) {
  const my = points.reduce((s, p) => s + p.y, 0) / points.length;
  let sse = 0;
  let sst = 0;
  for (const p of points) {
    sse += (p.y - (slope * p.x + intercept)) ** 2;
    sst += (p.y - my) ** 2;
  }
  if (sst === 0) return 0;
  return 1 - sse / sst;
}

/* ---------- Task 2: naive bayes ---------- */

export type NBModel = {
  counts: Record<"spam" | "ham", Record<string, number>>;
  totals: Record<"spam" | "ham", number>;
  vocab: string[];
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function trainNaiveBayes(spam: string[], ham: string[]): NBModel {
  const counts = { spam: {} as Record<string, number>, ham: {} as Record<string, number> };
  const totals = { spam: 0, ham: 0 };
  const vocab = new Set<string>();
  const add = (cls: "spam" | "ham", docs: string[]) => {
    for (const doc of docs) {
      for (const w of tokenize(doc)) {
        counts[cls][w] = (counts[cls][w] ?? 0) + 1;
        totals[cls] += 1;
        vocab.add(w);
      }
    }
  };
  add("spam", spam);
  add("ham", ham);
  return { counts, totals, vocab: [...vocab] };
}

export function classify(model: NBModel, text: string): "spam" | "ham" {
  const V = model.vocab.length || 1;
  const score = (cls: "spam" | "ham") => {
    let s = Math.log(0.5); // equal priors
    for (const w of tokenize(text)) {
      const c = model.counts[cls][w] ?? 0;
      s += Math.log((c + 1) / (model.totals[cls] + V));
    }
    return s;
  };
  return score("spam") >= score("ham") ? "spam" : "ham";
}

export const SAMPLE_SPAM = [
  "Congratulations you won a free lottery prize claim now",
  "Cheap meds online discount offer buy now limited",
  "Urgent your account will be closed click this link",
  "Earn money fast from home work only two hours",
  "Free crypto bonus double your investment today winner",
];

export const SAMPLE_HAM = [
  "Reminder the department seminar starts at four in room 204",
  "Please find attached the corrected assignment marks sheet",
  "Can we reschedule the project review meeting to Thursday",
  "The lab manual for the next practical is uploaded on the portal",
  "Thanks for reviewing my paper draft I fixed the references",
];

export const TEST_EMAILS: { text: string; label: "spam" | "ham" }[] = [
  { text: "Claim your free prize money now limited offer", label: "spam" },
  { text: "Urgent click this link to verify your bank account", label: "spam" },
  { text: "Buy cheap discount meds online today", label: "spam" },
  { text: "You are a lucky winner of a free crypto bonus", label: "spam" },
  { text: "Work from home and earn fast money weekly", label: "spam" },
  { text: "Double your investment now with this exclusive offer", label: "spam" },
  { text: "The seminar on machine learning is at three in room 110", label: "ham" },
  { text: "Attached is the corrected marks sheet for the lab", label: "ham" },
  { text: "Can we reschedule our meeting about the project report", label: "ham" },
  { text: "The assignment portal upload deadline is Friday evening", label: "ham" },
  { text: "Thanks for the paper draft I reviewed the references", label: "ham" },
  { text: "Please bring the practical manual to the department lab", label: "ham" },
];

/* ---------- Task 3: maze + Q-learning ---------- */

export const GRID = 5;
// true = building (blocked). Kept fairly open on purpose — the true
// Manhattan-shortest distance from START to GOAL is 8, and this layout
// still has an unobstructed 8-step route, so BFS-optimal stays 8. Fewer
// walls than the original layout means fewer clicks get burned on wall-
// bump recovery instead of real progress.
export const WALLS: boolean[][] = [
  [false, false, true, false, false],
  [false, false, true, false, false],
  [false, false, false, false, false],
  [false, true, false, true, false],
  [false, false, false, false, false],
];
export const START: [number, number] = [0, 0];
export const GOAL: [number, number] = [4, 4];

// Order matters — it's also the arrow-rotation lookup in TaskMaze.tsx.
// 0 = up, 1 = down, 2 = left, 3 = right.
export const ACTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export function isBlocked(r: number, c: number) {
  return r < 0 || c < 0 || r >= GRID || c >= GRID || !!WALLS[r]![c];
}

export function bfsOptimal(): number {
  const seen = new Set<string>([START.join(",")]);
  let frontier: [number, number][] = [START];
  let d = 0;
  while (frontier.length) {
    const next: [number, number][] = [];
    for (const [r, c] of frontier) {
      if (r === GOAL[0] && c === GOAL[1]) return d;
      for (const [dr, dc] of ACTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (isBlocked(nr, nc)) continue;
        const k = `${nr},${nc}`;
        if (seen.has(k)) continue;
        seen.add(k);
        next.push([nr, nc]);
      }
    }
    frontier = next;
    d += 1;
  }
  return Infinity;
}

export const ALPHA = 0.5;
export const GAMMA = 0.9;
export type QTable = Record<string, number[]>;

export function qGet(q: QTable, r: number, c: number): number[] {
  const k = `${r},${c}`;
  if (!q[k]) q[k] = [0, 0, 0, 0];
  return q[k];
}

export function qUpdate(
  q: QTable,
  r: number,
  c: number,
  a: number,
  reward: number,
  nr: number,
  nc: number,
  terminal: boolean,
) {
  const cur = qGet(q, r, c);
  const best = terminal ? 0 : Math.max(...qGet(q, nr, nc));
  cur[a] = cur[a]! + ALPHA * (reward + GAMMA * best - cur[a]!);
}

// Epsilon-greedy action choice. Ties are broken RANDOMLY — a fresh
// all-zero Q-table no longer always prefers "up" first, which used to
// bias early behavior toward the same wall/edge every time instead of
// exploring evenly.
//
// `exclude` is the reverse of the action that was just taken to arrive at
// (r, c), or null if this is the first move of the episode. Excluding it
// stops the agent from immediately undoing its last move — undoing
// progress is never part of a shortest path anyway, and without this a
// reward/punish pair can cancel itself out forever (forward, reward,
// immediately back, punish, forward again...) since the reverse action
// starts at Q=0 and gets re-tried by exploration before it's learned.
export function chooseAction(
  q: QTable,
  r: number,
  c: number,
  epsilon: number,
  exclude: number | null = null,
): number {
  const candidates = exclude === null ? [0, 1, 2, 3] : [0, 1, 2, 3].filter((i) => i !== exclude);
  if (Math.random() < epsilon) {
    return candidates[Math.floor(Math.random() * candidates.length)]!;
  }
  const vals = qGet(q, r, c);
  let maxVal = -Infinity;
  for (const i of candidates) if (vals[i]! > maxVal) maxVal = vals[i]!;
  const bestIdxs = candidates.filter((i) => vals[i] === maxVal);
  return bestIdxs[Math.floor(Math.random() * bestIdxs.length)]!;
}

// Reverse-direction lookup: 0=up/1=down are opposites, 2=left/3=right are
// opposites. Matches ACTIONS order in this file.
export const REVERSE_ACTION = [1, 0, 3, 2] as const;

// For rendering the agent's current "best guess" policy as arrows on the
// grid. Returns null for a never-visited cell (nothing learned yet there).
// `confidence` is a rough 0-1 normalization of how far the best action's
// value is from the others, used to fade the arrow in as learning firms up.
export function bestAction(
  q: QTable,
  r: number,
  c: number,
): { action: number; confidence: number } | null {
  const k = `${r},${c}`;
  const vals = q[k];
  if (!vals || vals.every((v) => v === 0)) return null;
  let best = 0;
  for (let i = 1; i < 4; i++) if (vals[i]! > vals[best]!) best = i;
  const spread = Math.max(...vals) - Math.min(...vals);
  const confidence = Math.min(1, spread / 20);
  return { action: best, confidence };
}

export function manhattan(r: number, c: number, gr: number, gc: number) {
  return Math.abs(r - gr) + Math.abs(c - gc);
}

// True shortest-path distance from every open cell to the goal, honoring
// walls (BFS outward from the goal). Used only for the optional "stuck"
// hint and the honest distance note next to Reward/Punish — never for
// automatic training, which stays entirely player-driven.
export function distanceField(): number[][] {
  const dist: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(Infinity));
  dist[GOAL[0]]![GOAL[1]] = 0;
  let frontier: [number, number][] = [GOAL];
  while (frontier.length) {
    const next: [number, number][] = [];
    for (const [r, c] of frontier) {
      for (const [dr, dc] of ACTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (isBlocked(nr, nc)) continue;
        if (dist[nr]![nc]! > dist[r]![c]! + 1) {
          dist[nr]![nc] = dist[r]![c]! + 1;
          next.push([nr, nc]);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

// The optimal next action from (r, c), for the "Show a hint" safety net.
// Returns null at the goal itself or if the cell is somehow unreachable.
export function bfsHintAction(r: number, c: number): number | null {
  const dist = distanceField();
  const cur = dist[r]?.[c];
  if (cur === undefined || cur === Infinity || cur === 0) return null;
  let best: number | null = null;
  let bestDist = cur;
  for (let a = 0; a < 4; a++) {
    const [dr, dc] = ACTIONS[a]!;
    const nr = r + dr;
    const nc = c + dc;
    if (isBlocked(nr, nc)) continue;
    const d = dist[nr]?.[nc];
    if (d !== undefined && d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}
