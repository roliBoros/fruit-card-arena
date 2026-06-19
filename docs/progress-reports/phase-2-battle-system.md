# Battle-System Milestone Review

**Review date:** 19 June 2026

## Planned

- Build the full battle-system structure before finishing all artwork.
- Support teams of three.
- Keep calculations automatic and suitable for players aged 10+.
- Make future characters easy to add without rewriting the game.

## Completed

- Three-character team selection.
- Random three-character AI opponent team.
- Automatic replacement of defeated active cards.
- Attack, Guard, one-use Special and one-use +20 Bonus actions.
- Health, shields, guarding, healing, weakening, dodging and bench damage.
- Simple AI action selection based on health and special availability.
- Pure reusable battle logic moved into `src/game/engine.ts`.
- Character definitions remain separate in `src/data/cards.ts`.
- Roster validation added for IDs, stats and special values.
- New-character instructions added in `docs/adding-characters.md`.
- Collector statistics kept separate from hidden balanced battle statistics.

## Extensibility evidence

A new character can be introduced by adding one typed object to `src/data/cards.ts`. It automatically appears in team selection and enters the AI card pool. Existing supported special effects require no battle-engine changes.

## Incomplete or changed

- Battle animations are currently CSS-based and lightweight; more elaborate character-specific effects remain future work.
- Most characters still use emoji fallback art.
- Difficulty levels, tournament progression and permanent match records are not implemented yet.
- The engine has not yet been covered by automated unit tests.

## Problems discovered

- Keeping battle calculations inside the UI made future expansion risky. This was corrected by moving them into a standalone engine.
- Generated card images should not contain the authoritative stats because balancing will change during testing.

## Status

**GREEN — core extensible battle architecture complete.**

## Next action

1. Add automated tests for all supported special-effect types.
2. Add a simple tournament route with increasingly stronger AI teams.
3. Replace emoji fallbacks as individual artwork becomes available.
