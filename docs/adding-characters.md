# Adding New Characters

The game is deliberately data-driven. A new character normally requires **one new object** in `src/data/cards.ts` and, optionally, one artwork file.

## 1. Add the character definition

Copy this template into the `cards` array in `src/data/cards.ts`:

```ts
{
  id: 'new-character',
  name: 'New Character',
  fruit: 'Fruit type',
  role: 'All-Rounder',
  rarity: 'Rare',
  collector: {
    power: 70,
    damage: 68,
    rating: 72,
  },
  battle: {
    maxHp: 132,
    attack: 23,
    defence: 12,
    speed: 12,
  },
  special: {
    name: 'Special Move',
    text: 'A short explanation players can understand quickly.',
    kind: 'damage',
    amount: 31,
  },
  icon: '🍓',
  accent: '#c83b57',
  art: 'cards/new-character.webp',
},
```

The card automatically becomes available in team selection and can also be selected by the AI.

## 2. Add the artwork

Place the image at:

```text
public/cards/new-character.webp
```

The `art` path is relative to the `public` folder. Remove the `art` property to use the emoji fallback while artwork is being prepared.

## 3. Choose a supported special

The engine currently understands these `kind` values:

| Kind | Effect | Fields |
|---|---|---|
| `damage` | One strong direct hit | `amount` = damage |
| `shield` | Adds protection | `amount` = shield strength |
| `heal` | Restores health | `amount` = healing |
| `double-hit` | Repeated smaller hits | `amount` = each hit, `secondary` = hit count |
| `splash` | Hits active rival and bench | `amount` = main hit, `secondary` = bench damage |
| `drain` | Damage plus self-healing | `amount` = hit, `secondary` = healing |
| `weaken` | Damage and lower next enemy attack | `amount` = hit, `secondary` = reduction |
| `dodge` | Damage and evade next attack | `amount` = hit |
| `damage-shield` | Damage plus a shield | `amount` = hit, `secondary` = shield |

A completely new special effect requires adding a new value to `SpecialKind` in `src/types.ts` and one matching case in `src/game/engine.ts`.

## 4. Balancing guide

Recommended first-set ranges:

| Stat | Typical range |
|---|---:|
| Max HP | 112–160 |
| Attack | 19–29 |
| Defence | 7–18 |
| Speed | 7–21 |
| Direct special damage | 28–39 |
| Shield | 25–40 |
| Healing | 22–32 |

These are guidelines, not strict rules. A character with a very strong special should usually have a clear weakness elsewhere.

## 5. Automatic checks

At startup, the roster validator checks:

- duplicate IDs
- invalid ID formatting
- collector values outside 0–100
- impossible battle values
- negative special values

An invalid new card stops the development build with a clear error instead of silently breaking battles.

## Design rule

Collector stats are visible and preserve the character's identity. Battle stats are separate and can be rebalanced without changing the printed or collectible version of the card.
