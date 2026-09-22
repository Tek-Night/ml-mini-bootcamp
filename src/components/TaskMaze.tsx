import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIONS,
  GOAL,
  GRID,
  START,
  WALLS,
  bfsOptimal,
  chooseAction,
  isBlocked,
  qUpdate,
  type QTable,
} from "@/lib/bootcamp";

const MAX_STEPS = 60;

type Pending = { r: number; c: number; a: number; nr: number; nc: number } | null;

export function TaskMaze({ done, onComplete }: { done: boolean; onComplete: () => void }) {
  const optimal = useMemo(() => bfsOptimal(), []);
  const q = useRef<QTable>({});
  const epsilon = useRef(0.35);

  const [pos, setPos] = useState<[number, number]>(START);
  const [episode, setEpisode] = useState(0);
  const [steps, setSteps] = useState(0);
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [message, setMessage] = useState("Press “Start episode” to let the robot explore.");
  const [direction, setDirection] = useState(0);
  const [walkKey, setWalkKey] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);
  const [impactCell, setImpactCell] = useState<[number, number] | null>(null);
  const [finishKey, setFinishKey] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (complete && !done) onComplete();
  }, [complete, done, onComplete]);

  const best = history.length ? Math.min(...history) : null;

  const endEpisode = (finalSteps: number, reached: boolean) => {
    setRunning(false);
    setPending(null);
    setHistory((h) => [...h, finalSteps]);
    epsilon.current = Math.max(0.05, epsilon.current * 0.82);
    if (reached && finalSteps <= optimal + 2) {
      setComplete(true);
      setMessage(
        `Goal reached in ${finalSteps} steps — within ${optimal + 2}. Task 3 complete!`,
      );
    } else if (reached) {
      setMessage(`Goal reached in ${finalSteps} steps. Target is ${optimal + 2} or fewer.`);
    } else {
      setMessage("Episode stopped — the robot wandered too long. Try another episode.");
    }
  };

  const step = (r: number, c: number, count: number) => {
    if (count >= MAX_STEPS) {
      endEpisode(count, false);
      return;
    }
    const a = chooseAction(q.current, r, c, epsilon.current);
    const act = ACTIONS[a]!;
    const nr = r + act[0];
    const nc = c + act[1];
    const newSteps = count + 1;
    setSteps(newSteps);
    setDirection(act[1] > 0 ? 0 : act[0] > 0 ? 90 : act[1] < 0 ? 180 : 270);

    if (isBlocked(nr, nc)) {
      qUpdate(q.current, r, c, a, -5, r, c, false);
      setBumpKey((k) => k + 1);
      setImpactCell([nr, nc]);
      setMessage("Crashed into a barrier — auto-penalized, continuing.");
      window.setTimeout(() => setImpactCell(null), 360);
      window.setTimeout(() => step(r, c, newSteps), 650);
      return;
    }

    setPos([nr, nc]);
    setWalkKey((k) => k + 1);

    if (nr === GOAL[0] && nc === GOAL[1]) {
      qUpdate(q.current, r, c, a, 50, nr, nc, true);
      setFinishKey((k) => k + 1);
      setMessage("Finished! Reached the checkpoint.");
      window.setTimeout(() => endEpisode(newSteps, true), 350);
      return;
    }

    setMessage("Was that a good move? Reward or punish the robot.");
    setPending({ r, c, a, nr, nc });
  };

  const respond = (reward: number) => {
    if (!pending) return;
    const { r, c, a, nr, nc } = pending;
    qUpdate(q.current, r, c, a, reward, nr, nc, false);
    setPending(null);
    setMessage(reward > 0 ? "Rewarded +10." : "Punished −10.");
    window.setTimeout(() => step(nr, nc, steps), 350);
  };

  const start = () => {
    setEpisode((e) => e + 1);
    setPos(START);
    setSteps(0);
    setRunning(true);
    setMessage("The robot is walking…");
    window.setTimeout(() => step(START[0], START[1], 0), 300);
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Task 3 — Train the racing car</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The car starts at the starting line and has to reach the checkered checkpoint
          through the track, without crashing into a barrier. After each move, click Reward
          if it was a good move or Punish if it wasn&apos;t — your feedback shapes its Q-values.
          Run several episodes and watch it get faster. Finish in {optimal + 2} steps or
          fewer to complete the task.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="panel w-full max-w-[412px] p-4">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-md bg-track-edge"
          >
            {WALLS.map((row, r) =>
              row.map((wall, c) => {
                const isStart = r === START[0] && c === START[1];
                const isGoal = r === GOAL[0] && c === GOAL[1];
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Episode" value={episode || "—"} />
              <Stat label="Steps this episode" value={steps} />
              <Stat label="Optimal path (BFS)" value={optimal} />
              <Stat label="Best episode" value={best ?? "—"} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{message}</p>
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
            </div>
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
