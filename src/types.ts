export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type Role = 'Striker' | 'Defender' | 'Speedster' | 'Trickster' | 'Support' | 'All-Rounder';
export type SpecialKind =
  | 'damage'
  | 'shield'
  | 'heal'
  | 'double-hit'
  | 'splash'
  | 'drain'
  | 'weaken'
  | 'dodge'
  | 'damage-shield';

export interface CollectorStats {
  power: number;
  damage: number;
  rating: number;
}

export interface BattleStats {
  maxHp: number;
  attack: number;
  defence: number;
  speed: number;
}

export interface SpecialMove {
  name: string;
  text: string;
  kind: SpecialKind;
  amount: number;
  secondary?: number;
}

export interface FruitCard {
  id: string;
  name: string;
  fruit: string;
  role: Role;
  rarity: Rarity;
  collector: CollectorStats;
  battle: BattleStats;
  special: SpecialMove;
  icon: string;
  accent: string;
  art?: string;
}

export interface FighterState {
  cardId: string;
  hp: number;
  specialUsed: boolean;
  shield: number;
  guard: boolean;
  evade: boolean;
  weakened: number;
}
