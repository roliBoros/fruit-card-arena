# Fruit Card Arena

A browser-based collectible card battle game inspired by the original hand-drawn fruit character cards.

## Current status

- **Phase 0 — Project setup and catalogue:** complete
- **Phases 1–2 — Production artwork and complete card set:** complete
- **Phases 3–5 — Playable game, battle engine and polish:** complete
- **Online game:** deployed automatically from `main` with GitHub Pages

## Play online

[Launch Fruit Card Arena](https://roliboros.github.io/fruit-card-arena/)

The approved visual direction targets players aged **10+**: energetic, competitive and polished while keeping the personality of the original drawings.

## Prototype goals

- Username-only guest profile; no password or email
- Choose a team of three cards
- Fight a computer-controlled opponent
- Attack, Guard and Special actions
- One Bonus card per battle for **+20 damage**
- Lightweight card movement, impact flashes and floating damage effects
- Browser storage for local progress
- Easy, Normal and Hard rival difficulty
- Five-stage tournament with first-clear rewards
- Persistent wins, losses, battles and arena points
- First-run tutorial and keyboard-friendly controls

## Technology

- React
- TypeScript
- Vite
- CSS animations
- Local browser storage

## Run locally

```bash
npm ci
npm run dev
```

Then open the local address shown by Vite.

## Repository structure

```text
fruit-card-arena/
├── docs/
│   ├── master-plan.md
│   ├── gameplay-rules.md
│   ├── card-catalogue.md
│   └── progress-reports/
├── public/
├── src/
│   ├── data/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── index.html
├── package.json
└── vite.config.ts
```

## Important prototype limitation

The username is stored only in the player's browser. It is not a secure account system and must not be used for payments, prizes or valuable progress.

All 13 fighters use optimized individual production artwork, with an emoji fallback retained for resilient loading.

## Ownership

The original characters and game concept belong to the project owner. Production artwork will be stored here as individual controlled assets once approved.
