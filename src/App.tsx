import { FormEvent, useMemo, useState } from 'react';
import { cardById, cards } from './data/cards';
import type { FighterState, FruitCard } from './types';

type Screen = 'login' | 'team' | 'battle' | 'result';
type Action = 'attack' | 'guard' | 'special' | 'bonus';
type SideEffect = { type: 'hit' | 'guard' | 'heal' | 'special' | 'miss'; amount?: number } | null;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const livingIndex = (team: FighterState[]) => team.findIndex((fighter) => fighter.hp > 0);
const freshFighter = (card: FruitCard): FighterState => ({
  cardId: card.id,
  hp: card.battle.maxHp,
  specialUsed: false,
  shield: 0,
  guard: false,
  evade: false,
  weakened: 0,
});

function Card({ card, selected, compact = false, onClick }: { card: FruitCard; selected?: boolean; compact?: boolean; onClick?: () => void }) {
  const artUrl = card.art ? `${import.meta.env.BASE_URL}${card.art}` : null;
  return (
    <article
      className={`fruit-card ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--accent': card.accent } as React.CSSProperties}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) onClick();
      }}
    >
      <header>
        <strong>{card.name}</strong>
        <span>{card.rarity}</span>
      </header>
      <div className="character" aria-label={`${card.fruit} character`}>
        {artUrl ? <img src={artUrl} alt={`${card.name} card artwork`} /> : <span>{card.icon}</span>}
      </div>
      <div className="stats">
        <span>✊ <b>{card.collector.power}</b><small>Power</small></span>
        <span>💥 <b>{card.collector.damage}</b><small>Damage</small></span>
        <span>⭐ <b>{card.collector.rating}</b><small>Rating</small></span>
      </div>
      <footer>
        <b>{card.special.name}</b>
        <small>{card.special.text}</small>
      </footer>
      <div className="role-tag">{card.role}</div>
    </article>
  );
}

function TeamStrip({ team, activeIndex, label }: { team: FighterState[]; activeIndex: number; label: string }) {
  return (
    <div className="team-strip" aria-label={label}>
      {team.map((fighter, index) => {
        const card = cardById[fighter.cardId];
        return (
          <div key={fighter.cardId} className={`team-token ${index === activeIndex ? 'active' : ''} ${fighter.hp <= 0 ? 'defeated' : ''}`}>
            <span>{card.icon}</span>
            <small>{card.name}</small>
          </div>
        );
      })}
    </div>
  );
}

function HealthBar({ fighter }: { fighter: FighterState }) {
  const card = cardById[fighter.cardId];
  const percent = clamp((fighter.hp / card.battle.maxHp) * 100, 0, 100);
  return (
    <div className="health-block">
      <div className="health"><i style={{ width: `${percent}%` }} /><span>{fighter.hp} / {card.battle.maxHp} HP</span></div>
      <div className="status-row">
        {fighter.shield > 0 && <span>🛡 {fighter.shield}</span>}
        {fighter.guard && <span>Guarding</span>}
        {fighter.evade && <span>Evade ready</span>}
        {fighter.weakened > 0 && <span>Weakened -{fighter.weakened}</span>}
      </div>
    </div>
  );
}

export default function App() {
  const storedName = localStorage.getItem('fca-username') ?? '';
  const storedTeam = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('fca-team') ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((id) => cards.some((card) => card.id === id)).slice(0, 3) : [];
    } catch {
      return [];
    }
  })();

  const [screen, setScreen] = useState<Screen>(storedName ? 'team' : 'login');
  const [username, setUsername] = useState(storedName);
  const [draftName, setDraftName] = useState(storedName);
  const [selectedIds, setSelectedIds] = useState<string[]>(storedTeam);
  const [playerTeam, setPlayerTeam] = useState<FighterState[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<FighterState[]>([]);
  const [bonusUsed, setBonusUsed] = useState(false);
  const [message, setMessage] = useState('Choose an action. The maths is handled automatically.');
  const [playerEffect, setPlayerEffect] = useState<SideEffect>(null);
  const [enemyEffect, setEnemyEffect] = useState<SideEffect>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const playerActiveIndex = livingIndex(playerTeam);
  const enemyActiveIndex = livingIndex(enemyTeam);
  const playerActive = playerActiveIndex >= 0 ? playerTeam[playerActiveIndex] : null;
  const enemyActive = enemyActiveIndex >= 0 ? enemyTeam[enemyActiveIndex] : null;
  const playerCard = playerActive ? cardById[playerActive.cardId] : null;
  const enemyCard = enemyActive ? cardById[enemyActive.cardId] : null;

  const availableCards = useMemo(() => cards, []);

  function enterArena(event: FormEvent) {
    event.preventDefault();
    const cleanName = draftName.trim().slice(0, 18);
    if (!cleanName) return;
    localStorage.setItem('fca-username', cleanName);
    setUsername(cleanName);
    setScreen('team');
  }

  function toggleCard(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  function startBattle() {
    if (selectedIds.length !== 3) return;
    localStorage.setItem('fca-team', JSON.stringify(selectedIds));
    const enemyPool = cards.filter((card) => !selectedIds.includes(card.id));
    const shuffled = [...enemyPool].sort(() => Math.random() - 0.5).slice(0, 3);
    const chosenEnemies = shuffled.length === 3 ? shuffled : cards.slice(0, 3);
    setPlayerTeam(selectedIds.map((id) => freshFighter(cardById[id])));
    setEnemyTeam(chosenEnemies.map(freshFighter));
    setBonusUsed(false);
    setWinner(null);
    setPlayerEffect(null);
    setEnemyEffect(null);
    setMessage('Battle ready. Choose Attack, Guard, Special or your one-use Bonus.');
    setScreen('battle');
  }

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
    return Math.max(8, attackCard.battle.attack + roll + bonus - Math.floor(defendCard.battle.defence * 0.55) - weakened);
  }

  function resolveSpecial(attacker: FighterState, target: FighterState, opposingTeam: FighterState[]) {
    const card = cardById[attacker.cardId];
    const move = card.special;
    attacker.specialUsed = true;
    let totalDamage = 0;
    let healed = 0;
    let note = move.name;

    if (move.kind === 'damage') {
      totalDamage = applyDamage(target, move.amount).damage;
    } else if (move.kind === 'shield') {
      attacker.shield += move.amount;
    } else if (move.kind === 'heal') {
      const before = attacker.hp;
      attacker.hp = Math.min(card.battle.maxHp, attacker.hp + move.amount);
      healed = attacker.hp - before;
    } else if (move.kind === 'double-hit') {
      const hits = move.secondary ?? 2;
      for (let index = 0; index < hits; index += 1) {
        totalDamage += applyDamage(target, move.amount).damage;
        if (target.hp <= 0) break;
      }
    } else if (move.kind === 'splash') {
      totalDamage = applyDamage(target, move.amount).damage;
      const benchDamage = move.secondary ?? 5;
      opposingTeam.forEach((fighter) => {
        if (fighter !== target && fighter.hp > 0) fighter.hp = Math.max(0, fighter.hp - benchDamage);
      });
      note += ` + ${benchDamage} bench damage`;
    } else if (move.kind === 'drain') {
      totalDamage = applyDamage(target, move.amount).damage;
      const before = attacker.hp;
      attacker.hp = Math.min(card.battle.maxHp, attacker.hp + (move.secondary ?? Math.floor(totalDamage / 2)));
      healed = attacker.hp - before;
    } else if (move.kind === 'weaken') {
      totalDamage = applyDamage(target, move.amount).damage;
      target.weakened += move.secondary ?? 8;
    } else if (move.kind === 'dodge') {
      totalDamage = applyDamage(target, move.amount).damage;
      attacker.evade = true;
    } else if (move.kind === 'damage-shield') {
      totalDamage = applyDamage(target, move.amount).damage;
      attacker.shield += move.secondary ?? 14;
    }

    return { totalDamage, healed, note };
  }

  function chooseEnemyAction(fighter: FighterState): Exclude<Action, 'bonus'> {
    const card = cardById[fighter.cardId];
    const hpRatio = fighter.hp / card.battle.maxHp;
    if (!fighter.specialUsed && (hpRatio < 0.55 || Math.random() < 0.42)) return 'special';
    if (hpRatio < 0.35 && Math.random() < 0.35) return 'guard';
    return 'attack';
  }

  function playTurn(action: Action) {
    if (!playerActive || !enemyActive || !playerCard || !enemyCard || winner) return;
    if (action === 'special' && playerActive.specialUsed) return;
    if (action === 'bonus' && bonusUsed) return;

    const players = playerTeam.map((fighter) => ({ ...fighter }));
    const enemies = enemyTeam.map((fighter) => ({ ...fighter }));
    const pIndex = livingIndex(players);
    const eIndex = livingIndex(enemies);
    const p = players[pIndex];
    const e = enemies[eIndex];
    const pCard = cardById[p.cardId];
    const eCard = cardById[e.cardId];

    let playerText = '';
    let enemyText = '';
    let pEffect: SideEffect = null;
    let eEffect: SideEffect = null;

    if (action === 'guard') {
      p.guard = true;
      playerText = `${pCard.name} is guarding.`;
      pEffect = { type: 'guard' };
    } else if (action === 'special') {
      const result = resolveSpecial(p, e, enemies);
      playerText = `${pCard.name} used ${result.note}.`;
      pEffect = result.healed > 0 && result.totalDamage === 0 ? { type: 'heal', amount: result.healed } : { type: 'special', amount: result.totalDamage || result.healed };
    } else {
      const bonus = action === 'bonus' ? 20 : 0;
      const result = applyDamage(e, normalDamage(p, e, bonus));
      if (action === 'bonus') setBonusUsed(true);
      playerText = result.missed ? `${eCard.name} dodged the attack.` : `${pCard.name} dealt ${result.damage}${bonus ? ' boosted' : ''} damage.`;
      eEffect = result.missed ? { type: 'miss' } : { type: 'hit', amount: result.damage };
    }

    if (e.hp <= 0) {
      enemyText = `${eCard.name} was defeated.`;
    } else {
      const enemyAction = chooseEnemyAction(e);
      if (enemyAction === 'guard') {
        e.guard = true;
        enemyText = `${eCard.name} chose Guard.`;
        eEffect = { type: 'guard' };
      } else if (enemyAction === 'special') {
        const result = resolveSpecial(e, p, players);
        enemyText = `${eCard.name} used ${result.note}.`;
        eEffect = result.healed > 0 && result.totalDamage === 0 ? { type: 'heal', amount: result.healed } : { type: 'special', amount: result.totalDamage || result.healed };
        if (result.totalDamage > 0) pEffect = { type: 'hit', amount: result.totalDamage };
      } else {
        const result = applyDamage(p, normalDamage(e, p));
        enemyText = result.missed ? `${pCard.name} dodged the counterattack.` : `${eCard.name} countered for ${result.damage}.`;
        pEffect = result.missed ? { type: 'miss' } : { type: 'hit', amount: result.damage };
      }
    }

    const playersAlive = players.some((fighter) => fighter.hp > 0);
    const enemiesAlive = enemies.some((fighter) => fighter.hp > 0);
    setPlayerTeam(players);
    setEnemyTeam(enemies);
    setPlayerEffect(pEffect);
    setEnemyEffect(eEffect);
    setMessage(`${playerText} ${enemyText}`.trim());

    if (!enemiesAlive || !playersAlive) {
      const resultWinner = enemiesAlive ? 'Arena Rival' : username;
      setWinner(resultWinner);
      setScreen('result');
    }
  }

  if (screen === 'login') {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <p className="eyebrow">Welcome to</p>
          <h1>Fruit Card <span>Arena</span></h1>
          <p>Enter a simple player name. No email or password is required for this prototype.</p>
          <form onSubmit={enterArena}>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={18} placeholder="Player name" autoFocus />
            <button type="submit">Enter Arena</button>
          </form>
          <small>Progress is stored only in this browser.</small>
        </section>
      </main>
    );
  }

  if (screen === 'team') {
    return (
      <main className="app-shell">
        <nav><b>FRUIT CARD ARENA</b><span>Player: {username}</span></nav>
        <section className="hero compact-hero">
          <p className="eyebrow">Build your squad</p>
          <h1>Choose Three</h1>
          <p>Collector stats keep the personality of the original cards. Hidden battle stats keep matches fair.</p>
        </section>
        <section className="selection-bar">
          <strong>{selectedIds.length}/3 selected</strong>
          <button onClick={startBattle} disabled={selectedIds.length !== 3}>Start Battle</button>
        </section>
        <section className="card-grid collection-grid">
          {availableCards.map((card) => <Card key={card.id} card={card} selected={selectedIds.includes(card.id)} compact onClick={() => toggleCard(card.id)} />)}
        </section>
      </main>
    );
  }

  if (screen === 'result') {
    return (
      <main className="login-screen result-screen">
        <section className="login-panel">
          <p className="eyebrow">Battle complete</p>
          <h1>{winner === username ? 'Victory!' : 'Defeat'}</h1>
          <p>{winner} won the match.</p>
          <div className="result-actions">
            <button onClick={startBattle}>Rematch</button>
            <button className="secondary" onClick={() => setScreen('team')}>Change Team</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <nav><b>FRUIT CARD ARENA</b><span>Player: {username}</span></nav>
      <section className="hero battle-hero">
        <p className="eyebrow">Three-card exhibition</p>
        <h1>Battle Arena</h1>
      </section>

      <section className="team-heads">
        <TeamStrip team={playerTeam} activeIndex={playerActiveIndex} label={`${username}'s team`} />
        <TeamStrip team={enemyTeam} activeIndex={enemyActiveIndex} label="Rival team" />
      </section>

      <section className="arena">
        <div className={`fighter ${playerEffect?.type ?? ''}`}>
          <h2>{username}</h2>
          {playerActive && <HealthBar fighter={playerActive} />}
          {playerCard && <Card card={playerCard} />}
          {playerEffect?.amount ? <div className={`floating-effect ${playerEffect.type}`}>{playerEffect.type === 'heal' ? '+' : '-'}{playerEffect.amount}</div> : null}
          {playerEffect?.type === 'miss' && <div className="floating-effect miss">MISS</div>}
        </div>
        <div className="versus">VS</div>
        <div className={`fighter ${enemyEffect?.type ?? ''}`}>
          <h2>Arena Rival</h2>
          {enemyActive && <HealthBar fighter={enemyActive} />}
          {enemyCard && <Card card={enemyCard} />}
          {enemyEffect?.amount ? <div className={`floating-effect ${enemyEffect.type}`}>{enemyEffect.type === 'heal' ? '+' : '-'}{enemyEffect.amount}</div> : null}
          {enemyEffect?.type === 'miss' && <div className="floating-effect miss">MISS</div>}
        </div>
      </section>

      <section className="battle-console">
        <p className="battle-message">{message}</p>
        <div className="actions">
          <button onClick={() => playTurn('attack')}>⚔ Attack</button>
          <button onClick={() => playTurn('guard')}>🛡 Guard</button>
          <button onClick={() => playTurn('special')} disabled={Boolean(playerActive?.specialUsed)}>✨ {playerCard?.special.name}</button>
          <button className="bonus" onClick={() => playTurn('bonus')} disabled={bonusUsed}>+20 Bonus</button>
          <button className="secondary" onClick={() => setScreen('team')}>Change Team</button>
        </div>
      </section>
    </main>
  );
}
