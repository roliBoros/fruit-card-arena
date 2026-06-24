# Gameplay Rules — Prototype v0.7

## Match setup

- One human player fights one computer-controlled rival.
- Each side uses a team of three fruit cards.
- One active card per side fights at a time; the next living card enters automatically.
- Each card starts with a fixed health value decided by the game engine.
- Tournament stages may add an arena twist, such as starting juice, cheaper specials or rival shield.

## Rival intent

- The rival's planned move is shown before the player acts.
- Intent can be Attack, Guard or Special.
- Attack and damaging Specials show an approximate incoming damage value.
- The rival follows the displayed plan unless the active rival is defeated first.

## Juice

- Each battle uses a simple three-pip juice meter.
- Attack gains 1 juice.
- Guard gains 2 juice.
- Specials usually cost 2 juice.
- The +20 Bonus usually costs 3 juice and remains one-use per battle.
- Arena twists can adjust these costs or starting values.

## Player actions

### Attack
Deals normal damage and gains 1 juice. The game calculates the result automatically.

### Guard
Reduces the next incoming attack and gains 2 juice. The player does not need to calculate anything.

### Special
Uses the active card's unique move. Each active fighter can use its Special once, and the player needs enough juice.

### Bonus card
Once per battle, the player may spend juice to add **+20 damage** to an attack. The digital game automatically applies the extra damage.

## Turn flow

1. The game shows the rival intent.
2. Player chooses an action.
3. The rival follows the displayed intent if still active.
4. Actions resolve with animation and damage feedback.
5. Health bars and juice update.
6. A defeated active card is replaced by the next team card.
7. The first player to defeat all opposing cards wins.

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
