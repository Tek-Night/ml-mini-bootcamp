import { useEffect, useRef, useState } from "react";
import { TEST_EMAILS, classify, trainNaiveBayes, type NBModel } from "@/lib/bootcamp";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Row = { text: string; actual: "spam" | "ham"; predicted: "spam" | "ham" };

export function TaskSpam({ done, onComplete }: { done: boolean; onComplete: () => void }) {
  const [spam, setSpam] = useState<string[]>(["", "", "", "", ""]);
  const [ham, setHam] = useState<string[]>(["", "", "", "", ""]);
  const [model, setModel] = useState<NBModel | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [training, setTraining] = useState(false);
  const trainingTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (trainingTimer.current !== null) window.clearTimeout(trainingTimer.current);
  }, []);

  const accuracy = rows
    ? Math.round((rows.filter((r) => r.actual === r.predicted).length / rows.length) * 100)
    : 0;
  const pass = rows !== null && accuracy >= 60;
  useEffect(() => {
    if (pass && !done) onComplete();
  }, [pass, done, onComplete]);

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
    setModel(null);
    setTraining(true);
    trainingTimer.current = window.setTimeout(() => {
      setModel(trainNaiveBayes(spam, ham));
      setTraining(false);
      trainingTimer.current = null;
    }, 1800);
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

      <Accordion type="single" collapsible className="panel px-4">
        <AccordionItem value="bayes" className="border-0">
          <AccordionTrigger>How this works</AccordionTrigger>
          <AccordionContent className="space-y-3 text-muted-foreground">
            <p className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
              P(spam | words) = P(words | spam) × P(spam) / P(words)
            </p>
            <p>
              Naive Bayes looks at each word in an email and asks: how often did this word
              show up in spam examples vs. legitimate examples? It combines those
              probabilities across all the words to decide which class is more likely —
              that&apos;s Bayes&apos; Theorem in action.
            </p>
            <p>
              This is the same basic idea behind real email spam filters, and is also used
              in text classification tasks like sentiment analysis.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="panel space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-fail">Spam example:</span>{" "}
              Congratulations! You've won a $1,000 gift card, click here to claim it before
              it expires
            </p>
            {spam.map((v, i) =>
              field(`Spam example ${i + 1}`, v, (nv) => setAt(spam, setSpam, i, nv)),
            )}
          </div>
          <div className="space-y-3">
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-slate-accent">Legitimate example:</span>{" "}
              The package you ordered has shipped and should arrive by Friday
            </p>
            {ham.map((v, i) =>
              field(`Legitimate example ${i + 1}`, v, (nv) => setAt(ham, setHam, i, nv)),
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={train}
            disabled={training}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            {training ? "Training…" : "Train model"}
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
          {model && !training && (
            <span className="text-xs text-muted-foreground">
              Model trained on 10 examples · {model.vocab.length} unique words.
            </span>
          )}
        </div>
        {training && <TrainingVisual />}
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

function TrainingVisual() {
  const nodes = [
    [18, 20], [18, 54], [18, 88],
    [90, 30], [90, 74],
    [162, 37], [162, 67],
  ] as const;
  const links = [
    [18, 20, 90, 30], [18, 20, 90, 74], [18, 54, 90, 30],
    [18, 54, 90, 74], [18, 88, 90, 30], [18, 88, 90, 74],
    [90, 30, 162, 37], [90, 30, 162, 67], [90, 74, 162, 37], [90, 74, 162, 67],
  ] as const;

  return (
    <div className="animate-fade-in-up rounded-md border border-border bg-muted px-4 py-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="training-spinner h-3.5 w-3.5 rounded-full border-2 border-border border-t-slate-accent" />
        Training model...
      </div>
      <svg aria-hidden="true" viewBox="0 0 180 108" className="mt-2 h-24 w-full">
        {links.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="training-link" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
        {nodes.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="6" className="training-node" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
        <circle r="3" className="training-signal">
          <animateMotion dur="1.1s" repeatCount="indefinite" path="M18 54 L90 30 L162 67" />
        </circle>
      </svg>
      <p className="text-xs text-muted-foreground">
        Illustrating how word evidence flows into a decision; the classifier itself uses Naive Bayes.
      </p>
    </div>
  );
}
