import { cardById } from '../data/registry';
import type { FighterState, FruitCard } from '../types';

export type BattleAction = 'attack' | 'guard' | 'special' | 'bonus';
export type EnemyAction = Exclude<BattleAction, 'bonus'>;
export type Difficulty = 'easy' | 'normal' | 'hard';
export type BattleEffect = { type: 'hit' | 'guard' | 'heal' | 'special' | 'miss'; amount?: number } | null;

export interface TurnResult {
  players: FighterState[];
  enemies: FighterState[];
  playerText: string;
  enemyText: string;
  playerEffect: BattleEffect;
  enemyEffect: BattleEffect;
  enemyAction: EnemyAction | null;
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

const difficultySettings: Record<Difficulty, { damage: number; specialChance: number; guardChance: number }> = {
  easy: { damage: 0.82, specialChance: 0.25, guardChance: 0.2 },
  normal: { damage: 1, specialChance: 0.42, guardChance: 0.35 },
  hard: { damage: 1.18, specialChance: 0.65, guardChance: 0.5 },
};

function normalDamage(attacker: FighterState, defender: FighterState, bonus = 0, multiplier = 1) {
  const attackCard = cardById[attacker.cardId];
  const defendCard = cardById[defender.cardId];
  const roll = Math.floor(Math.random() * 7) - 3;
  const weakened = attacker.weakened;
  attacker.weakened = 0;

  const damage = attackCard.battle.attack + roll + bonus - Math.floor(defendCard.battle.defence * 0.55) - weakened;
  return Math.max(8, Math.round(damage * multiplier));
}

function resolveSpecial(attacker: FighterState, target: FighterState, opposingTeam: FighterState[], multiplier = 1) {
  const card = cardById[attacker.cardId];
  const move = card.special;
  attacker.specialUsed = true;

  let totalDamage = 0;
  let healed = 0;
  let note = move.name;

  switch (move.kind) {
    case 'damage':
      totalDamage = applyDamage(target, Math.round(move.amount * multiplier)).damage;
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
        totalDamage += applyDamage(target, Math.round(move.amount * multiplier)).damage;
        if (target.hp <= 0) break;
      }
      break;
    }
    case 'splash': {
      totalDamage = applyDamage(target, Math.round(move.amount * multiplier)).damage;
      const benchDamage = Math.round((move.secondary ?? 5) * multiplier);
      opposingTeam.forEach((fighter) => {
        if (fighter !== target && fighter.hp > 0) fighter.hp = Math.max(0, fighter.hp - benchDamage);
      });
      note += ` + ${benchDamage} bench damage`;
      break;
    }
    case 'drain': {
      totalDamage = applyDamage(target, Math.round(move.amount * multiplier)).damage;
      const before = attacker.hp;
      attacker.hp = Math.min(card.battle.maxHp, attacker.hp + (move.secondary ?? Math.floor(totalDamage / 2)));
      healed = attacker.hp - before;
      break;
    }
    case 'weaken':
      totalDamage = applyDamage(target, Math.round(move.amount * multiplier)).damage;
      target.weakened += move.secondary ?? 8;
      break;
    case 'dodge':
      totalDamage = applyDamage(target, Math.round(move.amount * multiplier)).damage;
      attacker.evade = true;
      break;
    case 'damage-shield':
      totalDamage = applyDamage(target, Math.round(move.amount * multiplier)).damage;
      attacker.shield += move.secondary ?? 14;
      break;
    default: {
      const exhaustiveCheck: never = move.kind;
      throw new Error(`Unsupported special move: ${exhaustiveCheck}`);
    }
  }

  return { totalDamage, healed, note };
}

export function chooseEnemyAction(fighter: FighterState, difficulty: Difficulty = 'normal'): EnemyAction {
  const card = cardById[fighter.cardId];
  const hpRatio = fighter.hp / card.battle.maxHp;
  const settings = difficultySettings[difficulty];
  if (!fighter.specialUsed && (hpRatio < 0.45 || Math.random() < settings.specialChance)) return 'special';
  if (hpRatio < 0.4 && Math.random() < settings.guardChance) return 'guard';
  return 'attack';
}

export function estimateEnemyDamage(attacker: FighterState, defender: FighterState, action: EnemyAction, difficulty: Difficulty = 'normal') {
  const attackCard = cardById[attacker.cardId];
  const defendCard = cardById[defender.cardId];
  const settings = difficultySettings[difficulty];
  if (action === 'guard') return 0;
  if (action === 'special') {
    const move = attackCard.special;
    if (move.kind === 'shield' || move.kind === 'heal') return 0;
    const hits = move.kind === 'double-hit' ? move.secondary ?? 2 : 1;
    return Math.max(0, Math.round(move.amount * settings.damage) * hits);
  }
  const baseDamage = attackCard.battle.attack - Math.floor(defendCard.battle.defence * 0.55) - attacker.weakened;
  return Math.max(8, Math.round(baseDamage * settings.damage));
}

export function resolveTurn(playerTeam: FighterState[], enemyTeam: FighterState[], action: BattleAction, currentBonusUsed: boolean, difficulty: Difficulty = 'normal', plannedEnemyAction?: EnemyAction): TurnResult {
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
      enemyAction: null,
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
  let enemyAction: EnemyAction | null = null;
  let bonusUsed = currentBonusUsed;

  if (action === 'guard') {
    player.guard = true;
    playerText = `${playerCard.name} is guarding.`;
    playerEffect = { type: 'guard' };
  } else if (action === 'special') {
    const result = resolveSpecial(player, enemy, enemies);
    playerText = `${playerCard.name} used ${result.note}.`;
    playerEffect = result.healed > 0 && result.totalDamage === 0 ? { type: 'heal', amount: result.healed } : { type: 'special', amount: result.totalDamage || result.healed };
    if (result.totalDamage > 0) enemyEffect = { type: 'hit', amount: result.totalDamage };
  } else {
    const bonus = action === 'bonus' ? 20 : 0;
    const result = applyDamage(enemy, normalDamage(player, enemy, bonus));
    bonusUsed = bonusUsed || action === 'bonus';
    playerText = result.missed ? `${enemyCard.name} dodged the attack.` : `${playerCard.name} dealt ${result.damage}${bonus ? ' boosted' : ''} damage.`;
    enemyEffect = result.missed ? { type: 'miss' } : { type: 'hit', amount: result.damage };
  }

  if (enemy.hp <= 0) {
    enemyText = `${enemyCard.name} was defeated.`;
  } else {
    const settings = difficultySettings[difficulty];
    enemyAction = plannedEnemyAction ?? chooseEnemyAction(enemy, difficulty);
    if (enemyAction === 'guard') {
      enemy.guard = true;
      enemyText = `${enemyCard.name} chose Guard.`;
      enemyEffect = { type: 'guard' };
    } else if (enemyAction === 'special') {
      const result = resolveSpecial(enemy, player, players, settings.damage);
      enemyText = `${enemyCard.name} used ${result.note}.`;
      enemyEffect = result.healed > 0 && result.totalDamage === 0 ? { type: 'heal', amount: result.healed } : { type: 'special', amount: result.totalDamage || result.healed };
      if (result.totalDamage > 0) playerEffect = { type: 'hit', amount: result.totalDamage };
    } else {
      const result = applyDamage(player, normalDamage(enemy, player, 0, settings.damage));
      enemyText = result.missed ? `${playerCard.name} dodged the counterattack.` : `${enemyCard.name} countered for ${result.damage}.`;
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
    enemyAction,
    bonusUsed,
    winner: playersAlive && enemiesAlive ? null : enemiesAlive ? 'enemy' : 'player',
  };
}
