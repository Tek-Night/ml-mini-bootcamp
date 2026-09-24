import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const label = (s: number) =>
  s >= 90
    ? "Excellent work"
    : s >= 70
      ? "Solid grasp of the fundamentals"
      : s >= 50
        ? "Good start, room to sharpen up"
        : "Keep practicing the basics";

export function ScoreModal({
  open,
  onOpenChange,
  score,
  code,
  parts,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  score: number;
  code: string;
  parts: { reg: number; spam: number; maze: number };
  onRetry: (tab: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[10px] border border-border bg-card">
        <div className="animate-fade-in-up space-y-5 text-center">
          <DialogTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Your final score
          </DialogTitle>
          <div>
            <p
              className="animate-badge-pop text-5xl font-semibold tabular-nums"
              style={{ color: score >= 70 ? "#2e6b3e" : "#2f2f2f" }}
            >
              {score} <span className="text-2xl text-muted-foreground">/ 100</span>
            </p>
            <DialogDescription className="mt-2 text-sm text-foreground">
              {label(score)}
            </DialogDescription>
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            Regression: {parts.reg}/34 · Spam filter: {parts.spam}/33 · Maze: {parts.maze}/33
          </p>

          <div className="rounded-md border border-border bg-muted p-4 text-left">
            <p className="text-xs font-medium uppercase text-muted-foreground">Your code</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-center font-mono text-xl font-semibold tracking-[0.35em]">
                {code}
              </span>
              <button
                onClick={copy}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Copy this code and submit it on the event submission form — it represents your
              score.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            This score reflects how closely your regression line, spam filter, and maze agent
            matched their ideal solutions — not a pass/fail grade.
          </p>

          {retryOpen && (
            <div className="flex flex-wrap justify-center gap-2">
              {["Line of best fit", "Spam classifier", "RL Maze"].map((t, i) => (
                <button
                  key={t}
                  onClick={() => onRetry(i + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setRetryOpen((v) => !v)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Retry a task
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
