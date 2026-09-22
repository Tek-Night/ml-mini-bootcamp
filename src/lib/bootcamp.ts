export type Progress = { t1: boolean; t2: boolean; t3: boolean };

const KEY = "ml-mini-bootcamp:v1";
const TIMER_KEY = "ml-mini-bootcamp:start";

export const emptyProgress: Progress = { t1: false, t2: false, t3: false };

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProgress;
    const p = JSON.parse(raw) as Partial<Progress>;
    return { t1: !!p.t1, t2: !!p.t2, t3: !!p.t3 };
  } catch {
    return emptyProgress;
  }
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
// true = building (blocked)
export const WALLS: boolean[][] = [
  [false, false, true, false, false],
  [false, false, true, false, false],
  [false, false, false, false, true],
  [true, true, false, true, false],
  [false, false, false, false, false],
];
export const START: [number, number] = [0, 0];
export const GOAL: [number, number] = [4, 4];

export const ACTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export function isBlocked(r: number, c: number) {
  return r < 0 || c < 0 || r >= GRID || c >= GRID || WALLS[r][c];
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
  cur[a] = cur[a] + ALPHA * (reward + GAMMA * best - cur[a]);
}

export function chooseAction(q: QTable, r: number, c: number, epsilon: number): number {
  if (Math.random() < epsilon) return Math.floor(Math.random() * 4);
  const vals = qGet(q, r, c);
  let best = 0;
  for (let i = 1; i < 4; i++) if (vals[i] > vals[best]) best = i;
  return best;
}
