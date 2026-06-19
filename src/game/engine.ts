import { cardById } from '../data/cards';
import type { FighterState, FruitCard } from '../types';

export type BattleAction = 'attack' | 'guard' | 'special' | 'bonus';
export type BattleEffect = { type: 'hit' | 'guard' | 'heal' | 'special' | 'miss'; amount?: number } | null;

export interface TurnResult {
  players: FighterState[];
  enemies: FighterState[];
  playerText: string;
  enemyText: string;
  playerEffect: BattleEffect;
  enemyEffect: BattleEffect;
  bonusUsed: boolean;
  winner: 'player' | 'enemy' | null;
}

export const livingIndex = (team: FighterState[]) => team.findIndex((fighter) => fighter.hp > 0);

export const freshFighter = (card: FruitCard): FighterState => ({
  cardId: card.id,
  hp: card.battle.maxHp,
  specialUsed: false,
  shield: 0,
  guard: false,
  evade: false,
  weakened: 0,
});

function applyDamage(target: FighterState, rawDamage: number) {
  if (target.evade) {
    target.evade = false;
    return { damage: 0, missed: true };
  }

  let damage = rawDamage;
  if (target.guard) {
    damage = Math.ceil(damage * 0.5);
    target.guard = false;
  }

  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, damage);
    target.shield -= absorbed;
    damage -= absorbed;
  }

  target.hp = Math.max(0, target.hp - damage);
  return { damage, missed: false };
}

function normalDamage(attacker: FighterState, defender: FighterState, bonus = 0) {
  const attackCard = cardById[attacker.cardId];
  const defendCard = cardById[defender.cardId];
  const roll = Math.floor(Math.random() * 7) - 3;
  const weakened = attacker.weakened;
  attacker.weakened = 0;

  return Math.max(
    8,
    attackCard.battle.attack + roll + bonus - Math.floor(defendCard.battle.defence * 0.55) - weakened,
  );
}

function resolveSpecial(attacker: FighterState, target: FighterState, opposingTeam: FighterState[]) {
  const card = cardById[attacker.cardId];
  const move = card.special;
  attacker.specialUsed = true;

  let totalDamage = 0;
  let healed = 0;
  let note = move.name;

  switch (move.kind) {
    case 'damage':
      totalDamage = applyDamage(target, move.amount).damage;
      break;
    case 'shield':
      attacker.shield += move.amount;
      break;
    case 'heal': {
      const before = attacker.hp;
      attacker.hp = Math.min(card.battle.maxHp, attacker.hp + move.amount);
      healed = attacker.hp - before;
      break;
    }
    case 'double-hit': {
      const hits = move.secondary ?? 2;
      for (let index = 0; index < hits; index += 1) {
        totalDamage += applyDamage(target, move.amount).damage;
        if (target.hp <= 0) break;
      }
      break;
    }
    case 'splash': {
      totalDamage = applyDamage(target, move.amount).damage;
      const benchDamage = move.secondary ?? 5;
      opposingTeam.forEach((fighter) => {
        if (fighter !== target && fighter.hp > 0) fighter.hp = Math.max(0, fighter.hp - benchDamage);
      });
      note += ` + ${benchDamage} bench damage`;
      break;
    }
    case 'drain': {
      totalDamage = applyDamage(target, move.amount).damage;
      const before = attacker.hp;
      attacker.hp = Math.min(card.battle.maxHp, attacker.hp + (move.secondary ?? Math.floor(totalDamage / 2)));
      healed = attacker.hp - before;
      break;
    }
    case 'weaken':
      totalDamage = applyDamage(target, move.amount).damage;
      target.weakened += move.secondary ?? 8;
      break;
    case 'dodge':
      totalDamage = applyDamage(target, move.amount).damage;
      attacker.evade = true;
      break;
    case 'damage-shield':
      totalDamage = applyDamage(target, move.amount).damage;
      attacker.shield += move.secondary ?? 14;
      break;
    default: {
      const exhaustiveCheck: never = move.kind;
      throw new Error(`Unsupported special move: ${exhaustiveCheck}`);
    }
  }

  return { totalDamage, healed, note };
}

export function chooseEnemyAction(fighter: FighterState): Exclude<BattleAction, 'bonus'> {
  const card = cardById[fighter.cardId];
  const hpRatio = fighter.hp / card.battle.maxHp;

  if (!fighter.specialUsed && (hpRatio < 0.55 || Math.random() < 0.42)) return 'special';
  if (hpRatio < 0.35 && Math.random() < 0.35) return 'guard';
  return 'attack';
}

export function resolveTurn(
  playerTeam: FighterState[],
  enemyTeam: FighterState[],
  action: BattleAction,
  currentBonusUsed: boolean,
): TurnResult {
  const players = playerTeam.map((fighter) => ({ ...fighter }));
  const enemies = enemyTeam.map((fighter) => ({ ...fighter }));
  const pIndex = livingIndex(players);
  const eIndex = livingIndex(enemies);

  if (pIndex < 0 || eIndex < 0) {
    return {
      players,
      enemies,
      playerText: '',
      enemyText: '',
      playerEffect: null,
      enemyEffect: null,
      bonusUsed: currentBonusUsed,
      winner: pIndex >= 0 ? 'player' : 'enemy',
    };
  }

  const player = players[pIndex];
  const enemy = enemies[eIndex];
  const playerCard = cardById[player.cardId];
  const enemyCard = cardById[enemy.cardId];

  let playerText = '';
  let enemyText = '';
  let playerEffect: BattleEffect = null;
  let enemyEffect: BattleEffect = null;
  let bonusUsed = currentBonusUsed;

  if (action === 'guard') {
    player.guard = true;
    playerText = `${playerCard.name} is guarding.`;
    playerEffect = { type: 'guard' };
  } else if (action === 'special') {
    const result = resolveSpecial(player, enemy, enemies);
    playerText = `${playerCard.name} used ${result.note}.`;
    playerEffect = result.healed > 0 && result.totalDamage === 0
      ? { type: 'heal', amount: result.healed }
      : { type: 'special', amount: result.totalDamage || result.healed };
    if (result.totalDamage > 0) enemyEffect = { type: 'hit', amount: result.totalDamage };
  } else {
    const bonus = action === 'bonus' ? 20 : 0;
    const result = applyDamage(enemy, normalDamage(player, enemy, bonus));
    bonusUsed = bonusUsed || action === 'bonus';
    playerText = result.missed
      ? `${enemyCard.name} dodged the attack.`
      : `${playerCard.name} dealt ${result.damage}${bonus ? ' boosted' : ''} damage.`;
    enemyEffect = result.missed ? { type: 'miss' } : { type: 'hit', amount: result.damage };
  }

  if (enemy.hp <= 0) {
    enemyText = `${enemyCard.name} was defeated.`;
  } else {
    const enemyAction = chooseEnemyAction(enemy);
    if (enemyAction === 'guard') {
      enemy.guard = true;
      enemyText = `${enemyCard.name} chose Guard.`;
      enemyEffect = { type: 'guard' };
    } else if (enemyAction === 'special') {
      const result = resolveSpecial(enemy, player, players);
      enemyText = `${enemyCard.name} used ${result.note}.`;
      enemyEffect = result.healed > 0 && result.totalDamage === 0
        ? { type: 'heal', amount: result.healed }
        : { type: 'special', amount: result.totalDamage || result.healed };
      if (result.totalDamage > 0) playerEffect = { type: 'hit', amount: result.totalDamage };
    } else {
      const result = applyDamage(player, normalDamage(enemy, player));
      enemyText = result.missed
        ? `${playerCard.name} dodged the counterattack.`
        : `${enemyCard.name} countered for ${result.damage}.`;
      playerEffect = result.missed ? { type: 'miss' } : { type: 'hit', amount: result.damage };
    }
  }

  const playersAlive = players.some((fighter) => fighter.hp > 0);
  const enemiesAlive = enemies.some((fighter) => fighter.hp > 0);

  return {
    players,
    enemies,
    playerText,
    enemyText,
    playerEffect,
    enemyEffect,
    bonusUsed,
    winner: playersAlive && enemiesAlive ? null : enemiesAlive ? 'enemy' : 'player',
  };
}
