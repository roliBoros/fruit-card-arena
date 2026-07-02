import { FormEvent, useEffect, useMemo, useState } from 'react';
import { cardById, cards } from './data/registry';
import { tournamentStages } from './data/tournament';
import { chooseEnemyAction, estimateEnemyDamage, freshFighter, livingIndex, resolveTurn } from './game/engine';
import type { BattleAction, BattleEffect, Difficulty, EnemyAction } from './game/engine';
import { isMuted, primeAudio, setMuted, sfx } from './game/effects';
import Confetti from './Confetti';
import { ImpactBurst, StrikeGauge, strikeMultiplier } from './BattleFx';
import type { StrikeTier } from './BattleFx';
import type { FighterState, FruitCard } from './types';

type Screen = 'login' | 'team' | 'tournament' | 'battle' | 'result';
type BattleMode = 'exhibition' | 'tournament';
type BattleWinner = 'player' | 'enemy' | null;
type MatchHistoryEntry = {
  id: string;
  result: Exclude<BattleWinner, null>;
  mode: BattleMode;
  opponent: string;
  points: number;
  playedAt: string;
  difficulty?: Difficulty;
  turns?: number;
  playerTeam?: string[];
  enemyTeam?: string[];
};
type PlayerRecord = { wins: number; losses: number; battles: number; arenaPoints: number; history: MatchHistoryEntry[] };

const emptyRecord: PlayerRecord = { wins: 0, losses: 0, battles: 0, arenaPoints: 0, history: [] };
const maxJuice = 3;

function readRecord(): PlayerRecord {
  try {
    const saved = JSON.parse(localStorage.getItem('fca-record') ?? '{}');
    return {
      wins: Number(saved.wins) || 0,
      losses: Number(saved.losses) || 0,
      battles: Number(saved.battles) || 0,
      arenaPoints: Number(saved.arenaPoints) || 0,
      history: Array.isArray(saved.history) ? saved.history.slice(0, 20) : [],
    };
  } catch {
    return emptyRecord;
  }
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function actionLabel(action: EnemyAction) {
  if (action === 'special') return 'Special';
  if (action === 'guard') return 'Guard';
  return 'Attack';
}

function CardAvatar({ card }: { card: FruitCard }) {
  const artUrl = card.art ? `${import.meta.env.BASE_URL}${card.art}` : null;
  return <span className="card-avatar">{artUrl ? <><img src={artUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = false; }} /><span hidden>{card.icon}</span></> : <span>{card.icon}</span>}</span>;
}

function Artwork({ card, alt = '' }: { card: FruitCard; alt?: string }) {
  const artUrl = card.art ? `${import.meta.env.BASE_URL}${card.art}` : null;
  return artUrl ? <><img src={artUrl} alt={alt} onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = false; }} /><span hidden>{card.icon}</span></> : <span>{card.icon}</span>;
}

function Card({ card, selected, compact = false, onClick }: { card: FruitCard; selected?: boolean; compact?: boolean; onClick?: () => void }) {
  const artUrl = card.art ? `${import.meta.env.BASE_URL}${card.art}` : null;
  return (
    <article className={`fruit-card rarity-${card.rarity.toLowerCase()} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`} style={{ '--accent': card.accent } as React.CSSProperties} onClick={onClick} role={onClick ? 'button' : undefined} aria-pressed={onClick ? Boolean(selected) : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); } }}>
      <header><strong>{card.name}</strong><span>{card.rarity}</span></header>
      <div className="character" aria-label={`${card.fruit} character`}>{artUrl ? <><img src={artUrl} alt={`${card.name} card artwork`} onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = false; }} /><span hidden>{card.icon}</span></> : <span>{card.icon}</span>}</div>
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
  return <div className="team-strip" aria-label={label}>{team.map((fighter, index) => { const card = cardById[fighter.cardId]; return <div key={`${fighter.cardId}-${index}`} className={`team-token ${index === activeIndex ? 'active' : ''} ${fighter.hp <= 0 ? 'defeated' : ''}`}><CardAvatar card={card} /><small>{card.name}</small></div>; })}</div>;
}

function HealthBar({ fighter }: { fighter: FighterState }) {
  const card = cardById[fighter.cardId];
  const percent = clamp((fighter.hp / card.battle.maxHp) * 100, 0, 100);
  return <div className="health-block"><div className="health"><i style={{ width: `${percent}%` }} /><span>{fighter.hp} / {card.battle.maxHp} HP</span></div><div className="status-row">{fighter.shield > 0 && <span>🛡 {fighter.shield}</span>}{fighter.guard && <span>Guarding</span>}{fighter.evade && <span>Evade ready</span>}{fighter.weakened > 0 && <span>Weakened -{fighter.weakened}</span>}</div></div>;
}

function JuiceMeter({ juice }: { juice: number }) {
  return <div className="juice-meter" aria-label={`${juice} of ${maxJuice} juice`}><strong>Juice</strong>{Array.from({ length: maxJuice }, (_, index) => <span key={index} className={index < juice ? 'filled' : ''} />)}</div>;
}

function IntentPanel({ intent, enemy, player, difficulty }: { intent: EnemyAction | null; enemy: FighterState | null; player: FighterState | null; difficulty: Difficulty }) {
  if (!intent || !enemy || !player) return <aside className="intent-panel"><strong>Rival Plan</strong><span>Waiting...</span></aside>;
  const card = cardById[enemy.cardId];
  const estimate = estimateEnemyDamage(enemy, player, intent, difficulty);
  const detail = intent === 'guard' ? 'No damage this turn. Good moment to charge.' : intent === 'special' ? `${card.special.name}${estimate ? `, about ${estimate} damage` : ' utility move'}` : `About ${estimate} damage`;
  return <aside className={`intent-panel ${intent}`}><strong>Rival Plan</strong><span>{actionLabel(intent)}</span><small>{detail}</small></aside>;
}

function CardModal({ card, onClose }: { card: FruitCard; onClose: () => void }) {
  return <div className="focus-backdrop" role="dialog" aria-modal="true" aria-label={`${card.name} card details`}><section className="card-modal"><button className="modal-close" onClick={onClose} aria-label="Close card details">×</button><Card card={card} /></section></div>;
}

function BattleFighter({ name, fighter, card, effect, burst, crit = false, onInspect }: { name: string; fighter: FighterState; card: FruitCard; effect: BattleEffect; burst?: { kind: 'hit' | 'crit' | 'heal' | 'special'; seed: number }; crit?: boolean; onInspect: () => void }) {
  const bigHit = (effect?.amount ?? 0) >= 24;
  return <div className={`fighter ${effect?.type ?? ''}`}><div className="fighter-heading"><h2>{name}</h2><span>{card.name} · {card.role}</span></div><HealthBar fighter={fighter} /><button className="battle-portrait" style={{ '--accent': card.accent } as React.CSSProperties} onClick={onInspect} aria-label={`Inspect ${card.name}`}><Artwork card={card} alt={`${card.name} battle artwork`} /><span className="inspect-hint">View card</span></button>{burst && <ImpactBurst key={burst.seed} kind={burst.kind} seed={burst.seed} />}{effect?.amount ? <div className={`floating-effect ${effect.type} ${crit ? 'crit' : ''} ${bigHit ? 'big' : ''}`}>{effect.type === 'heal' ? '+' : '-'}{effect.amount}{crit ? <small>CRIT!</small> : null}</div> : null}{effect?.type === 'miss' && <div className="floating-effect miss">MISS</div>}</div>;
}

function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button className="nav-button sound-toggle" onClick={onToggle} aria-pressed={!muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Sound off' : 'Sound on'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

function Tutorial({ onClose }: { onClose: () => void }) {
  return <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><section className="tutorial-panel"><p className="eyebrow">Quick start</p><h2 id="tutorial-title">How to play</h2><div className="tutorial-steps"><article><b>1</b><h3>Read the rival plan</h3><p>The battle screen shows what the rival will do next, so Guard and Bonus have timing.</p></article><article><b>2</b><h3>Build juice</h3><p>Attack gains 1 juice. Guard gains 2 juice and halves the next hit.</p></article><article><b>3</b><h3>Time your strike</h3><p>Attacks open a power gauge. Tap when the marker hits the gold centre for a CRITICAL, and chain hits for combo damage.</p></article><article><b>4</b><h3>Use arena rules</h3><p>Tournament stages have twists like cheaper specials, free shield or faster juice.</p></article></div><button onClick={onClose}>Ready to battle</button></section></div>;
}

function HistoryTeam({ ids = [] }: { ids?: string[] }) {
  return <span className="history-team">{ids.filter((id) => cardById[id]).map((id) => <span key={id} title={cardById[id].name}><CardAvatar card={cardById[id]} /></span>)}</span>;
}

function PlayerProfile({ username, record, onSaveName, onReplayTutorial, onReset, onClose }: { username: string; record: PlayerRecord; onSaveName: (name: string) => void; onReplayTutorial: () => void; onReset: () => void; onClose: () => void }) {
  const [name, setName] = useState(username);
  const [confirmReset, setConfirmReset] = useState(false);
  function saveName(event: FormEvent) { event.preventDefault(); const cleanName = name.trim().slice(0, 18); if (cleanName) { onSaveName(cleanName); setName(cleanName); } }
  return <div className="focus-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-title"><section className="history-modal profile-modal"><button className="modal-close" onClick={onClose} aria-label="Close player profile">×</button><p className="eyebrow">Local player</p><h2 id="profile-title">Player Profile</h2><form className="profile-form" onSubmit={saveName}><label htmlFor="profile-name">Player name</label><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={18} /><button type="submit">Save Name</button></form><div className="profile-stats" aria-label="Profile record"><span><b>{record.wins}</b> wins</span><span><b>{record.losses}</b> losses</span><span><b>{record.arenaPoints}</b> points</span></div><div className="profile-tools"><button onClick={onReplayTutorial}>Replay Tutorial</button>{confirmReset ? <><button className="danger" onClick={onReset}>Confirm Reset</button><button className="secondary" onClick={() => setConfirmReset(false)}>Cancel</button></> : <button className="secondary" onClick={() => setConfirmReset(true)}>Reset Progress</button>}</div><h3>Match History</h3>{record.history.length === 0 ? <p className="history-empty">Complete a battle and its result will appear here.</p> : <ol>{record.history.map((entry) => <li key={entry.id}><span className={`history-result ${entry.result}`}>{entry.result === 'player' ? 'Win' : 'Loss'}</span><div className="history-details"><strong>{entry.opponent}</strong><small>{[entry.mode === 'tournament' ? 'Tournament' : 'Exhibition', entry.difficulty && `${entry.difficulty} rival`, entry.turns && `${entry.turns} turns`, new Date(entry.playedAt).toLocaleDateString()].filter(Boolean).join(' · ')}</small>{entry.playerTeam?.length && entry.enemyTeam?.length ? <span className="history-teams"><HistoryTeam ids={entry.playerTeam} /><i>VS</i><HistoryTeam ids={entry.enemyTeam} /></span> : null}</div>{entry.points > 0 && <b>+{entry.points}</b>}</li>)}</ol>}</section></div>;
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
  const [battleWinner, setBattleWinner] = useState<BattleWinner>(null);
  const [battleMode, setBattleMode] = useState<BattleMode>('exhibition');
  const savedDifficulty = localStorage.getItem('fca-difficulty');
  const [difficulty, setDifficulty] = useState<Difficulty>(savedDifficulty === 'easy' || savedDifficulty === 'hard' ? savedDifficulty : 'normal');
  const [record, setRecord] = useState<PlayerRecord>(readRecord);
  const [rewardEarned, setRewardEarned] = useState(0);
  const [showTutorial, setShowTutorial] = useState(localStorage.getItem('fca-tutorial-seen') !== 'yes');
  const [stageIndex, setStageIndex] = useState(Math.min(storedProgress, tournamentStages.length - 1));
  const [tournamentProgress, setTournamentProgress] = useState(storedProgress);
  const [muted, setMutedState] = useState(isMuted());
  const [rosterIndex, setRosterIndex] = useState(0);
  const [routeFocus, setRouteFocus] = useState(Math.min(storedProgress, tournamentStages.length - 1));
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [juice, setJuice] = useState(1);
  const [enemyIntent, setEnemyIntent] = useState<EnemyAction | null>(null);
  const [pendingStrike, setPendingStrike] = useState<BattleAction | null>(null);
  const [combo, setCombo] = useState(0);
  const [arenaShake, setArenaShake] = useState<'' | 'shake-small' | 'shake-big'>('');
  const [critFlash, setCritFlash] = useState(false);
  const [lastCrit, setLastCrit] = useState(false);
  const [bursts, setBursts] = useState<{ player?: { kind: 'hit' | 'crit' | 'heal' | 'special'; seed: number }; enemy?: { kind: 'hit' | 'crit' | 'heal' | 'special'; seed: number } }>({});

  useEffect(() => {
    let startX: number | null = null;
    let target: 'roster' | 'route' | null = null;
    const begin = (event: TouchEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      target = element?.closest('.card-gallery') ? 'roster' : element?.closest('.tournament-grid') ? 'route' : null;
      startX = target ? event.touches[0].clientX : null;
    };
    const finish = (event: TouchEvent) => {
      if (startX === null || !target) return;
      const distance = event.changedTouches[0].clientX - startX;
      const direction = distance < 0 ? 1 : -1;
      if (Math.abs(distance) >= 45) target === 'roster' ? moveRoster(direction) : moveRoute(direction);
      startX = null;
      target = null;
    };
    document.addEventListener('touchstart', begin, { passive: true });
    document.addEventListener('touchend', finish, { passive: true });
    return () => {
      document.removeEventListener('touchstart', begin);
      document.removeEventListener('touchend', finish);
    };
  }, [screen]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) { primeAudio(); sfx('click'); }
  }

  const playerActiveIndex = livingIndex(playerTeam);
  const enemyActiveIndex = livingIndex(enemyTeam);
  const playerActive = playerActiveIndex >= 0 ? playerTeam[playerActiveIndex] : null;
  const enemyActive = enemyActiveIndex >= 0 ? enemyTeam[enemyActiveIndex] : null;
  const playerCard = playerActive ? cardById[playerActive.cardId] : null;
  const enemyCard = enemyActive ? cardById[enemyActive.cardId] : null;
  const availableCards = useMemo(() => cards, []);
  const currentStage = tournamentStages[stageIndex];
  const activeTwist = battleMode === 'tournament' ? currentStage.twist : null;
  const inspectedCard = inspectedCardId ? cardById[inspectedCardId] : null;
  const rosterSlots = [-1, 0, 1].map((offset) => availableCards[rosterIndex + offset] ?? null);

  function enterArena(event: FormEvent) { event.preventDefault(); const cleanName = draftName.trim().slice(0, 18); if (!cleanName) return; primeAudio(); sfx('click'); localStorage.setItem('fca-username', cleanName); setUsername(cleanName); setShowTutorial(true); setScreen('team'); }
  function toggleCard(id: string) { sfx('click'); setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 3 ? current : [...current, id]); }
  function dismissTutorial() { localStorage.setItem('fca-tutorial-seen', 'yes'); setShowTutorial(false); }
  function savePlayerName(name: string) { localStorage.setItem('fca-username', name); setUsername(name); setDraftName(name); }
  function replayTutorial() { setShowHistory(false); setShowTutorial(true); }
  function resetProgress() {
    ['fca-record', 'fca-team', 'fca-tournament-progress'].forEach((key) => localStorage.removeItem(key));
    setRecord({ ...emptyRecord, history: [] }); setSelectedIds([]); setTournamentProgress(0); setStageIndex(0); setRouteFocus(0); setShowHistory(false);
  }
  function changeDifficulty(value: Difficulty) { localStorage.setItem('fca-difficulty', value); setDifficulty(value); }
  function moveRoster(direction: -1 | 1) { sfx('click'); setRosterIndex((current) => clamp(current + direction, 0, availableCards.length - 1)); }
  function moveRoute(direction: -1 | 1) { sfx('click'); setRouteFocus((current) => clamp(current + direction, 0, tournamentStages.length - 1)); }

  function specialCost() { return activeTwist?.rule === 'storm-specials' ? 1 : 2; }
  function bonusCost() { return activeTwist?.rule === 'cheap-bonus' ? 2 : 3; }
  function juiceAfterAction(action: BattleAction) {
    if (action === 'guard' && activeTwist?.rule === 'guard-refill') return maxJuice;
    const delta = action === 'attack' ? 1 : action === 'guard' ? 2 : action === 'special' ? -specialCost() : -bonusCost();
    return clamp(juice + delta, 0, maxJuice);
  }
  function canPlayAction(action: BattleAction) {
    if (battleWinner) return false;
    if (action === 'special') return Boolean(playerActive && !playerActive.specialUsed && juice >= specialCost());
    if (action === 'bonus') return !bonusUsed && juice >= bonusCost();
    return true;
  }

  function saveResult(result: Exclude<BattleWinner, null>, points: number, turns: number) {
    setRecord((current) => {
      const entry: MatchHistoryEntry = {
        id: `${Date.now()}-${current.battles + 1}`,
        result,
        mode: battleMode,
        opponent: battleMode === 'tournament' ? currentStage.opponent : 'Arena Rival',
        points,
        playedAt: new Date().toISOString(),
        difficulty,
        turns,
        playerTeam: playerTeam.map((fighter) => fighter.cardId),
        enemyTeam: enemyTeam.map((fighter) => fighter.cardId),
      };
      const next = {
        wins: current.wins + (result === 'player' ? 1 : 0),
        losses: current.losses + (result === 'enemy' ? 1 : 0),
        battles: current.battles + 1,
        arenaPoints: current.arenaPoints + points,
        history: [entry, ...current.history].slice(0, 20),
      };
      localStorage.setItem('fca-record', JSON.stringify(next));
      return next;
    });
  }

  function beginBattle(enemyIds: string[], mode: BattleMode, index = 0) {
    if (selectedIds.length !== 3) return;
    const stageTwist = mode === 'tournament' ? tournamentStages[index].twist : null;
    const nextPlayers = selectedIds.map((id) => freshFighter(cardById[id]));
    const nextEnemies = enemyIds.map((id) => freshFighter(cardById[id]));
    if (stageTwist?.rule === 'royal-shield') nextEnemies.forEach((fighter) => { fighter.shield += 12; });
    localStorage.setItem('fca-team', JSON.stringify(selectedIds));
    setPlayerTeam(nextPlayers);
    setEnemyTeam(nextEnemies);
    setBattleMode(mode); setStageIndex(index); setBonusUsed(false); setBattleWinner(null); setRewardEarned(0); setTurnCount(0); setPlayerEffect(null); setEnemyEffect(null);
    setCombo(0); setPendingStrike(null); setBursts({}); setArenaShake(''); setCritFlash(false); setLastCrit(false);
    setJuice(stageTwist?.rule === 'starter-juice' ? 2 : 1);
    setEnemyIntent(chooseEnemyAction(nextEnemies[0], difficulty));
    setMessage('Battle ready. Read the rival plan, build juice, then spend it at the right time.'); setScreen('battle');
  }

  function startExhibition() {
    const enemyPool = cards.filter((card) => !selectedIds.includes(card.id));
    const chosen = [...enemyPool].sort(() => Math.random() - 0.5).slice(0, 3);
    beginBattle((chosen.length === 3 ? chosen : cards.slice(0, 3)).map((card) => card.id), 'exhibition');
  }

  function startTournamentStage(index: number) { const stage = tournamentStages[index]; if (!stage || index > tournamentProgress) return; beginBattle([...stage.team], 'tournament', index); }

  function requestAction(action: BattleAction) {
    if (!playerActive || !enemyActive || !canPlayAction(action) || pendingStrike) return;
    primeAudio();
    // Offensive moves become a timing skill moment; guard resolves instantly.
    if (action === 'attack' || action === 'bonus' || action === 'special') {
      sfx('click');
      setPendingStrike(action);
      return;
    }
    playTurn(action);
  }

  function resolveStrike(tier: StrikeTier) {
    const action = pendingStrike;
    setPendingStrike(null);
    if (action) playTurn(action, tier);
  }

  function playTurn(action: BattleAction, tier?: StrikeTier) {
    if (!playerActive || !enemyActive || !canPlayAction(action)) return;
    primeAudio();
    const completedTurns = turnCount + 1;
    setTurnCount(completedTurns);
    const comboPower = 1 + Math.min(combo, 5) * 0.08;
    const power = (tier ? strikeMultiplier[tier] : 1) * comboPower;
    const crit = tier === 'perfect';
    const enemyHpBefore = enemyTeam.reduce((total, fighter) => total + fighter.hp, 0);
    const result = resolveTurn(playerTeam, enemyTeam, action, bonusUsed, difficulty, enemyIntent ?? undefined, power);
    const enemyHpLoss = enemyHpBefore - result.enemies.reduce((total, fighter) => total + fighter.hp, 0);
    setPlayerTeam(result.players); setEnemyTeam(result.enemies); setPlayerEffect(result.playerEffect); setEnemyEffect(result.enemyEffect); setBonusUsed(result.bonusUsed);
    setMessage(`${crit && enemyHpLoss > 0 ? 'CRITICAL! ' : ''}${result.playerText} ${result.enemyText}`.trim());
    setJuice(juiceAfterAction(action));
    setLastCrit(crit && enemyHpLoss > 0);
    const nextEnemyIndex = livingIndex(result.enemies);
    setEnemyIntent(result.winner || nextEnemyIndex < 0 ? null : chooseEnemyAction(result.enemies[nextEnemyIndex], difficulty));

    // Combo streak: offensive moves that land damage build it, whiffs break it.
    const offensive = action !== 'guard';
    const nextCombo = offensive ? (enemyHpLoss > 0 ? combo + 1 : 0) : combo;
    setCombo(nextCombo);
    if (nextCombo >= 2 && nextCombo > combo) window.setTimeout(() => sfx('combo'), 260);

    // Impact FX: particle bursts, screen shake, crit flash.
    const seed = Date.now() % 100000;
    const nextBursts: typeof bursts = {};
    if (enemyHpLoss > 0) nextBursts.enemy = { kind: crit ? 'crit' : action === 'special' ? 'special' : 'hit', seed };
    if (result.playerEffect?.type === 'hit') nextBursts.player = { kind: 'hit', seed: seed + 1 };
    if (result.playerEffect?.type === 'heal') nextBursts.player = { kind: 'heal', seed: seed + 2 };
    setBursts(nextBursts);
    window.setTimeout(() => setBursts({}), 760);
    const shake = crit && enemyHpLoss > 0 ? 'shake-big' : enemyHpLoss > 0 || result.playerEffect?.type === 'hit' ? 'shake-small' : '';
    if (shake) {
      setArenaShake('');
      window.requestAnimationFrame(() => setArenaShake(shake));
      window.setTimeout(() => setArenaShake(''), 500);
    }
    if (crit && enemyHpLoss > 0) {
      setCritFlash(true);
      window.setTimeout(() => setCritFlash(false), 320);
    }

    // Sound for the player's chosen move, then a staggered impact for the outcome.
    sfx(action === 'guard' ? 'guard' : action === 'special' ? 'special' : 'attack');
    if (enemyHpLoss > 0 && crit) window.setTimeout(() => sfx('crit'), 140);
    else if (result.enemyEffect?.type === 'hit' || enemyHpLoss > 0) window.setTimeout(() => sfx('hit'), 150);
    else if (result.enemyEffect?.type === 'miss') window.setTimeout(() => sfx('miss'), 150);
    else if (result.playerEffect?.type === 'heal') window.setTimeout(() => sfx('heal'), 150);
    if (result.playerEffect?.type === 'hit') window.setTimeout(() => sfx('hit'), 320);
    if (result.winner) {
      setBattleWinner(result.winner);
      let points = 0;
      if (result.winner === 'player' && battleMode === 'tournament') {
        const firstClear = stageIndex >= tournamentProgress;
        points = firstClear ? currentStage.reward : 0;
        setRewardEarned(points);
        const nextProgress = Math.min(tournamentStages.length, Math.max(tournamentProgress, stageIndex + 1));
        setTournamentProgress(nextProgress); localStorage.setItem('fca-tournament-progress', String(nextProgress));
      }
      saveResult(result.winner, points, completedTurns);
      window.setTimeout(() => sfx(result.winner === 'player' ? 'victory' : 'defeat'), 420);
      setScreen('result');
    }
  }

  if (screen === 'login') return <main key="login" className="login-screen screen-anim"><section className="login-panel"><p className="eyebrow">Welcome to</p><h1>Fruit Card <span>Arena</span></h1><p>Enter a simple player name. No email or password is required.</p><form onSubmit={enterArena}><input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={18} placeholder="Player name" autoFocus /><button type="submit">Enter Arena</button></form><small>Progress is stored only in this browser.</small></section></main>;

  if (screen === 'team') return <><main key="team" className="app-shell team-screen screen-anim"><nav><b>FRUIT CARD ARENA</b><div className="nav-actions"><SoundToggle muted={muted} onToggle={toggleMute} /><button className="nav-button" onClick={() => setShowTutorial(true)}>How to Play</button><button className="nav-button profile-nav-button" onClick={() => setShowHistory(true)} aria-label={`Player profile for ${username}`}><span className="profile-wide">Player: {username}</span><span className="profile-compact">Player</span></button></div></nav><section className="hero compact-hero"><p className="eyebrow">Build your squad</p><h1>Choose Three</h1></section><section className="player-dashboard" aria-label="Player record"><span><b>{record.wins}</b> Wins</span><span><b>{record.losses}</b> Losses</span><span><b>{record.battles}</b> Battles</span><span><b>{record.arenaPoints}</b> Points</span></section><section className="team-toolbar"><div className="difficulty-picker"><strong>Rival</strong>{(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => <button key={level} className={difficulty === level ? 'active' : ''} onClick={() => changeDifficulty(level)}>{level}</button>)}</div><div className="selection-bar"><strong>{selectedIds.length}/3 selected</strong><div className="actions"><button onClick={startExhibition} disabled={selectedIds.length !== 3}>Exhibition</button><button className="bonus" onClick={() => { setRouteFocus(Math.min(tournamentProgress, tournamentStages.length - 1)); setScreen('tournament'); }} disabled={selectedIds.length !== 3}>Tournament</button></div></div></section><section className="roster-browser" aria-label="Character selection"><button className="gallery-arrow previous" onClick={() => moveRoster(-1)} disabled={rosterIndex === 0} aria-label="Previous character">‹</button><div className="card-gallery">{rosterSlots.map((card, slot) => <div className={`carousel-item ${slot === 1 ? 'focused' : 'side'}`} key={card?.id ?? `empty-${slot}`}>{card ? <Card card={card} selected={selectedIds.includes(card.id)} onClick={() => toggleCard(card.id)} /> : null}</div>)}</div><button className="gallery-arrow next" onClick={() => moveRoster(1)} disabled={rosterIndex === availableCards.length - 1} aria-label="Next character">›</button><div className="gallery-counter"><strong>{availableCards[rosterIndex].name}</strong><span>{rosterIndex + 1} / {availableCards.length}</span></div></section></main>{showTutorial && <Tutorial onClose={dismissTutorial} />}{showHistory && <PlayerProfile username={username} record={record} onSaveName={savePlayerName} onReplayTutorial={replayTutorial} onReset={resetProgress} onClose={() => setShowHistory(false)} />}</>;

  if (screen === 'tournament') return <main key="tournament" className="app-shell tournament-screen viewport-screen screen-anim"><nav><b>FRUIT CARD ARENA</b><div className="nav-actions"><SoundToggle muted={muted} onToggle={toggleMute} /><button className="nav-button" onClick={() => setScreen('team')}>Back to Team</button></div></nav><section className="hero compact-hero"><p className="eyebrow">Single-player route</p><h1>Tournament</h1><p>Defeat each rival to unlock the next arena.</p></section><section className="route-browser"><button className="gallery-arrow previous route-arrow" onClick={() => moveRoute(-1)} disabled={routeFocus === 0} aria-label="Previous stage">‹</button><div className="tournament-grid">{tournamentStages.map((stage, index) => { const unlocked = index <= tournamentProgress; const cleared = index < tournamentProgress; return <article key={stage.id} className={`stage-card ${!unlocked ? 'locked' : ''} ${index === routeFocus ? 'focused' : ''}`}><span className="stage-number">{index + 1}</span><h2>{stage.name}</h2><p>{stage.subtitle}</p><div className="arena-rule"><b>{stage.twist.name}</b><span>{stage.twist.text}</span></div><div className="stage-team">{stage.team.map((id) => <span key={id} title={cardById[id].name}><CardAvatar card={cardById[id]} /></span>)}</div><small>Opponent: {stage.opponent} · Reward: {stage.reward}</small><button disabled={!unlocked} onClick={() => startTournamentStage(index)}>{cleared ? 'Replay Stage' : unlocked ? 'Fight' : 'Locked'}</button></article>; })}</div><button className="gallery-arrow next route-arrow" onClick={() => moveRoute(1)} disabled={routeFocus === tournamentStages.length - 1} aria-label="Next stage">›</button><div className="gallery-counter route-counter"><strong>{tournamentStages[routeFocus].name}</strong><span>{routeFocus + 1} / {tournamentStages.length}</span></div></section></main>;

  if (screen === 'result') {
    const tournamentWin = battleWinner === 'player' && battleMode === 'tournament';
    const hasNext = stageIndex + 1 < tournamentStages.length;
    const winnerName = battleWinner === 'player' ? username : battleMode === 'tournament' ? currentStage.opponent : 'Arena Rival';
    return <main key="result" className="login-screen result-screen screen-anim">{battleWinner === 'player' && <Confetti />}<section className="login-panel"><p className="eyebrow">Battle complete</p><h1>{battleWinner === 'player' ? 'Victory!' : 'Defeat'}</h1><p>{winnerName} won the match.</p><p className="result-summary">{turnCount} turns · {difficulty} difficulty</p>{tournamentWin && rewardEarned > 0 && <p>You earned {rewardEarned} arena points.</p>}{tournamentWin && rewardEarned === 0 && <p>Stage cleared again. First-clear points were already claimed.</p>}<div className="result-actions">{tournamentWin && hasNext ? <button onClick={() => { setRouteFocus(stageIndex + 1); setScreen('tournament'); setStageIndex(stageIndex + 1); }}>Continue Route</button> : <button onClick={() => battleMode === 'tournament' ? startTournamentStage(stageIndex) : startExhibition()}>Rematch</button>}<button className="secondary" onClick={() => setScreen(battleMode === 'tournament' ? 'tournament' : 'team')}>Back</button></div></section></main>;
  }

  const rivalName = battleMode === 'tournament' ? currentStage.opponent : 'Arena Rival';
  return <><main key="battle" className="app-shell battle-screen viewport-screen screen-anim"><nav><b>FRUIT CARD ARENA</b><div className="nav-actions"><SoundToggle muted={muted} onToggle={toggleMute} /><span>{battleMode === 'tournament' ? currentStage.name : 'Exhibition'} · {difficulty}</span></div></nav><section className="battle-title"><p className="eyebrow">Three-card battle</p><h1>Battle Arena</h1></section><section className="battle-control-strip"><JuiceMeter juice={juice} /><IntentPanel intent={enemyIntent} enemy={enemyActive} player={playerActive} difficulty={difficulty} />{activeTwist ? <aside className="twist-chip"><strong>{activeTwist.name}</strong><span>{activeTwist.text}</span></aside> : <aside className="twist-chip"><strong>Training Field</strong><span>Attack gains 1 juice. Guard gains 2.</span></aside>}</section><section className="team-heads"><TeamStrip team={playerTeam} activeIndex={playerActiveIndex} label={`${username}'s team`} /><TeamStrip team={enemyTeam} activeIndex={enemyActiveIndex} label={`${rivalName}'s team`} /></section><section className={`arena ${arenaShake}`}>{critFlash && <div className="crit-flash" aria-hidden="true" />}{combo >= 2 && <div key={combo} className="combo-badge" aria-label={`Combo ${combo}`}>COMBO ×{combo}</div>}{playerActive && playerCard && <BattleFighter name={username} fighter={playerActive} card={playerCard} effect={playerEffect} burst={bursts.player} onInspect={() => setInspectedCardId(playerCard.id)} />}<div className="versus">VS</div>{enemyActive && enemyCard && <BattleFighter name={rivalName} fighter={enemyActive} card={enemyCard} effect={enemyEffect} burst={bursts.enemy} crit={lastCrit} onInspect={() => setInspectedCardId(enemyCard.id)} />}</section><section className="battle-console"><p className="battle-message" aria-live="polite">{message}</p><div className="actions"><button onClick={() => requestAction('attack')} disabled={!canPlayAction('attack')}>⚔ Attack <small>+1</small></button><button onClick={() => requestAction('guard')} disabled={!canPlayAction('guard')}>🛡 Guard <small>{activeTwist?.rule === 'guard-refill' ? 'fill' : '+2'}</small></button><button onClick={() => requestAction('special')} disabled={!canPlayAction('special')}>✨ {playerCard?.special.name} <small>-{specialCost()}</small></button><button className="bonus" onClick={() => requestAction('bonus')} disabled={!canPlayAction('bonus')}>+20 Bonus <small>-{bonusCost()}</small></button><button className="secondary" onClick={() => setScreen(battleMode === 'tournament' ? 'tournament' : 'team')}>Leave</button></div></section></main>{pendingStrike && <StrikeGauge label={pendingStrike === 'attack' ? 'Attack' : pendingStrike === 'bonus' ? '+20 Bonus' : playerCard?.special.name ?? 'Special'} onResolve={resolveStrike} />}{inspectedCard && <CardModal card={inspectedCard} onClose={() => setInspectedCardId(null)} />}</>;
}
