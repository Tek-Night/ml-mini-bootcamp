import { useState } from "react";
import {
  SAMPLE_HAM,
  SAMPLE_SPAM,
  TEST_EMAILS,
  classify,
  trainNaiveBayes,
  type NBModel,
} from "@/lib/bootcamp";

type Row = { text: string; actual: "spam" | "ham"; predicted: "spam" | "ham" };

export function TaskSpam({ done, onComplete }: { done: boolean; onComplete: () => void }) {
  const [spam, setSpam] = useState<string[]>(["", "", "", "", ""]);
  const [ham, setHam] = useState<string[]>(["", "", "", "", ""]);
  const [model, setModel] = useState<NBModel | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  const accuracy = rows
    ? Math.round((rows.filter((r) => r.actual === r.predicted).length / rows.length) * 100)
    : 0;
  const pass = rows !== null && accuracy >= 60;
  if (pass && !done) onComplete();

  const setAt = (
    list: string[],
    setter: (v: string[]) => void,
    i: number,
    v: string,
  ) => {
    const next = [...list];
    next[i] = v;
    setter(next);
  };

  const train = () => {
    if ([...spam, ...ham].some((v) => v.trim() === "")) {
      setError("Please fill all 10 example fields before training.");
      return;
    }
    setError("");
    setRows(null);
    setModel(trainNaiveBayes(spam, ham));
  };

  const test = () => {
    if (!model) return;
    setRows(
      TEST_EMAILS.map((e) => ({
        text: e.text,
        actual: e.label,
        predicted: classify(model, e.text),
      })),
    );
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <label key={label} className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-slate-accent"
        placeholder="Type an example message…"
      />
    </label>
  );

  return (
    <div className="animate-fade-in-up space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Task 2 — Rescue Professor Rao's mailbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Professor Rao subscribed to the wrong newsletter and his inbox is drowning. Give
          the filter five spam examples and five genuine ones, train it, then test it on
          unseen mail. You need at least 60% accuracy.
        </p>
      </header>

      <div className="panel space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {spam.map((v, i) =>
              field(`Spam example ${i + 1}`, v, (nv) => setAt(spam, setSpam, i, nv)),
            )}
          </div>
          <div className="space-y-3">
            {ham.map((v, i) =>
              field(`Legitimate example ${i + 1}`, v, (nv) => setAt(ham, setHam, i, nv)),
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSpam([...SAMPLE_SPAM]);
              setHam([...SAMPLE_HAM]);
              setError("");
            }}
            className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Fill sample data
          </button>
          <button
            onClick={train}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Train model
          </button>
          {model && (
            <button
              onClick={test}
              className="animate-fade-in-up rounded-md px-3 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#3f5170" }}
            >
              Run test on new mail
            </button>
          )}
          {model && (
            <span className="text-xs text-muted-foreground">
              Trained on {model.vocab.length} unique words.
            </span>
          )}
        </div>
        {error && (
          <p className="rounded-md bg-fail-bg px-3 py-2 text-sm text-fail">{error}</p>
        )}
      </div>

      {rows && (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Results on 12 unseen emails</span>
            <span
              className="animate-badge-pop rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: pass ? "#e6ede6" : "#f2e5e5",
                color: pass ? "#2e6b3e" : "#a13a3a",
              }}
            >
              {pass ? "Pass" : "Fail"} — {accuracy}% accuracy
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Email text</th>
                <th className="px-4 py-2 font-medium">Actual</th>
                <th className="px-4 py-2 font-medium">Predicted</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const ok = r.actual === r.predicted;
                return (
                  <tr
                    key={i}
                    className="animate-fade-in-up border-t border-border"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <td className="px-4 py-2">{r.text}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.actual}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.predicted}</td>
                    <td
                      className="px-4 py-2 font-semibold"
                      style={{ color: ok ? "#2e6b3e" : "#a13a3a" }}
                    >
                      {ok ? "✓" : "✗"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
