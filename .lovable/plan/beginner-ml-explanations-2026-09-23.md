# Beginner ML explanations

## What will change
- Rename the third tab to **RL Maze** and make its heading explicitly identify reinforcement learning while keeping the racing-car activity.
- Add visible regression context plus a live `y = mx + b` readout that updates with the draggable line.
- Add a collapsed **How this works** explanation for Naive Bayes, including Bayes’ formula, plain-language intuition, and real-world uses.
- Add a subdued 1.5–2 second illustrative training sequence after **Train model** is clicked, then reveal the existing trained state. It will be clearly described as a concept animation, not a neural-network implementation.
- Add a collapsed **How this works** explanation for reinforcement learning, including the Q-value update formula and plain-language trial-and-error explanation.

## Interaction and visual details
- Use the existing muted palette, panels, typography, transitions, and disclosure controls.
- Disable repeated training actions during the short animation and preserve validation feedback.
- Respect reduced-motion preferences by simplifying the training animation.
- Keep all current task logic, data, scoring thresholds, Q-learning behavior, progress storage, and completion rules unchanged.

## Verification
- Check the tab label, live equation updates, both collapsed explanations, training transition, and existing task controls in the browser.
- Confirm desktop and mobile layouts have no overflow or overlapping text, and confirm no browser errors.
