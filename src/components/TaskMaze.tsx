import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIONS,
  GOAL,
  GRID,
  REVERSE_ACTION,
  START,
  WALLS,
  bestAction,
  bfsHintAction,
  bfsOptimal,
  chooseAction,
  isBlocked,
  manhattan,
  qUpdate,
  type QTable,
} from "@/lib/bootcamp";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// A bad episode should take at most ~20 clicks to play out, not 60.
const MAX_STEPS = 20;
// How many steps over BFS-optimal still counts as "trained well enough".
const PASS_BUFFER = 2;
// Episodes without hitting the target before the "stuck" hint unlocks.
const HINT_UNLOCK_EPISODES = 5;

type Pending = { r: number; c: number; a: number; nr: number; nc: number } | null;
type Transition = {
  r: number;
  c: number;
  a: number;
  reward: number;
  nr: number;
  nc: number;
  terminal: boolean;
};
type EventKind = "info" | "auto" | "reward" | "punish" | "success";
type Event = { text: string; kind: EventKind };

// up, down, left, right — matches ACTIONS order in lib/bootcamp.ts
const ARROW_ROTATION = [0, 180, 270, 90];
const DIRECTION_WORD = ["up", "down", "left", "right"];

const EVENT_STYLE: Record<EventKind, { bg: string; fg: string; label: string }> = {
  info: { bg: "transparent", fg: "var(--muted-foreground, #7a7a7a)", label: "" },
  auto: { bg: "#eef1f5", fg: "#3f5170", label: "Auto rule" },
  reward: { bg: "#e6ede6", fg: "#2e6b3e", label: "You" },
  punish: { bg: "#f2e5e5", fg: "#a13a3a", label: "You" },
  success: { bg: "#e6ede6", fg: "#2e6b3e", label: "" },
};

export function TaskMaze({ done, onComplete }: { done: boolean; onComplete: () => void }) {
  const optimal = useMemo(() => bfsOptimal(), []);
  const q = useRef<QTable>({});
  const epsilon = useRef(0.35);
  // Every transition (auto and clicked) from the current episode, in the
  // order it happened. Replayed backward at episode end — see endEpisode.
  const trace = useRef<Transition[]>([]);

  const [pos, setPos] = useState<[number, number]>(START);
  const [episode, setEpisode] = useState(0);
  const [steps, setSteps] = useState(0);
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [event, setEvent] = useState<Event>({
    text: "Read the rules, then start your first episode when ready.",
    kind: "info",
  });
  const [direction, setDirection] = useState(0);
  const [walkKey, setWalkKey] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);
  const [impactCell, setImpactCell] = useState<[number, number] | null>(null);
  const [finishKey, setFinishKey] = useState(0);
  const [complete, setComplete] = useState(false);
  const [qVersion, setQVersion] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (complete && !done) onComplete();
  }, [complete, done, onComplete]);

  // The hint is "from where you are right now" — stale the moment the car
  // moves, so it always closes on the next step instead of misleading.
  useEffect(() => {
    setShowHint(false);
  }, [pos]);

  const best = history.length ? Math.min(...history) : null;
  const passSteps = optimal + PASS_BUFFER;
  const hintAvailable = !complete && episode >= HINT_UNLOCK_EPISODES;
  const hint = showHint ? bfsHintAction(pos[0], pos[1]) : null;

  const endEpisode = (finalSteps: number, reached: boolean) => {
    setRunning(false);
    setPending(null);
    setHistory((h) => [...h, finalSteps]);
    epsilon.current = Math.max(0.05, epsilon.current * 0.82);

    // Replay this episode's exact transitions backward, last move first.
    // Same rewards you (or the fixed auto-rules) already assigned — this
    // just lets a reached goal's value chain all the way back to the
    // first move in one pass, instead of trickling back over many
    // episodes the way plain forward-order updates do.
    for (let i = trace.current.length - 1; i >= 0; i--) {
      const t = trace.current[i]!;
      qUpdate(q.current, t.r, t.c, t.a, t.reward, t.nr, t.nc, t.terminal);
    }
    trace.current = [];
    setQVersion((v) => v + 1);

    if (reached && finalSteps <= passSteps) {
      setComplete(true);
      setEvent({
        text: `Reached the checkpoint in ${finalSteps} steps — within the ${passSteps}-step target. Task 3 complete!`,
        kind: "success",
      });
    } else if (reached) {
      setEvent({
        text: `Reached the checkpoint in ${finalSteps} steps. Target is ${passSteps} or fewer — try again.`,
        kind: "info",
      });
    } else {
      setEvent({
        text: `Episode stopped at ${MAX_STEPS} steps without reaching the checkpoint. That's expected sometimes — start another episode and keep being consistent with your rewards.`,
        kind: "info",
      });
    }
  };

  // `incomingAction` is the action that was just taken to arrive at (r, c)
  // — its reverse is excluded from the next choice so the car can't
  // immediately undo its own last move. Null only for the very first move
  // of an episode, when there's nothing to reverse yet.
  const step = (r: number, c: number, count: number, incomingAction: number | null = null) => {
    if (count >= MAX_STEPS) {
      endEpisode(count, false);
      return;
    }
    const exclude = incomingAction === null ? null : REVERSE_ACTION[incomingAction];
    const a = chooseAction(q.current, r, c, epsilon.current, exclude);
    const act = ACTIONS[a]!;
    const nr = r + act[0];
    const nc = c + act[1];
    const newSteps = count + 1;
    setSteps(newSteps);
    setDirection(act[1] > 0 ? 0 : act[0] > 0 ? 90 : act[1] < 0 ? 180 : 270);

    if (isBlocked(nr, nc)) {
      qUpdate(q.current, r, c, a, -5, r, c, false);
      trace.current.push({ r, c, a, reward: -5, nr: r, nc: c, terminal: false });
      setQVersion((v) => v + 1);
      setBumpKey((k) => k + 1);
      setImpactCell([nr, nc]);
      setEvent({ text: "Crashed into a barrier — that's a fixed rule, always −5, no click needed.", kind: "auto" });
      window.setTimeout(() => setImpactCell(null), 360);
      // Still at (r, c) — keep excluding the same reversal on the retry.
      window.setTimeout(() => step(r, c, newSteps, incomingAction), 500);
      return;
    }

    setPos([nr, nc]);
    setWalkKey((k) => k + 1);

    if (nr === GOAL[0] && nc === GOAL[1]) {
      qUpdate(q.current, r, c, a, 50, nr, nc, true);
      trace.current.push({ r, c, a, reward: 50, nr, nc, terminal: true });
      setQVersion((v) => v + 1);
      setFinishKey((k) => k + 1);
      setEvent({ text: "Reached the checkpoint — that's a fixed rule too, always +50.", kind: "auto" });
      window.setTimeout(() => endEpisode(newSteps, true), 350);
      return;
    }

    // Waits here — nothing continues until you click Reward or Punish.
    // Your click is the only thing that trains this move; there is no
    // auto-continue and no hidden scoring.
    setEvent({ text: "Your call — was that a good move?", kind: "info" });
    setPending({ r, c, a, nr, nc });
  };

  const respond = (reward: number) => {
    if (!pending) return;
    const { r, c, a, nr, nc } = pending;
    qUpdate(q.current, r, c, a, reward, nr, nc, false);
    trace.current.push({ r, c, a, reward, nr, nc, terminal: false });
    setQVersion((v) => v + 1);
    setPending(null);
    setEvent(
      reward > 0
        ? { text: "Rewarded +10.", kind: "reward" }
        : { text: "Punished −10.", kind: "punish" },
    );
    // Pass `a` through as the incoming action, so the car can't immediately
    // reverse the move it was just judged on.
    window.setTimeout(() => step(nr, nc, steps, a), 350);
  };

  const start = () => {
    trace.current = [];
    setShowIntro(false);
    setShowHint(false);
    setEpisode((e) => e + 1);
    setPos(START);
    setSteps(0);
    setRunning(true);
    setEvent({ text: "The car is driving…", kind: "info" });
    window.setTimeout(() => step(START[0], START[1], 0), 300);
  };

  // Purely informational — tells the player a fact about the move that's
  // waiting for a verdict, without applying any reward itself. The click
  // is still what trains the car.
  const pendingCloser = pending ? manhattan(pending.r, pending.c, GOAL[0], GOAL[1]) - manhattan(pending.nr, pending.nc, GOAL[0], GOAL[1]) > 0 : null;

  return (
    <div className="animate-fade-in-up space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Task 3: Reinforcement Learning — Train the racing car</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The car starts at the starting line and has to reach the checkered checkpoint
          through the track, without crashing into a barrier. After each move, click Reward
          if it was a good move or Punish if it wasn&apos;t — your feedback is the only thing
          that shapes its Q-values. Run several episodes and watch it get faster.
        </p>
        <p className="mt-3 border-l-2 border-slate-accent pl-3 text-sm text-muted-foreground">
          This task uses reinforcement learning: the car doesn&apos;t know the best path in
          advance — it learns entirely from your rewards and punishments. The faint
          arrows on open cells show its current best guess at each state, and get
          brighter the more confident it becomes.
        </p>
      </header>

      <Accordion type="single" collapsible className="panel px-4">
        <AccordionItem value="q-learning" className="border-0">
          <AccordionTrigger>How this works</AccordionTrigger>
          <AccordionContent className="space-y-3 text-muted-foreground">
            <p>
              Each time you click Reward or Punish, the car updates a score for “how good
              was this move in this exact situation” using the Q-learning formula. Over
              many episodes, it starts preferring moves with higher scores — which is why
              it gets faster the more you train it.
            </p>
            <div className="overflow-x-auto rounded-md bg-muted px-3 py-2">
              <p className="mb-1 text-xs font-medium text-foreground">Q-value update</p>
              <p className="whitespace-nowrap font-mono text-xs text-foreground">
                Q(state, action) ← Q(state, action) + α × (reward + γ × max(Q(next state)) − Q(state, action))
              </p>
            </div>
            <p className="text-xs">
              A Q-value is a learned action score. Here, α controls how quickly the car
              learns, while γ controls how much it values future rewards.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {showIntro && (
        <div className="panel animate-fade-in-up space-y-3 p-4">
          <p className="text-sm font-semibold">Before you start</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>• Click <strong className="text-foreground">Start episode</strong>, then click <strong className="text-foreground">Reward</strong> or <strong className="text-foreground">Punish</strong> after every move — nothing happens until you click.</li>
            <li>• Two things are fixed rules, not your decision: crashing into a barrier always costs −5, and reaching the flag always earns +50.</li>
            <li>• Goal: get the car to the flag in <strong className="text-foreground">{passSteps} steps or fewer</strong> in a single episode.</li>
            <li>• This usually takes a handful of episodes as it learns from your feedback — early runs looking chaotic is normal, not a bug. If you're stuck past episode {HINT_UNLOCK_EPISODES}, a hint button unlocks.</li>
          </ul>
          <button
            onClick={start}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Got it — start training
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="panel w-full max-w-[412px] p-4 lg:w-[412px]">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-md bg-track-edge"
          >
            {WALLS.map((row, r) =>
              row.map((wall, c) => {
                const isStart = r === START[0] && c === START[1];
                const isGoal = r === GOAL[0] && c === GOAL[1];
                const guess = !wall ? bestAction(q.current, r, c) : null;
                const isHintCell = hint !== null && pos[0] === r && pos[1] === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="absolute"
                    style={{ left: `${c * 20}%`, top: `${r * 20}%`, width: "20%", height: "20%" }}
                  >
                    {wall ? (
                      <div
                        className={`relative h-full w-full p-[7px] ${
                          impactCell?.[0] === r && impactCell[1] === c
                            ? "animate-barrier-impact"
                            : ""
                        }`}
                      >
                        <div className="safety-barrier h-full w-full rounded-[3px] border border-barrier-edge shadow-sm" />
                        {impactCell?.[0] === r && impactCell[1] === c && (
                          <span className="impact-spark absolute bottom-2 left-2 h-4 w-4 rounded-full" />
                        )}
                      </div>
                    ) : (
                      <div className="relative h-full w-full p-[3px]">
                        <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-road">
                          {r > 0 && !WALLS[r - 1]?.[c] && <span className="track-line-v top-0" />}
                          {r < GRID - 1 && !WALLS[r + 1]?.[c] && <span className="track-line-v bottom-0" />}
                          {c > 0 && !WALLS[r]?.[c - 1] && <span className="track-line-h left-0" />}
                          {c < GRID - 1 && !WALLS[r]?.[c + 1] && <span className="track-line-h right-0" />}
                          {isStart && (
                            <div className="start-line absolute inset-y-1 left-2 w-5 border-y border-checker-dark" />
                          )}
                          {isGoal && (
                            <div
                              key={`finish-${finishKey}`}
                              className={`absolute inset-0 flex items-center justify-center ${
                                finishKey ? "animate-finish-flash" : ""
                              }`}
                            >
                              <svg aria-label="Checkered checkpoint" width="34" height="42" viewBox="0 0 34 42">
                                <rect x="5" y="4" width="2.5" height="34" rx="1" className="fill-checker-dark" />
                                <g className="finish-checkers">
                                  <rect x="7" y="5" width="20" height="16" className="fill-checker-light" />
                                  <path d="M7 5h5v4H7zm10 0h5v4h-5zm5 4h5v4h-5zM12 9h5v4h-5zm-5 4h5v4H7zm10 0h5v4h-5zm5 4h5v4h-5zM12 17h5v4h-5z" className="fill-checker-dark" />
                                </g>
                              </svg>
                            </div>
                          )}
                          {guess && !isGoal && (
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="pointer-events-none absolute right-1 top-1 h-3 w-3"
                              style={{
                                opacity: 0.2 + guess.confidence * 0.6,
                                transform: `rotate(${ARROW_ROTATION[guess.action]}deg)`,
                                transition: "opacity 300ms ease, transform 300ms ease",
                              }}
                            >
                              <path d="M12 3 L19 15 L12 11.5 L5 15 Z" className="fill-slate-accent" />
                            </svg>
                          )}
                          {isHintCell && hint !== null && (
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="pointer-events-none absolute inset-0 m-auto h-6 w-6 animate-badge-pop"
                              style={{ transform: `rotate(${ARROW_ROTATION[hint]}deg)` }}
                            >
                              <path d="M12 2 L20 16 L12 12 L4 16 Z" fill="#2e6b3e" stroke="#ffffff" strokeWidth="1" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }),
            )}

            <div
              className="pointer-events-none absolute transition-all duration-300 ease-out"
              style={{
                left: `${pos[1] * 20}%`,
                top: `${pos[0] * 20}%`,
                width: "20%",
                height: "20%",
              }}
            >
              <div
                key={`bump-${bumpKey}`}
                className={bumpKey ? "animate-car-skid h-full w-full" : "h-full w-full"}
              >
                <div
                  key={`walk-${walkKey}`}
                  className={`flex h-full w-full items-center justify-center ${
                    finishKey && pos[0] === GOAL[0] && pos[1] === GOAL[1]
                      ? "animate-car-finish"
                      : ""
                  }`}
                >
                  <svg aria-label="Racing car" className="h-[70%] w-[70%] overflow-visible" viewBox="-25 -18 50 36">
                    <g
                      className="car-heading"
                      style={{ transform: `rotate(${direction}deg)` }}
                    >
                      <circle cx="-11" cy="-14" r="4" className="fill-car-wheel" />
                      <circle cx="-11" cy="14" r="4" className="fill-car-wheel" />
                      <circle cx="11" cy="-14" r="4" className="fill-car-wheel" />
                      <circle cx="11" cy="14" r="4" className="fill-car-wheel" />
                      <rect x="-20" y="-13" width="40" height="26" rx="8" className="fill-primary" />
                      <path d="M18-8 24 0l-6 8z" className="fill-primary" />
                      <rect x="-8" y="-9" width="15" height="18" rx="4" className="fill-car-cabin" />
                      <path d="M8-8h6l4 5H8zM8 3h10l-4 5H8z" className="fill-car-glass" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat label="Episode" value={episode || "—"} />
              <Stat label="Steps this episode" value={steps} />
              <Stat label="Target" value={`≤ ${passSteps}`} accent />
              <Stat label="Best episode" value={best ?? "—"} />
              <Stat label="Optimal path (BFS)" value={optimal} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Most teams reach the target within {HINT_UNLOCK_EPISODES - 2}–{HINT_UNLOCK_EPISODES + 2} episodes of consistent feedback.
            </p>

            <div
              className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
              style={{ backgroundColor: EVENT_STYLE[event.kind].bg }}
            >
              {EVENT_STYLE[event.kind].label && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: "#ffffff", color: EVENT_STYLE[event.kind].fg }}
                >
                  {EVENT_STYLE[event.kind].label}
                </span>
              )}
              <span style={{ color: event.kind === "info" ? undefined : EVENT_STYLE[event.kind].fg }} className={event.kind === "info" ? "text-muted-foreground" : "font-medium"}>
                {event.text}
              </span>
            </div>

            {pending && (
              <p className="mt-2 text-xs text-muted-foreground">
                Fact, not a verdict: that move went {pendingCloser ? "closer to" : "farther from"} the flag. You decide whether that's worth rewarding.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={start}
                disabled={running}
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Start episode
              </button>
              {pending && (
                <>
                  <button
                    onClick={() => respond(10)}
                    className="animate-fade-in-up rounded-md px-3 py-2 text-sm font-medium"
                    style={{ backgroundColor: "#e6ede6", color: "#2e6b3e" }}
                  >
                    Reward +10
                  </button>
                  <button
                    onClick={() => respond(-10)}
                    className="animate-fade-in-up rounded-md px-3 py-2 text-sm font-medium"
                    style={{ backgroundColor: "#f2e5e5", color: "#a13a3a" }}
                  >
                    Punish −10
                  </button>
                </>
              )}
              {!pending && !running && (
                <button
                  onClick={() => setShowHint((v) => !v)}
                  disabled={!hintAvailable}
                  title={hintAvailable ? undefined : `Unlocks after ${HINT_UNLOCK_EPISODES} episodes`}
                  className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {showHint ? "Hide hint" : "Need a hint?"}
                </button>
              )}
            </div>
            {showHint && hint !== null && (
              <p className="animate-fade-in-up mt-2 text-xs text-muted-foreground">
                From where the car is right now, the shortest path continues {DIRECTION_WORD[hint]}.
              </p>
            )}
            {complete && (
              <p className="animate-fade-in-up mt-3 rounded-md bg-success-bg px-3 py-2 text-sm text-success">
                Task 3 complete — the car found a near-optimal route.
              </p>
            )}
          </div>

          <div className="panel p-4">
            <p className="text-sm font-medium">Steps per episode</p>
            {history.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No episodes yet.</p>
            ) : (
              <div className="mt-3 flex h-28 items-end gap-1.5">
                {history.map((s, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-[3px] transition-[height] duration-300"
                      style={{
                        height: `${(s / Math.max(...history)) * 88}px`,
                        backgroundColor: s === best ? "#2e6b3e" : "#cfcfcf",
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className="text-base font-semibold tabular-nums"
        style={accent ? { color: "#3f5170" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
