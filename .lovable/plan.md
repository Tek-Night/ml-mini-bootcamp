# Racing Track Visual Refresh

## Goal
Transform Task 3 from a neighborhood robot maze into a restrained race-track experience without changing any Q-learning behavior, thresholds, controls, statistics, or persistence.

## Changes
- Restyle open cells as muted asphalt with thicker connected yellow/white road markings.
- Replace houses with striped red/off-white safety barriers that clearly read as collisions.
- Replace the start icon with a black/off-white checkered starting line.
- Replace the goal marker with a checkered finish flag and add a brief green finish flash.
- Replace the robot with a compact dark racing car whose heading rotates east, south, west, or north as it moves.
- Reuse the existing collision timing for a skid/jolt, adding a brief impact flash and skid detail on the struck barrier.
- Add a small car scale-bounce when the checkpoint is reached.
- Update Task 3’s heading, instructions, and collision/finish messages to the requested racing language.

## Technical Details
- Keep `chooseAction`, `qUpdate`, epsilon decay, rewards, penalties, BFS optimal path, completion checks, and episode/history state untouched.
- Track only the visual direction and last impacted barrier cell needed for animation.
- Add race-specific animation utilities in the global styles, including reduced-motion handling.
- Use existing semantic palette tokens and add only the muted race-track roles needed by this task.

## Verification
- Confirm the page renders at desktop and mobile widths without overlap.
- Start an episode and verify movement, direction changes, Reward/Punish flow, barrier collision feedback, and the existing side statistics remain functional.
