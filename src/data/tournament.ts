export type ArenaRule = 'starter-juice' | 'guard-refill' | 'cheap-bonus' | 'storm-specials' | 'royal-shield';

export interface ArenaTwist {
  name: string;
  text: string;
  rule: ArenaRule;
}

export interface TournamentStage {
  id: string;
  name: string;
  subtitle: string;
  opponent: string;
  team: [string, string, string];
  reward: number;
  twist: ArenaTwist;
}

export const tournamentStages: TournamentStage[] = [
  {
    id: 'garden-gate',
    name: 'Garden Gate',
    subtitle: 'A gentle opening battle against quick common fighters.',
    opponent: 'Garden Rookie',
    team: ['orange', 'yello', 'grape'],
    reward: 100,
    twist: {
      name: 'Starter Spark',
      text: 'Begin with 2 juice so your first decision arrives faster.',
      rule: 'starter-juice',
    },
  },
  {
    id: 'juice-market',
    name: 'Juice Market',
    subtitle: 'Trickier rivals mix speed, healing and defence.',
    opponent: 'Market Mixer',
    team: ['peachy', 'bikelini', 'tom'],
    reward: 150,
    twist: {
      name: 'Fresh Squeeze',
      text: 'Guarding refills your juice to full.',
      rule: 'guard-refill',
    },
  },
  {
    id: 'spike-trail',
    name: 'Spike Trail',
    subtitle: 'Tougher cards punish teams without a balanced plan.',
    opponent: 'Crown Ranger',
    team: ['piney', 'poey', 'appleini'],
    reward: 225,
    twist: {
      name: 'Sharp Timing',
      text: 'Your +20 Bonus costs only 2 juice here.',
      rule: 'cheap-bonus',
    },
  },
  {
    id: 'tropical-storm',
    name: 'Tropical Storm',
    subtitle: 'Heavy attacks and special powers arrive quickly.',
    opponent: 'Storm Captain',
    team: ['coco', 'dragon-fruit', 'ava'],
    reward: 325,
    twist: {
      name: 'Storm Charge',
      text: 'Special moves cost only 1 juice.',
      rule: 'storm-specials',
    },
  },
  {
    id: 'arena-crown',
    name: 'Arena Crown',
    subtitle: 'The strongest first-set team guards the championship.',
    opponent: 'Fruit Champion',
    team: ['meloni', 'ava', 'dragon-fruit'],
    reward: 500,
    twist: {
      name: 'Royal Peel',
      text: 'Rival cards enter with 12 shield.',
      rule: 'royal-shield',
    },
  },
];
