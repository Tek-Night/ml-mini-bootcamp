import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { makePoints, rSquared, type Point } from "@/lib/bootcamp";

const W = 620;
const H = 380;
const PAD = { l: 54, r: 18, t: 18, b: 44 };
const X0 = 1;
const X1 = 5;
const Y0 = 20;
const Y1 = 100;

const sx = (x: number) => PAD.l + ((x - X0) / (X1 - X0)) * (W - PAD.l - PAD.r);
const sy = (y: number) => H - PAD.b - ((y - Y0) / (Y1 - Y0)) * (H - PAD.t - PAD.b);
const invY = (py: number) =>
  Y0 + ((H - PAD.b - py) / (H - PAD.t - PAD.b)) * (Y1 - Y0);

export function TaskRegression({
  done,
  onComplete,
}: {
  done: boolean;
  onComplete: (metric: number) => void;
}) {
  const points: Point[] = useMemo(() => makePoints(7), []);
  const [yLeft, setYLeft] = useState(35);
  const [yRight, setYRight] = useState(60);
  const [drag, setDrag] = useState<null | "l" | "r">(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const slope = (yRight - yLeft) / (X1 - X0);
  const intercept = yLeft - slope * X0;
  const r2 = Math.max(0, rSquared(points, slope, intercept));
  const pass = r2 >= 0.8;
  useEffect(() => {
    if (pass && !done) onComplete(r2);
  }, [pass, done, onComplete, r2]);

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const py = ((e.clientY - rect.top) / rect.height) * H;
      const val = Math.min(Y1, Math.max(Y0, invY(py)));
      if (drag === "l") setYLeft(val);
      else setYRight(val);
    },
    [drag],
  );

  const pct = Math.round(Math.min(1, r2) * 100);

  return (
    <div className="animate-fade-in-up space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Task 1 — Fit the line of best fit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag the two square handles up and down to tilt the line. Get it close to the
          true trend between CPU speed and temperature (R² of 80% or more) to finish.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Linear regression finds the line <span className="font-mono text-foreground">y = mx + b</span>{" "}
          that best fits the data by minimizing the distance between the line and each point.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">The equation of a line</p>
          <p className="mt-1 font-mono text-base font-semibold tabular-nums">
            y = {slope.toFixed(1)}x {intercept < 0 ? "−" : "+"} {Math.abs(intercept).toFixed(1)}
          </p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">m</strong> = slope</span>
          <span><strong className="text-foreground">b</strong> = intercept</span>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerMove={move}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const y = Y0 + ((Y1 - Y0) / 4) * i;
            return (
              <g key={`h${i}`}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={sy(y)}
                  y2={sy(y)}
                  stroke="#ececec"
                />
                <text x={PAD.l - 10} y={sy(y) + 4} textAnchor="end" fontSize="11" fill="#8a8a8a">
                  {Math.round(y)}
                </text>
              </g>
            );
          })}
          {[1, 2, 3, 4, 5].map((x) => (
            <g key={`v${x}`}>
              <line x1={sx(x)} x2={sx(x)} y1={PAD.t} y2={H - PAD.b} stroke="#f0f0f0" />
              <text x={sx(x)} y={H - PAD.b + 18} textAnchor="middle" fontSize="11" fill="#8a8a8a">
                {x}
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#d9d9d9" />
          <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#d9d9d9" />
          <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#5f5f5f">
            CPU Speed (GHz)
          </text>
          <text
            x={14}
            y={H / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#5f5f5f"
            transform={`rotate(-90 14 ${H / 2})`}
          >
            CPU Temperature (°C)
          </text>

          {points.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3.4" fill="#9a9a9a" />
          ))}

          <line
            x1={sx(X0)}
            y1={sy(yLeft)}
            x2={sx(X1)}
            y2={sy(yRight)}
            stroke={pass ? "#2e6b3e" : "#2f2f2f"}
            strokeWidth="2"
          />
          {(
            [
              ["l", X0, yLeft],
              ["r", X1, yRight],
            ] as const
          ).map(([id, x, y]) => (
            <rect
              key={id}
              x={sx(x) - 7}
              y={sy(y) - 7}
              width="14"
              height="14"
              rx="2"
              fill="#ffffff"
              stroke={pass ? "#2e6b3e" : "#3f5170"}
              strokeWidth="2"
              className="cursor-ns-resize"
              onPointerDown={(e) => {
                (e.target as Element).releasePointerCapture?.(e.pointerId);
                setDrag(id);
              }}
            />
          ))}
        </svg>
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Goodness of fit (R²)</span>
          <span className="tabular-nums text-muted-foreground">{pct}% / 80%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%`, backgroundColor: pass ? "#2e6b3e" : "#9a9a9a" }}
          />
        </div>
        {pass && (
          <p className="animate-fade-in-up mt-3 rounded-md bg-success-bg px-3 py-2 text-sm text-success">
            Nice fit — your line explains {pct}% of the variance. Task 1 complete.
          </p>
        )}
      </div>
    </div>
  );
}
