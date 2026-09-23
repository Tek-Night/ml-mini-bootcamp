import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  emptyProgress,
  formatTime,
  getStartTime,
  loadProgress,
  saveProgress,
  type Progress,
} from "@/lib/bootcamp";
import { TaskRegression } from "@/components/TaskRegression";
import { TaskSpam } from "@/components/TaskSpam";
import { TaskMaze } from "@/components/TaskMaze";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ML Mini Bootcamp — three hands-on machine learning tasks" },
      {
        name: "description",
        content:
          "Fit a regression line, train a spam filter and teach a robot to walk — three short machine learning tasks that run entirely in your browser.",
      },
      { property: "og:title", content: "ML Mini Bootcamp" },
      {
        property: "og:description",
        content:
          "Three short, hands-on machine learning tasks: regression, a Naive Bayes spam filter and a Q-learning maze. All computed locally.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TABS = [
  { id: 1, label: "Line of best fit" },
  { id: 2, label: "Spam classifier" },
  { id: 3, label: "Walking robot" },
] as const;

function Index() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [tab, setTab] = useState(1);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setProgress(loadProgress());
    const start = getStartTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const complete = useCallback((key: keyof Progress) => {
    setProgress((p) => {
      if (p[key]) return p;
      const next = { ...p, [key]: true };
      saveProgress(next);
      return next;
    });
  }, []);

  const doneCount = Number(progress.t1) + Number(progress.t2) + Number(progress.t3);
  const pct = Math.round((doneCount / 3) * 100);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">ML Mini Bootcamp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Three short, hands-on machine learning tasks you can finish in one sitting.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Everything computes locally in your browser and your progress is saved on this
          device only.
        </p>
      </header>

      <div className="panel mt-6 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span className="tabular-nums">
          Time on task: <strong className="font-semibold">{formatTime(elapsed)}</strong>
        </span>
        <span className="text-muted-foreground">{doneCount} of 3 tasks complete</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#2e6b3e" : "#2f2f2f" }}
        />
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isDone = progress[`t${t.id}` as keyof Progress];
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "border-foreground bg-card font-medium"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <span
                key={isDone ? "done" : "todo"}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone ? "animate-badge-pop" : ""
                }`}
                style={
                  isDone
                    ? { backgroundColor: "#e6ede6", color: "#2e6b3e" }
                    : { backgroundColor: "#f0f0f0", color: "#6f6f6f" }
                }
              >
                {isDone ? "✓" : t.id}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <section className="mt-6" key={tab}>
        {tab === 1 && (
          <TaskRegression done={progress.t1} onComplete={() => complete("t1")} />
        )}
        {tab === 2 && <TaskSpam done={progress.t2} onComplete={() => complete("t2")} />}
        {tab === 3 && <TaskMaze done={progress.t3} onComplete={() => complete("t3")} />}
      </section>
    </main>
  );
}
