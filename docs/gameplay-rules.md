# Gameplay Rules — Prototype v0.1

## Match setup

- One human player fights one computer-controlled rival.
- Each side eventually uses a team of three fruit cards.
- The current scaffold uses one active card per side while the team system is being built.
- Each card starts with a fixed health value decided by the game engine.

## Player actions

### Attack
Deals normal damage. The game calculates the result automatically.

### Guard
Reduces the next incoming attack. The player does not need to calculate anything.

### Special
Uses the active card's unique move. Specials should be easy to understand and visually distinct.

### Bonus card
Once per battle, the player may add **+20 damage** to an attack. The digital game automatically applies the extra damage.

## Turn flow

1. Player chooses an action.
2. The game chooses the rival action.
3. Actions resolve with animation and damage feedback.
4. Health bars update.
5. A defeated active card is replaced by the next team card.
6. The first player to defeat all opposing cards wins.

## Intended match length

Approximately one to three minutes.

## Visual feedback

- Card lunge or slide on attack
- Impact flash and small screen shake
- Floating damage number
- Shield effect on Guard
- Named banner for Special moves
- Clear victory and defeat sequence

## Guest username

The username is stored in local browser storage. It is not authentication and provides no security. No email, password, chat or real name is required.
