# Playable Release Review

**Review date:** 19 June 2026

## Planned

- Add difficulty choices and a short tutorial.
- Expand automated coverage across every supported special move.
- Test the complete game flow on desktop and mobile layouts.
- Deploy a shareable online build.

## Completed

- Added Easy, Normal and Hard rival tactics and damage scaling.
- Added a first-run four-step tutorial that can be reopened from team selection.
- Added persistent wins, losses, battle count and arena points.
- Limited tournament rewards to the first clear while keeping stage replay available.
- Fixed winner tracking so a username matching a rival name cannot change the result display.
- Added broken-art fallback handling so missing production assets never leave a blank card.
- Expanded the battle suite from 5 to 13 tests, including all special-effect families and difficulty behaviour.
- Added an accessible live battle message, visible keyboard focus and semantic selectable cards.
- Added reproducible dependency installation and GitHub Pages deployment to CI.

## Evidence

- `npm test`: 13 tests passed.
- `npm run build`: production build completed.
- Browser flow passed at the default desktop viewport and at 390 x 844 with no horizontal overflow.
- Onboarding, tutorial dismissal, team selection, difficulty selection, battle entry, Bonus and Special actions were exercised in-browser.

## Incomplete or changed

- Most individual character illustrations are still awaiting approved production artwork and use emoji fallback art.
- Browser progress remains device-local by design; there is no secure account or cloud save.

## Status

**GREEN — the planned single-player game is complete and deployable.**

## Exact next action

Produce and approve the remaining individual character artwork, then replace each fallback asset without changing the game data or battle engine.
