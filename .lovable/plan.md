# Faster, clearer RL maze training

## Goal
Make learning progress noticeable within a few episodes while keeping the existing Q-learning table, feedback flow, completion threshold, statistics, and race-track presentation.

## Changes
- Raise the learning rate to `0.7`, start epsilon at `0.2`, and decay epsilon by `0.7` after each episode with the existing `0.05` floor.
- Limit episode 1 to 25 steps and later episodes to 50 steps.
- Track the previous action and avoid an immediate reverse during random exploration when other valid moves are available. Keep learned greedy choices authoritative.
- Track cells visited during each episode. Apply an automatic `−2` revisit adjustment alongside the user's Reward/Punish feedback when a move returns to a visited cell.
- Add short-lived trail tints to recently visited track cells, without changing existing track, barrier, checker, or car styling.
- Show each open cell's current best-known action as a subtle directional arrow. Refresh arrows immediately after every Q-value update and visually strengthen arrows as their learned preference becomes clearer.
- Show “Faster than last time!” when the latest completed episode used fewer steps than the previous one.
- Add the first-open hint above the maze explaining that early wandering is expected.

## Technical details
- Extend action selection with optional previous-action context while preserving epsilon-greedy behavior and the existing Q-table.
- Keep BFS optimal-path calculation, `+10/−10` user rewards, `−5` barrier penalty, `+50` goal bonus, completion at `optimal + 2`, and all existing side-panel statistics.
- Keep all changes client-side and preserve the current visual tokens and race-track artwork.

## Verification
- Exercise the first and second episodes to confirm 25/50 step caps and epsilon decay behavior.
- Confirm reversals are suppressed only during exploration, revisits receive `−2`, arrows update after feedback, trails fade, and the faster callout appears only after improvement.
- Check desktop and mobile layouts for overflow and confirm no browser errors.
