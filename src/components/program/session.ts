import { FOCUS_SESSIONS, PROGRAM_DAYS, PROGRAMS, programById, sessionByKey, type Session, type SessionItem } from '@/data/program';
import { pad } from '@/lib/calc';

/** In-memory (per app session) plan edits, keyed by session key — the player reads the edited list. */
export const editedPlans = new Map<string, SessionItem[]>();
/** Index of the exercise to continue from after the user quit a session midway. */
export const resumePoints = new Map<string, number>();
/** One-shot UI flags (e.g. the "customize your plan" tooltip). */
export const programFlags = { tipShown: false };

export const planItems = (s: Session) => editedPlans.get(s.key) ?? s.items;

/** Like sessionByKey, but rejects malformed program keys (unknown plan / out-of-range day). */
export function findSession(key: string): Session | undefined {
  if (!key) return undefined;
  if (key.startsWith('program:')) {
    const [, pid, d] = key.split(':');
    const day = Number(d);
    if (!PROGRAMS.some((p) => p.id === pid) || !Number.isInteger(day) || day < 1 || day > PROGRAM_DAYS) return undefined;
  }
  return sessionByKey(key);
}

const LEVEL_BOLTS: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function sessionMeta(s: Session) {
  if (s.key.startsWith('program:')) {
    const [, pid, d] = s.key.split(':');
    const program = programById(pid);
    return { program, day: Number(d), level: program.level as string, bolts: program.bolts, eyebrow: program.title };
  }
  const f = FOCUS_SESSIONS.find((x) => x.key === s.key);
  const level = f?.level ?? 'Beginner';
  return { program: undefined, day: undefined, level, bolts: LEVEL_BOLTS[level] ?? 1, eyebrow: f ? `${f.part} workout` : 'Workout' };
}

export function logTitle(s: Session) {
  const m = sessionMeta(s);
  return m.program ? `${m.program.title} · Day ${m.day}` : s.title;
}

export const fmtClock = (sec: number) => {
  const t = Math.max(0, Math.round(sec));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

export const itemLabel = (it: SessionItem) => (it.seconds ? fmtClock(it.seconds) : `x ${it.reps ?? 10}`);

const FOCUS_COLORS: Record<string, string> = {
  'Rectus abdominis': '#3B82F6',
  Obliques: '#F59E0B',
  'Full body': '#0EA472',
  Cardio: '#E5484D',
  Quadriceps: '#8B5CF6',
  Glutes: '#EC4899',
  Chest: '#F97316',
  Arm: '#14B8A6',
  Leg: '#6366F1',
  Back: '#0EA5E9',
};
export const focusColor = (name: string) => FOCUS_COLORS[name] ?? '#64748B';
