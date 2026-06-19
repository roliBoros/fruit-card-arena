# Balance System v0.2

## Why there are two kinds of stats

The original collector cards use large visible values such as Power, Damage and Rating. Those values are part of the personality and collectability of the cards, but they are not used directly in the battle calculation.

The game uses a second, hidden set of battle values:

- **HP** — how long a card stays active
- **Attack** — normal hit strength
- **Defence** — reduces incoming damage
- **Speed** — reserved for later initiative and AI features

This lets Meloni remain a visible 99 / 99 / 100 legendary card without making every other card pointless.

## Core battle rules

- Teams contain three cards.
- The first living card is active.
- When the active card reaches zero HP, the next card enters automatically.
- Normal Attack has a small random range so repeated matches do not feel identical.
- Guard halves the next damage that reaches the card.
- Each card may use its Special once while active.
- The +20 Bonus may be used once per match.

## Roles

- **Striker:** high damage, lower defence
- **Defender:** high HP and defence
- **Speedster:** fast and fragile
- **Trickster:** dodge, weaken or multiple-hit effects
- **Support:** healing and survival
- **All-Rounder:** no major weakness

## Special-move principles

- One sentence to understand the move
- One main visual idea
- No manual arithmetic for the player
- Strong enough to matter but not an automatic win
- Each effect is resolved by the game engine

## First balancing target

A normal one-on-one card matchup should usually take four to seven actions. A full team battle should usually last two to four minutes once animations are included.
