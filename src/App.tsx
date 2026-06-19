import { FormEvent, useMemo, useState } from 'react';
import { cardById, cards } from './data/registry';
import { tournamentStages } from './data/tournament';
import { freshFighter, livingIndex, resolveTurn } from './game/engine';
import type { BattleAction, BattleEffect } from './game/engine';
import type { FighterState, FruitCard } from './types';

type Screen = 'login' | 'team' | 'tournament' | 'battle' | 'result';
type BattleMode = 'exhibition' | 'tournament';

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function Card({ card, selected, compact = false, onClick }: { card: FruitCard; selected?: boolean; compact?: boolean; onClick?: () => void }) {
  const artUrl = card.art ? `${import.meta.env.BASE_URL}${card.art}` : null;
  return (
    <article className={`fruit-card ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`} style={{ '--accent': card.accent } as React.CSSProperties} onClick={onClick} tabIndex={onClick ? 0 : undefined} onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) onClick(); }}>
      <header><strong>{card.name}</strong><span>{card.rarity}</span></header>
      <div className="character" aria-label={`${card.fruit} character`}>{artUrl ? <img src={artUrl} alt={`${card.name} card artwork`} /> : <span>{card.icon}</span>}</div>
      <div className="stats">
        <span>✊ <b>{card.collector.power}</b><small>Power</small></span>
        <span>💥 <b>{card.collector.damage}</b><small>Damage</small></span>
        <span>⭐ <b>{card.collector.rating}</b><small>Rating</small></span>
      </div>
      <footer><b>{card.special.name}</b><small>{card.special.text}</small></footer>
      <div className="role-tag">{card.role}</div>
    </article>
  );
}

function TeamStrip({ team, activeIndex, label }: { team: FighterState[]; activeIndex: number; label: string }) {
  return <div className="team-strip" aria-label={label}>{team.map((fighter, index) => { const card = cardById[fighter.cardId]; return <div key={`${fighter.cardId}-${index}`} className={`team-token ${index === activeIndex ? 'active' : ''} ${fighter.hp <= 0 ? 'defeated' : ''}`}><span>{card.icon}</span><small>{card.name}</small></div>; })}</div>;
}

function HealthBar({ fighter }: { fighter: FighterState }) {
  const card = cardById[fighter.cardId];
  const percent = clamp((fighter.hp / card.battle.maxHp) * 100, 0, 100);
  return <div className="health-block"><div className="health"><i style={{ width: `${percent}%` }} /><span>{fighter.hp} / {card.battle.maxHp} HP</span></div><div className="status-row">{fighter.shield > 0 && <span>🛡 {fighter.shield}</span>}{fighter.guard && <span>Guarding</span>}{fighter.evade && <span>Evade ready</span>}{fighter.weakened > 0 && <span>Weakened -{fighter.weakened}</span>}</div></div>;
}

export default function App() {
  const storedName = localStorage.getItem('fca-username') ?? '';
  const storedProgress = Number(localStorage.getItem('fca-tournament-progress') ?? '0');
  const storedTeam = (() => { try { const parsed = JSON.parse(localStorage.getItem('fca-team') ?? '[]'); return Array.isArray(parsed) ? parsed.filter((id) => cards.some((card) => card.id === id)).slice(0, 3) : []; } catch { return []; } })();

  const [screen, setScreen] = useState<Screen>(storedName ? 'team' : 'login');
  const [username, setUsername] = useState(storedName);
  const [draftName, setDraftName] = useState(storedName);
  const [selectedIds, setSelectedIds] = useState<string[]>(storedTeam);
  const [playerTeam, setPlayerTeam] = useState<FighterState[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<FighterState[]>([]);
  const [bonusUsed, setBonusUsed] = useState(false);
  const [message, setMessage] = useState('Choose an action. The maths is handled automatically.');
  const [playerEffect, setPlayerEffect] = useState<BattleEffect>(null);
  const [enemyEffect, setEnemyEffect] = useState<BattleEffect>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<BattleMode>('exhibition');
  const [stageIndex, setStageIndex] = useState(Math.min(storedProgress, tournamentStages.length - 1));
  const [tournamentProgress, setTournamentProgress] = useState(storedProgress);

  const playerActiveIndex = livingIndex(playerTeam);
  const enemyActiveIndex = livingIndex(enemyTeam);
  const playerActive = playerActiveIndex >= 0 ? playerTeam[playerActiveIndex] : null;
  const enemyActive = enemyActiveIndex >= 0 ? enemyTeam[enemyActiveIndex] : null;
  const playerCard = playerActive ? cardById[playerActive.cardId] : null;
  const enemyCard = enemyActive ? cardById[enemyActive.cardId] : null;
  const availableCards = useMemo(() => cards, []);
  const currentStage = tournamentStages[stageIndex];

  function enterArena(event: FormEvent) { event.preventDefault(); const cleanName = draftName.trim().slice(0, 18); if (!cleanName) return; localStorage.setItem('fca-username', cleanName); setUsername(cleanName); setScreen('team'); }
  function toggleCard(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 3 ? current : [...current, id]); }

  function beginBattle(enemyIds: string[], mode: BattleMode, index = 0) {
    if (selectedIds.length !== 3) return;
    localStorage.setItem('fca-team', JSON.stringify(selectedIds));
    setPlayerTeam(selectedIds.map((id) => freshFighter(cardById[id])));
    setEnemyTeam(enemyIds.map((id) => freshFighter(cardById[id])));
    setBattleMode(mode); setStageIndex(index); setBonusUsed(false); setWinner(null); setPlayerEffect(null); setEnemyEffect(null);
    setMessage('Battle ready. Choose Attack, Guard, Special or your one-use Bonus.'); setScreen('battle');
  }

  function startExhibition() {
    const enemyPool = cards.filter((card) => !selectedIds.includes(card.id));
    const chosen = [...enemyPool].sort(() => Math.random() - 0.5).slice(0, 3);
    beginBattle((chosen.length === 3 ? chosen : cards.slice(0, 3)).map((card) => card.id), 'exhibition');
  }

  function startTournamentStage(index: number) { const stage = tournamentStages[index]; if (!stage || index > tournamentProgress) return; beginBattle([...stage.team], 'tournament', index); }

  function playTurn(action: BattleAction) {
    if (!playerActive || !enemyActive || winner || (action === 'special' && playerActive.specialUsed) || (action === 'bonus' && bonusUsed)) return;
    const result = resolveTurn(playerTeam, enemyTeam, action, bonusUsed);
    setPlayerTeam(result.players); setEnemyTeam(result.enemies); setPlayerEffect(result.playerEffect); setEnemyEffect(result.enemyEffect); setBonusUsed(result.bonusUsed); setMessage(`${result.playerText} ${result.enemyText}`.trim());
    if (result.winner) {
      const resultWinner = result.winner === 'player' ? username : battleMode === 'tournament' ? currentStage.opponent : 'Arena Rival';
      setWinner(resultWinner);
      if (result.winner === 'player' && battleMode === 'tournament') {
        const nextProgress = Math.min(tournamentStages.length, Math.max(tournamentProgress, stageIndex + 1));
        setTournamentProgress(nextProgress); localStorage.setItem('fca-tournament-progress', String(nextProgress));
      }
      setScreen('result');
    }
  }

  if (screen === 'login') return <main className="login-screen"><section className="login-panel"><p className="eyebrow">Welcome to</p><h1>Fruit Card <span>Arena</span></h1><p>Enter a simple player name. No email or password is required.</p><form onSubmit={enterArena}><input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={18} placeholder="Player name" autoFocus /><button type="submit">Enter Arena</button></form><small>Progress is stored only in this browser.</small></section></main>;

  if (screen === 'team') return <main className="app-shell"><nav><b>FRUIT CARD ARENA</b><span>Player: {username}</span></nav><section className="hero compact-hero"><p className="eyebrow">Build your squad</p><h1>Choose Three</h1><p>Your selected team is used for exhibitions and the tournament route.</p></section><section className="selection-bar"><strong>{selectedIds.length}/3 selected</strong><div className="actions"><button onClick={startExhibition} disabled={selectedIds.length !== 3}>Exhibition</button><button className="bonus" onClick={() => setScreen('tournament')} disabled={selectedIds.length !== 3}>Tournament</button></div></section><section className="card-grid collection-grid">{availableCards.map((card) => <Card key={card.id} card={card} selected={selectedIds.includes(card.id)} compact onClick={() => toggleCard(card.id)} />)}</section></main>;

  if (screen === 'tournament') return <main className="app-shell"><nav><b>FRUIT CARD ARENA</b><button className="nav-button" onClick={() => setScreen('team')}>Back to Team</button></nav><section className="hero compact-hero"><p className="eyebrow">Single-player route</p><h1>Tournament</h1><p>Defeat each rival to unlock the next arena.</p></section><section className="tournament-grid">{tournamentStages.map((stage, index) => { const unlocked = index <= tournamentProgress; const cleared = index < tournamentProgress; return <article key={stage.id} className={`stage-card ${!unlocked ? 'locked' : ''}`}><span className="stage-number">{index + 1}</span><h2>{stage.name}</h2><p>{stage.subtitle}</p><div className="stage-team">{stage.team.map((id) => <span key={id} title={cardById[id].name}>{cardById[id].icon}</span>)}</div><small>Opponent: {stage.opponent} · Reward: {stage.reward}</small><button disabled={!unlocked} onClick={() => startTournamentStage(index)}>{cleared ? 'Replay Stage' : unlocked ? 'Fight' : 'Locked'}</button></article>; })}</section></main>;

  if (screen === 'result') {
    const tournamentWin = winner === username && battleMode === 'tournament';
    const hasNext = stageIndex + 1 < tournamentStages.length;
    return <main className="login-screen result-screen"><section className="login-panel"><p className="eyebrow">Battle complete</p><h1>{winner === username ? 'Victory!' : 'Defeat'}</h1><p>{winner} won the match.</p>{tournamentWin && <p>You earned {currentStage.reward} arena points.</p>}<div className="result-actions">{tournamentWin && hasNext ? <button onClick={() => { setScreen('tournament'); setStageIndex(stageIndex + 1); }}>Continue Route</button> : <button onClick={() => battleMode === 'tournament' ? startTournamentStage(stageIndex) : startExhibition()}>Rematch</button>}<button className="secondary" onClick={() => setScreen(battleMode === 'tournament' ? 'tournament' : 'team')}>Back</button></div></section></main>;
  }

  const rivalName = battleMode === 'tournament' ? currentStage.opponent : 'Arena Rival';
  return <main className="app-shell"><nav><b>FRUIT CARD ARENA</b><span>{battleMode === 'tournament' ? currentStage.name : 'Exhibition'}</span></nav><section className="hero battle-hero"><p className="eyebrow">Three-card battle</p><h1>Battle Arena</h1></section><section className="team-heads"><TeamStrip team={playerTeam} activeIndex={playerActiveIndex} label={`${username}'s team`} /><TeamStrip team={enemyTeam} activeIndex={enemyActiveIndex} label={`${rivalName}'s team`} /></section><section className="arena"><div className={`fighter ${playerEffect?.type ?? ''}`}><h2>{username}</h2>{playerActive && <HealthBar fighter={playerActive} />}{playerCard && <Card card={playerCard} />}{playerEffect?.amount ? <div className={`floating-effect ${playerEffect.type}`}>{playerEffect.type === 'heal' ? '+' : '-'}{playerEffect.amount}</div> : null}{playerEffect?.type === 'miss' && <div className="floating-effect miss">MISS</div>}</div><div className="versus">VS</div><div className={`fighter ${enemyEffect?.type ?? ''}`}><h2>{rivalName}</h2>{enemyActive && <HealthBar fighter={enemyActive} />}{enemyCard && <Card card={enemyCard} />}{enemyEffect?.amount ? <div className={`floating-effect ${enemyEffect.type}`}>{enemyEffect.type === 'heal' ? '+' : '-'}{enemyEffect.amount}</div> : null}{enemyEffect?.type === 'miss' && <div className="floating-effect miss">MISS</div>}</div></section><section className="battle-console"><p className="battle-message">{message}</p><div className="actions"><button onClick={() => playTurn('attack')}>⚔ Attack</button><button onClick={() => playTurn('guard')}>🛡 Guard</button><button onClick={() => playTurn('special')} disabled={Boolean(playerActive?.specialUsed)}>✨ {playerCard?.special.name}</button><button className="bonus" onClick={() => playTurn('bonus')} disabled={bonusUsed}>+20 Bonus</button><button className="secondary" onClick={() => setScreen(battleMode === 'tournament' ? 'tournament' : 'team')}>Leave Battle</button></div></section></main>;
}
