# Phase 1A Review — Roster, Balance and Playable Team Battle

**Review date:** 19 June 2026

## Planned

- Use the approved visual direction without waiting for every uncertain handwritten value.
- Give every original character a clear role and special move.
- Separate collectible statistics from balanced gameplay values.
- Upgrade the one-card scaffold into a three-card battle.

## Completed

- Canonical names and collector stats chosen for all 13 character cards.
- Six gameplay roles introduced.
- Hidden HP, Attack, Defence and Speed values created for every card.
- Unique, simple Special moves created for the full roster.
- Three-card team selection added.
- Three-card rival team generation added.
- Automatic card replacement after defeat added.
- Guard, shields, healing, weakening, dodge, drain, splash and multi-hit effects added.
- One-use +20 Bonus retained.
- Basic hit, special, shield and floating-number visuals added.
- Selected team is saved in local browser storage.

## Evidence

- `src/types.ts`
- `src/data/cards.ts`
- `src/App.tsx`
- `src/styles.css`
- `docs/balance-system.md`

## Incomplete or changed

- Only Dragon-Fruit, Ava and Meloni currently have approved artwork prepared for the game.
- The other ten characters use temporary fruit icons.
- Speed is stored but is not yet used for initiative because the current flow prioritises easy player control.
- Advanced tournament progression remains for a later phase.

## Problems discovered

- Original collector values are too uneven to use as direct combat values.
- The separate hidden battle-stat system is therefore required.
- Full balancing will need repeated automated simulations after all effects are stable.

## Status

**GREEN — gameplay foundation complete.**

## Next action

Upload the six approved Phase 1 visual assets, connect the three character artworks to the game, then produce the remaining ten character artworks in small review batches.
