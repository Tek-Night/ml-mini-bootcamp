# ML Mini Bootcamp

Build a single-page web app called "ML Mini Bootcamp" — three short, hands-on ML tasks a user completes in one session (regression, a spam classifier, and a reinforcement-learning maze). Everything runs client-side in the browser (no real backend needed — compute all the math in JS/TS). Persist progress in localStorage so a refresh doesn't reset it.

Overall visual style: Minimalist, no neon colors. Light gray page background (#fafafa), white content panels with thin 1px light-gray borders (#e2e2e2) and 8–10px rounded corners, clean sans-serif system font. Accent color is dark charcoal (#2f2f2f), not blue/purple. Muted green (#2e6b3e on #e6ede6 background) for "pass"/success states, muted red (#a13a3a on #f2e5e5) for "fail" states, a muted slate-blue (#3f5170) as a secondary accent. Subtle animations only: fade-in-up on section changes, small pop animation on badges, smooth width transitions on progress bars, staggered fade-in on table rows — nothing flashy or garish.

Page layout (top to bottom):

Title "ML Mini Bootcamp" + one-line subtitle, plus a small muted disclaimer note that everything computes locally in the browser and progress is saved on-device.

A top bar with a live stopwatch timer ("Time on task: 00:00 / target 10:00") that starts counting on first load.

A thin overall progress bar (0–100%) that fills based on how many of the 3 tasks are complete.

Three tab buttons in a row, each with a small numbered circle badge (1/2/3) that turns green with the task's checkmark styling once that task is completed. Clicking a tab switches the visible section below.

Task 1 — "Fit the line of best fit" (linear regression, drag-to-fit)

Instructions: drag two square handles up/down to move a line; get it close to the true trend between CPU speed and CPU temperature to complete the task.

Generate ~24 synthetic data points with a hidden linear relationship plus random noise: x = CPU Speed (GHz, domain 1–5), y = CPU Temperature (°C, domain 20–100), true slope ≈12.5, true intercept ≈22.5, noise ±8.

Render as a scatter plot (SVG) with labeled axes ("CPU Speed (GHz)" / "CPU Temperature (°C)"), light gridlines, small gray dots for data points.

Draw a draggable line represented by two square handles positioned at x=1 and x=5; connecting them forms the user's line. Dragging a handle vertically (via pointer events) recomputes the line's slope/intercept live.

Compute real least-squares slope/intercept from the data (for scoring only, not shown to the user).

On every drag update, compute R² of the user's current line against the actual data (1 − SSE/SST) and show it as a live percentage progress bar that turns from gray to green once R² ≥ 0.8. Mark the task complete at that threshold and show a small success message.

Task 2 — "Rescue Professor Rao's mailbox" (Naive Bayes spam classifier)

Story framing: an MU faculty member accidentally subscribed to spam and needs a filter trained to save his inbox.

Provide 10 text input fields: 5 labeled "Spam example 1–5", 5 labeled "Legitimate example 1–5". Include a "Fill sample data" button that auto-populates them with reasonable demo spam/ham phrases.

"Train model" button: build a real multinomial Naive Bayes classifier from the 10 user-provided examples — tokenize into lowercase words, count word frequencies per class, use Laplace (add-1) smoothing, equal 50/50 priors. Validate all 10 fields are filled before training.

Once trained, reveal a "Run test on new mail" button. Test against a fixed, hardcoded set of 12 unseen emails (6 obviously spam, 6 obviously legitimate/academic-context messages).

Show results as a table (Email text | Actual label | Predicted label | ✓/✗), with rows fading in one after another (staggered animation). Show a pass/fail badge with the overall accuracy percentage; qualifying threshold is 60% accuracy.

Task 3 — "Train the walking robot" (reinforcement learning maze, Q-learning)

Render a 5×5 grid styled as a neighborhood, not a plain maze grid:

Open (walkable) cells are light-gray "road" tiles, connected by dashed white/light lane lines between adjacent open cells, so it visually reads as a connected street network.

Blocked cells are rendered as small houses/buildings: a base rectangle, a triangular roof, a drop shadow, and a few small window squares — using muted taupe/brown tones, not harsh black boxes.

The start cell has a small house icon; the goal cell has a flag-on-a-pole icon.

The agent is a small blocky robot (not a car or plain dot): a head with an antenna and a glowing two-eye visor, a body, and small arm/leg limbs, all in the dark accent color. It moves cell-to-cell with a smooth CSS transition, flips horizontally to face left/right movement, does a brief rocking "walk" wobble animation on every step, and does a small shake animation if it bumps into a building.

Underlying logic is genuine Q-learning: actions = up/down/left/right; learning rate α=0.5, discount γ=0.9; epsilon-greedy action selection with epsilon starting around 0.35 and decaying (~×0.82) after each episode, floored at 0.05.

Flow: user clicks "Start episode" → the agent proposes and executes moves automatically. For any move that isn't a wall-bump or the goal, pause and show Reward / Punish buttons — the user's click applies +10 or −10 into that state-action's Q-update (this is the sole reward signal driving learning, aside from automatic penalties/bonuses below). Bumping into a building auto-applies a −5 penalty (no user input needed, just a visual bump + brief penalty message) before continuing automatically. Reaching the goal auto-applies +50 and ends the episode automatically.

Side panel shows: current episode number, steps taken this episode, the true optimal path length (computed via BFS over the maze layout, ignoring walls), the best (fewest-steps) episode so far, and a small bar chart of steps-per-episode history with the best episode's bar highlighted in green.

Task is marked complete once an episode finishes in ≤ optimal+2 steps.

Completion state: Each task, once its own threshold is met, marks its tab as done (green checkmark styling) and updates the shared overall progress bar. All three states (task 1 R² pass, task 2 accuracy pass, task 3 near-optimal episode) persist in localStorage across reloads.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7d3bd026-7e1f-4409-8133-067a917c68a6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
