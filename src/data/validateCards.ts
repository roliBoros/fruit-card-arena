import type { FruitCard } from '../types';

export function validateCards(cards: FruitCard[]) {
  const ids = new Set<string>();

  for (const card of cards) {
    if (!card.id.trim()) throw new Error('Every character needs a non-empty id.');
    if (ids.has(card.id)) throw new Error(`Duplicate character id: ${card.id}`);
    ids.add(card.id);

    if (!/^[a-z0-9-]+$/.test(card.id)) {
      throw new Error(`Character id must use lowercase letters, numbers and hyphens: ${card.id}`);
    }

    const collectorValues = Object.values(card.collector);
    if (collectorValues.some((value) => value < 0 || value > 100)) {
      throw new Error(`Collector stats must be between 0 and 100: ${card.id}`);
    }

    if (card.battle.maxHp <= 0 || card.battle.attack <= 0 || card.battle.defence < 0 || card.battle.speed < 0) {
      throw new Error(`Invalid battle stats for: ${card.id}`);
    }

    if (card.special.amount < 0 || (card.special.secondary ?? 0) < 0) {
      throw new Error(`Special move values cannot be negative: ${card.id}`);
    }
  }

  return cards;
}
