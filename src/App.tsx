import { FormEvent, useMemo, useState } from 'react';
import { cards } from './data/cards';
import type { FruitCard } from './types';

const maxHealth = 140;

function Card({ card, active }: { card: FruitCard; active?: boolean }) {
  return (
    <article className={`fruit-card ${active ? 'active' : ''}`} style={{ '--accent': card.accent } as React.CSSProperties}>
      <header>
        <strong>{card.name}</strong>
        <span>{card.rarity}</span>
      </header>
      <div className="character" aria-label={`${card.fruit} character`}>{card.icon}</div>
      <div className="stats">
        <span>✊ <b>{card.power}</b><small>Power</small></span>
        <span>💥 <b>{card.damage}</b><small>Damage</small></span>
        <span>⭐ <b>{card.rating}</b><small>Rating</small></span>
      </div>
      <footer><b>{card.specialName}</b><small>{card.specialText}</small></footer>
    </article>
  );
}

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('fca-username') ?? '');
  const [draftName, setDraftName] = useState(username);
  const [playerHp, setPlayerHp] = useState(maxHealth);
  const [enemyHp, setEnemyHp] = useState(maxHealth);
  const [bonusUsed, setBonusUsed] = useState(false);
  const [message, setMessage] = useState('Choose an action to begin the exhibition battle.');
  const player = cards[1];
  const enemy = cards[0];

  const winner = useMemo(() => {
    if (enemyHp <= 0) return username || 'Player';
    if (playerHp <= 0) return 'Arena Rival';
    return null;
  }, [enemyHp, playerHp, username]);

  function enterArena(event: FormEvent) {
    event.preventDefault();
    const cleanName = draftName.trim().slice(0, 18);
    if (!cleanName) return;
    localStorage.setItem('fca-username', cleanName);
    setUsername(cleanName);
  }

  function enemyTurn() {
    const hit = 12 + Math.floor(Math.random() * 12);
    setPlayerHp((value) => Math.max(0, value - hit));
    return hit;
  }

  function attack(useBonus = false) {
    if (winner) return;
    const hit = 16 + Math.floor(Math.random() * 13) + (useBonus ? 20 : 0);
    setEnemyHp((value) => Math.max(0, value - hit));
    if (useBonus) setBonusUsed(true);
    const reply = enemyTurn();
    setMessage(`${player.name} dealt ${hit} damage. ${enemy.name} answered for ${reply}.`);
  }

  function guard() {
    if (winner) return;
    const hit = 5 + Math.floor(Math.random() * 7);
    setPlayerHp((value) => Math.max(0, value - hit));
    setMessage(`${player.name} guarded. The incoming hit was reduced to ${hit}.`);
  }

  function special() {
    if (winner) return;
    const hit = 28 + Math.floor(Math.random() * 10);
    setEnemyHp((value) => Math.max(0, value - hit));
    const reply = enemyTurn();
    setMessage(`${player.specialName}! ${hit} damage dealt; rival countered for ${reply}.`);
  }

  function reset() {
    setPlayerHp(maxHealth);
    setEnemyHp(maxHealth);
    setBonusUsed(false);
    setMessage('New exhibition battle ready.');
  }

  if (!username) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <p className="eyebrow">Welcome to</p>
          <h1>Fruit Card <span>Arena</span></h1>
          <p>Enter a simple player name. No email or password is required for this prototype.</p>
          <form onSubmit={enterArena}>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={18} placeholder="Player name" autoFocus />
            <button type="submit">Enter Arena</button>
          </form>
          <small>Progress is stored only in this browser.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <nav><b>FRUIT CARD ARENA</b><span>Player: {username}</span></nav>
      <section className="hero">
        <p className="eyebrow">Phase 0 playable scaffold</p>
        <h1>Exhibition Battle</h1>
        <p>Temporary emoji artwork is used until the approved individual card illustrations are exported.</p>
      </section>

      <section className="arena">
        <div className="fighter">
          <h2>{username}</h2>
          <div className="health"><i style={{ width: `${(playerHp / maxHealth) * 100}%` }} /><span>{playerHp} HP</span></div>
          <Card card={player} active />
        </div>
        <div className="versus">VS</div>
        <div className="fighter">
          <h2>Arena Rival</h2>
          <div className="health"><i style={{ width: `${(enemyHp / maxHealth) * 100}%` }} /><span>{enemyHp} HP</span></div>
          <Card card={enemy} active />
        </div>
      </section>

      <section className="battle-console">
        <p className="battle-message">{winner ? `${winner} wins the battle!` : message}</p>
        <div className="actions">
          <button onClick={() => attack(false)} disabled={Boolean(winner)}>⚔ Attack</button>
          <button onClick={guard} disabled={Boolean(winner)}>🛡 Guard</button>
          <button onClick={special} disabled={Boolean(winner)}>✨ Special</button>
          <button className="bonus" onClick={() => attack(true)} disabled={bonusUsed || Boolean(winner)}>+20 Bonus</button>
          <button className="secondary" onClick={reset}>Reset</button>
        </div>
      </section>

      <section className="collection">
        <h2>Approved prototype cards</h2>
        <div className="card-grid">{cards.map((card) => <Card key={card.id} card={card} />)}</div>
      </section>
    </main>
  );
}
