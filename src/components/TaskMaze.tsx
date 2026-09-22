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

const CELL = 76;
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
  const [facing, setFacing] = useState(1);
  const [walkKey, setWalkKey] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);
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
    if (act[1] !== 0) setFacing(act[1] > 0 ? 1 : -1);

    if (isBlocked(nr, nc)) {
      qUpdate(q.current, r, c, a, -5, r, c, false);
      setBumpKey((k) => k + 1);
      setMessage("Bumped into a building — automatic penalty of −5.");
      window.setTimeout(() => step(r, c, newSteps), 650);
      return;
    }

    setPos([nr, nc]);
    setWalkKey((k) => k + 1);

    if (nr === GOAL[0] && nc === GOAL[1]) {
      qUpdate(q.current, r, c, a, 50, nr, nc, true);
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
        <h2 className="text-lg font-semibold">Task 3 — Train the walking robot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The robot learns your neighbourhood by trial and error. Reward or punish each
          move; it reaches the flag on its own. Finish an episode in {optimal + 2} steps or
          fewer to complete the task.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="panel p-4">
          <div
            className="relative"
            style={{ width: CELL * GRID, height: CELL * GRID, maxWidth: "100%" }}
          >
            {WALLS.map((row, r) =>
              row.map((wall, c) => {
                const isStart = r === START[0] && c === START[1];
                const isGoal = r === GOAL[0] && c === GOAL[1];
                return (
                  <div
                    key={`${r}-${c}`}
                    className="absolute"
                    style={{ left: c * CELL, top: r * CELL, width: CELL, height: CELL }}
                  >
                    {wall ? (
                      <div className="relative h-full w-full p-2">
                        <div
                          className="absolute inset-x-3 bottom-3 top-6 rounded-[3px]"
                          style={{ backgroundColor: "#b6a894", boxShadow: "0 3px 6px rgba(0,0,0,0.12)" }}
                        />
                        <div
                          className="absolute left-1.5 right-1.5 top-3"
                          style={{
                            height: 0,
                            borderLeft: "26px solid transparent",
                            borderRight: "26px solid transparent",
                            borderBottom: "16px solid #8d7f6b",
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-7 flex justify-center gap-1.5">
                          <span className="block h-2.5 w-2.5 rounded-[2px] bg-[#efe9e0]" />
                          <span className="block h-2.5 w-2.5 rounded-[2px] bg-[#efe9e0]" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-full w-full p-[3px]">
                        <div className="relative h-full w-full rounded-[4px] bg-road">
                          <div className="absolute left-1/2 top-0 h-full w-0 -translate-x-1/2 border-l border-dashed border-white" />
                          <div className="absolute left-0 top-1/2 h-0 w-full -translate-y-1/2 border-t border-dashed border-white" />
                          {isStart && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg width="30" height="26" viewBox="0 0 30 26">
                                <polygon points="15,3 28,13 2,13" fill="#8d7f6b" />
                                <rect x="6" y="13" width="18" height="10" fill="#b6a894" />
                                <rect x="12" y="16" width="6" height="7" fill="#efe9e0" />
                              </svg>
                            </div>
                          )}
                          {isGoal && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg width="26" height="30" viewBox="0 0 26 30">
                                <rect x="6" y="3" width="2" height="24" fill="#2f2f2f" />
                                <polygon points="8,4 21,9 8,14" fill="#2e6b3e" />
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
                left: pos[1] * CELL,
                top: pos[0] * CELL,
                width: CELL,
                height: CELL,
              }}
            >
              <div
                key={`bump-${bumpKey}`}
                className={bumpKey ? "animate-robot-bump h-full w-full" : "h-full w-full"}
              >
                <div
                  key={`walk-${walkKey}`}
                  className="animate-robot-walk flex h-full w-full items-center justify-center"
                  style={{ transform: `scaleX(${facing})` }}
                >
                  <svg width="34" height="40" viewBox="0 0 34 40">
                    <line x1="17" y1="2" x2="17" y2="7" stroke="#2f2f2f" strokeWidth="2" />
                    <circle cx="17" cy="2" r="2" fill="#3f5170" />
                    <rect x="8" y="7" width="18" height="11" rx="3" fill="#2f2f2f" />
                    <rect x="11" y="11" width="12" height="4" rx="2" fill="#7f97c4" />
                    <rect x="10" y="19" width="14" height="12" rx="2" fill="#3a3a3a" />
                    <rect x="4" y="20" width="5" height="9" rx="2" fill="#2f2f2f" />
                    <rect x="25" y="20" width="5" height="9" rx="2" fill="#2f2f2f" />
                    <rect x="11" y="31" width="4" height="7" rx="1.5" fill="#2f2f2f" />
                    <rect x="19" y="31" width="4" height="7" rx="1.5" fill="#2f2f2f" />
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
                Task 3 complete — the robot found a near-optimal route.
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
