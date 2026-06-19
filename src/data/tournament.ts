export interface TournamentStage {
  id: string;
  name: string;
  subtitle: string;
  opponent: string;
  team: [string, string, string];
  reward: number;
}

export const tournamentStages: TournamentStage[] = [
  {
    id: 'garden-gate',
    name: 'Garden Gate',
    subtitle: 'A gentle opening battle against quick common fighters.',
    opponent: 'Garden Rookie',
    team: ['orange', 'yello', 'grape'],
    reward: 100,
  },
  {
    id: 'juice-market',
    name: 'Juice Market',
    subtitle: 'Trickier rivals mix speed, healing and defence.',
    opponent: 'Market Mixer',
    team: ['peachy', 'bikelini', 'tom'],
    reward: 150,
  },
  {
    id: 'spike-trail',
    name: 'Spike Trail',
    subtitle: 'Tougher cards punish teams without a balanced plan.',
    opponent: 'Crown Ranger',
    team: ['piney', 'poey', 'appleini'],
    reward: 225,
  },
  {
    id: 'tropical-storm',
    name: 'Tropical Storm',
    subtitle: 'Heavy attacks and special powers arrive quickly.',
    opponent: 'Storm Captain',
    team: ['coco', 'dragon-fruit', 'ava'],
    reward: 325,
  },
  {
    id: 'arena-crown',
    name: 'Arena Crown',
    subtitle: 'The strongest first-set team guards the championship.',
    opponent: 'Fruit Champion',
    team: ['meloni', 'ava', 'dragon-fruit'],
    reward: 500,
  },
];
