import { afterEach, describe, expect, it, vi } from 'vitest';
import { cardById } from '../data/registry';
import { chooseEnemyAction, estimateEnemyDamage, freshFighter, resolveTurn } from './engine';

const makeTeam = (ids: string[]) => ids.map((id) => freshFighter(cardById[id]));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('battle engine', () => {
  it('creates a fighter with full health and unused effects', () => {
    const fighter = freshFighter(cardById.ava);
    expect(fighter.hp).toBe(cardById.ava.battle.maxHp);
    expect(fighter.specialUsed).toBe(false);
    expect(fighter.shield).toBe(0);
  });

  it('uses the +20 bonus only once and increases damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const players = makeTeam(['dragon-fruit', 'ava', 'piney']);
    const enemies = makeTeam(['tom', 'poey', 'orange']);
    const normal = resolveTurn(players, enemies, 'attack', false);
    const boosted = resolveTurn(players, enemies, 'bonus', false);

    const normalLoss = enemies[0].hp - normal.enemies[0].hp;
    const boostedLoss = enemies[0].hp - boosted.enemies[0].hp;
    expect(boostedLoss).toBeGreaterThan(normalLoss);
    expect(boosted.bonusUsed).toBe(true);
  });

  it('guard reduces the next incoming hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const players = makeTeam(['ava', 'piney', 'peachy']);
    const enemies = makeTeam(['dragon-fruit', 'coco', 'meloni']);
    const result = resolveTurn(players, enemies, 'guard', false);
    expect(result.players[0].hp).toBeLessThanOrEqual(players[0].hp);
    expect(result.playerText).toContain('guarding');
  });

  it('shield special adds protection', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const result = resolveTurn(
      makeTeam(['ava', 'piney', 'peachy']),
      makeTeam(['orange', 'grape', 'yello']),
      'special',
      false,
    );
    expect(result.players[0].specialUsed).toBe(true);
    expect(result.players[0].shield).toBeGreaterThan(0);
  });

  it('splash special damages the rival bench', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const enemies = makeTeam(['tom', 'orange', 'grape']);
    const result = resolveTurn(
      makeTeam(['meloni', 'ava', 'piney']),
      enemies,
      'special',
      false,
    );
    expect(result.enemies[1].hp).toBeLessThan(enemies[1].hp);
    expect(result.enemies[2].hp).toBeLessThan(enemies[2].hp);
  });

  it.each([
    ['peachy', 'heal'],
    ['bikelini', 'double-hit'],
    ['appleini', 'drain'],
    ['orange', 'weaken'],
    ['yello', 'dodge'],
    ['poey', 'damage-shield'],
  ])('resolves the %s %s special', (cardId) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const players = makeTeam([cardId, 'ava', 'piney']);
    players[0].hp = Math.max(1, players[0].hp - 30);
    const result = resolveTurn(players, makeTeam(['tom', 'grape', 'coco']), 'special', false);
    expect(result.players[0].specialUsed).toBe(true);
    expect(result.playerText).toContain(cardById[cardId].special.name);
  });

  it('uses difficulty to scale rival damage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const players = makeTeam(['ava', 'piney', 'peachy']);
    const enemies = makeTeam(['coco', 'tom', 'orange']);
    const easy = resolveTurn(players, enemies, 'attack', false, 'easy');
    const hard = resolveTurn(players, enemies, 'attack', false, 'hard');
    expect(players[0].hp - hard.players[0].hp).toBeGreaterThan(players[0].hp - easy.players[0].hp);
  });

  it('makes hard rivals more likely to use their special', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const fighter = makeTeam(['coco'])[0];
    expect(chooseEnemyAction(fighter, 'easy')).toBe('attack');
    expect(chooseEnemyAction(fighter, 'hard')).toBe('special');
  });

  it('resolves the planned enemy intent shown to the player', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const result = resolveTurn(
      makeTeam(['ava', 'piney', 'peachy']),
      makeTeam(['coco', 'tom', 'orange']),
      'attack',
      false,
      'normal',
      'guard',
    );

    expect(result.enemyAction).toBe('guard');
    expect(result.enemyText).toContain('chose Guard');
  });

  it('estimates incoming enemy attack damage for the intent panel', () => {
    const players = makeTeam(['ava']);
    const enemies = makeTeam(['coco']);
    expect(estimateEnemyDamage(enemies[0], players[0], 'attack', 'hard')).toBeGreaterThan(0);
    expect(estimateEnemyDamage(enemies[0], players[0], 'guard', 'hard')).toBe(0);
  });

  it('scales player attack damage with the power-strike multiplier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const players = makeTeam(['dragon-fruit', 'ava', 'piney']);
    const enemies = makeTeam(['tom', 'poey', 'orange']);
    const normal = resolveTurn(players, enemies, 'attack', false, 'normal', 'guard', 1);
    const perfect = resolveTurn(players, enemies, 'attack', false, 'normal', 'guard', 1.5);

    const normalLoss = enemies[0].hp - normal.enemies[0].hp;
    const perfectLoss = enemies[0].hp - perfect.enemies[0].hp;
    expect(perfectLoss).toBeGreaterThan(normalLoss);
  });

  it('scales damaging specials with the power-strike multiplier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const enemiesBase = makeTeam(['tom']);
    const enemiesBoosted = makeTeam(['tom']);
    const base = resolveTurn(makeTeam(['piney']), enemiesBase, 'special', false, 'normal', 'guard', 1);
    const boosted = resolveTurn(makeTeam(['piney']), enemiesBoosted, 'special', false, 'normal', 'guard', 1.5);
    const baseLoss = enemiesBase[0].hp - base.enemies[0].hp;
    const boostedLoss = enemiesBoosted[0].hp - boosted.enemies[0].hp;
    expect(boostedLoss).toBeGreaterThan(baseLoss);
  });
});
