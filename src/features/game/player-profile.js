const STORAGE_KEY = 'cosmic-explorer:cosmic-defender:v1';
const DEFAULT_NAME = 'Pilot';
const MAX_NAME_LENGTH = 16;

const LEVEL_IDS = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
const DIFFICULTY_IDS = ['normal','hard'];

function blankDifficulty(unlocked = false) {
  return {
    unlocked,
    completed: false,
    bestScore: 0,
    playerName: '',
    enemiesDestroyed: 0,
    livesRemaining: 0,
    bestAccuracy: 0,
    bestTime: 0,
    maxCombo: 0,
    attempts: 0,
    rank: '—',
    completions: 0,
    highestWave: 0
  };
}

function blankLevel(index) {
  return {
    status: index === 0 ? 'available' : 'locked',
    normal: blankDifficulty(true),
    hard: blankDifficulty(false)
  };
}

export function sanitizePlayerName(value, fallback = DEFAULT_NAME) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  return cleaned || fallback;
}

export function createDefaultProfile() {
  return {
    version: 2,
    playerName: DEFAULT_NAME,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    levels: Object.fromEntries(LEVEL_IDS.map((id, index) => [id, blankLevel(index)]))
  };
}

function migrateLegacyLevel(saved, index) {
  const level = blankLevel(index);
  if (!saved || typeof saved !== 'object') return level;
  level.status = saved.status || level.status;
  if (saved.normal || saved.hard) {
    level.normal = { ...blankDifficulty(true), ...saved.normal, unlocked:true };
    level.hard = { ...blankDifficulty(false), ...saved.hard };
    return level;
  }

  const legacyCompleted = saved.status === 'completed';
  level.normal = {
    ...blankDifficulty(true),
    completed: legacyCompleted,
    bestScore: Number(saved.bestScore || 0),
    playerName: saved.playerName || '',
    enemiesDestroyed: Number(saved.enemiesDestroyed || 0),
    livesRemaining: Number(saved.livesRemaining || 0),
    bestAccuracy: Number(saved.bestAccuracy || 0),
    bestTime: Number(saved.bestTime || 0),
    maxCombo: Number(saved.maxCombo || 0),
    attempts: Number(saved.attempts || 0),
    rank: saved.rank || '—',
    completions: legacyCompleted ? 1 : 0,
    highestWave: legacyCompleted ? 99 : 0
  };
  level.hard.unlocked = legacyCompleted;
  return level;
}

function normalizeProfile(raw) {
  const base = createDefaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  base.playerName = sanitizePlayerName(raw.playerName);
  base.createdAt = raw.createdAt || base.createdAt;
  for (const [index,id] of LEVEL_IDS.entries()) {
    base.levels[id] = migrateLegacyLevel(raw.levels?.[id], index);
  }
  base.levels.mercury.status = base.levels.mercury.normal.completed ? 'completed' : 'available';
  return base;
}

export function loadPlayerProfile() {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return createDefaultProfile();
  }
}

export function savePlayerProfile(profile) {
  const normalized = normalizeProfile(profile);
  normalized.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function updatePlayerName(profile, name) {
  return savePlayerProfile({ ...profile, playerName: sanitizePlayerName(name) });
}

export function isDifficultyUnlocked(profile, levelId, difficulty) {
  const level = profile.levels[levelId];
  if (!level || level.status === 'locked') return false;
  return difficulty === 'normal' ? true : Boolean(level.hard.unlocked);
}

export function recordAttempt(profile, levelId, difficulty = 'normal') {
  const next = structuredClone(profile);
  const mode = DIFFICULTY_IDS.includes(difficulty) ? difficulty : 'normal';
  next.levels[levelId][mode].attempts += 1;
  return savePlayerProfile(next);
}

export function recordGameResult(profile, result, won = false) {
  const next = structuredClone(profile);
  const difficulty = DIFFICULTY_IDS.includes(result.difficulty) ? result.difficulty : 'normal';
  const level = next.levels[result.levelId];
  const current = level[difficulty];
  const previousBest = current.bestScore;
  const isBest = result.score > previousBest;

  current.highestWave = Math.max(current.highestWave, Number(result.highestWave || 0));
  current.maxCombo = Math.max(current.maxCombo, Number(result.maxCombo || 0));
  if (won) {
    current.completed = true;
    current.completions += 1;
    level.status = 'completed';
    if (difficulty === 'normal') level.hard.unlocked = true;
    const index = LEVEL_IDS.indexOf(result.levelId);
    const nextId = LEVEL_IDS[index + 1];
    if (nextId && next.levels[nextId].status === 'locked') next.levels[nextId].status = 'available';
  }

  if (isBest) {
    Object.assign(current, {
      bestScore: result.score,
      playerName: next.playerName,
      enemiesDestroyed: result.enemiesDestroyed,
      livesRemaining: result.livesRemaining,
      bestAccuracy: result.accuracy,
      bestTime: result.time,
      rank: result.rank
    });
  }

  return { profile:savePlayerProfile(next), isBest, previousBest, hardUnlocked:won && difficulty === 'normal' };
}

export function recordLevelResult(profile, result) {
  return recordGameResult(profile, result, true);
}

export function resetProgress(profile, removeName = false) {
  const fresh = createDefaultProfile();
  fresh.playerName = removeName ? DEFAULT_NAME : sanitizePlayerName(profile.playerName);
  return savePlayerProfile(fresh);
}

export const playerProfileConstants = { STORAGE_KEY, DEFAULT_NAME, MAX_NAME_LENGTH, LEVEL_IDS, DIFFICULTY_IDS };
