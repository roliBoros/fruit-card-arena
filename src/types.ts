export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface FruitCard {
  id: string;
  name: string;
  fruit: string;
  power: number;
  damage: number;
  rating: number;
  rarity: Rarity;
  specialName: string;
  specialText: string;
  icon: string;
  accent: string;
  confirmed: boolean;
}
