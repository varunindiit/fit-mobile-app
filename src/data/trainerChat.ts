/**
 * The Pro trainer conversation.
 *
 * Replies are scripted and matched on keywords — there is no model and no network
 * call, and the trainer is not a real person reading these messages. The engine is
 * deliberately shaped like one turn of a backend conversation API (`trainerReply`
 * returns the bubbles to append, with the delay each should land after), so wiring
 * it to a real messaging service later means replacing this one function.
 */
import type { TrainerMsg } from '@/lib/store';
import { proSession } from './proDemos';
import { TRAINER_PLANS, planSummary, trainerPlanByKey } from './trainerPlans';
import { firstName, trainerById } from './trainers';

/** A bubble the trainer is about to "send". */
export type ReplyBubble = { text: string; planKey?: string; /** ms of "typing…" before this bubble lands. */ delay: number };

/** Prompts offered above the composer. */
export const QUICK_ASKS = [
  'Can you make me a chest workout for today?',
  'My lower back hurts after crunches',
  'I only have 15 minutes today',
  'How is my form on push-ups?',
  'What should I train tomorrow?',
];

const has = (q: string, ...keys: string[]) => keys.some((k) => q.includes(k));

const planLine = (key: string) => {
  const p = trainerPlanByKey(key);
  if (!p) return '';
  // Coach chat is Pro-only, so the count must match the filtered list the plan card shows.
  const s = planSummary(proSession(p, true));
  return `${p.title} — ${s.exercises} moves · about ${s.minutes} min · ~${s.kcal} kcal`;
};

/**
 * What the trainer replies to `raw`. Always returns at least one bubble.
 * `name` is the member's first name, used the way a coach would use it.
 */
export function trainerReply(raw: string, trainerId: string, name: string): ReplyBubble[] {
  const q = raw.toLowerCase().trim();
  const coach = trainerById(trainerId);
  const me = firstName(coach);

  if (/^(hi|hey|hello|yo|namaste|hii+)\b/.test(q) && q.length < 20)
    return [{ text: `Hey ${name}! ${me} here. What are we training today?`, delay: 900 }];

  if (has(q, 'thank', 'thanks', 'shukriya'))
    return [{ text: `Anytime. Message me after the session and tell me how it felt.`, delay: 800 }];

  if (has(q, 'chest', 'push up', 'push-up', 'pushup', 'upper body', 'arms', 'tricep'))
    return [
      { text: `Sure. Bodyweight chest and triceps — no equipment needed.`, delay: 1000 },
      { text: `Here's the session. ${planLine('trainer:chest-triceps')}`, planKey: 'trainer:chest-triceps', delay: 1400 },
      { text: `Elbows at 45°, not flared. Tap Start workout when you're ready and I'll see it in your log.`, delay: 1100 },
    ];

  if (has(q, 'abs', 'core', 'belly', 'stomach', 'six pack', 'sixpack'))
    return [
      { text: `Core day then. We'll keep the volume moderate and the form strict.`, delay: 1000 },
      { text: planLine('trainer:core-builder'), planKey: 'trainer:core-builder', delay: 1300 },
      { text: `If your lower back lifts off the floor, stop the set there — that's your honest limit for today.`, delay: 1200 },
    ];

  if (has(q, 'leg', 'squat', 'glute', 'lunge', 'lower body'))
    return [
      { text: `Legs it is.`, delay: 800 },
      { text: planLine('trainer:legs-glutes'), planKey: 'trainer:legs-glutes', delay: 1300 },
      { text: `Three seconds down on the squats, fast back up. Knees tracking over your toes.`, delay: 1100 },
    ];

  if (has(q, 'cardio', 'hiit', 'burn', 'sweat', 'fat loss', 'conditioning', 'intense'))
    return [
      { text: `Let's get your heart rate up.`, delay: 900 },
      { text: planLine('trainer:full-body-burn'), planKey: 'trainer:full-body-burn', delay: 1300 },
      { text: `Keep the rests honest. If you can hold a conversation halfway through, push harder.`, delay: 1100 },
    ];

  if (has(q, 'back hurt', 'back pain', 'lower back', 'hurts', 'pain', 'sore', 'stiff', 'mobility', 'stretch', 'posture'))
    return [
      { text: `Thanks for telling me — don't train through it. Pain that's sharp or that lingers the next day means we stop and get it looked at properly.`, delay: 1200 },
      { text: `If it's just tight and achy, do this instead of your scheduled session today.`, delay: 1200 },
      { text: planLine('trainer:mobility-reset'), planKey: 'trainer:mobility-reset', delay: 1300 },
      { text: `I'm not a doctor — if it isn't settling in a few days, please see a physio.`, delay: 1200 },
    ];

  if (has(q, '15 min', '10 min', 'short', 'quick', 'busy', 'no time', 'little time'))
    return [
      { text: `No problem — short and sharp beats skipping it.`, delay: 900 },
      { text: planLine('trainer:upper-finisher'), planKey: 'trainer:upper-finisher', delay: 1300 },
      { text: `One round if you're pushed for time, two if you can.`, delay: 1000 },
    ];

  if (has(q, 'form', 'technique', 'correct', 'am i doing', 'check my'))
    return [
      { text: `Best way to check that is live — start a video call when you're free and I'll watch a set.`, delay: 1100 },
      { text: `Meanwhile, open any exercise and read the "Common mistakes" tab. That covers 90% of what I'd correct.`, delay: 1200 },
    ];

  if (has(q, 'diet', 'eat', 'food', 'meal', 'protein', 'calorie', 'nutrition'))
    return [
      { text: `Nutrition isn't my side — I'd be guessing. Ask Saathi in the app, it has your actual logs and targets.`, delay: 1100 },
      { text: `What I will say: eat enough protein on training days and don't cut so hard that your sessions fall apart.`, delay: 1200 },
    ];

  if (has(q, 'call', 'talk', 'video', 'audio', 'speak'))
    return [{ text: `Of course — tap the call button at the top whenever you're ready. I've got ${coach.replyMins < 20 ? 'a few minutes' : 'time'} now.`, delay: 900 }];

  if (has(q, 'tomorrow', 'next', 'schedule', 'plan for the week', 'when'))
    return [
      { text: `Your week is already set — have a look at the schedule on your coaching dashboard.`, delay: 1000 },
      { text: `Tomorrow we're on ${TRAINER_PLANS.find((p) => p.trainerId === trainerId)?.title ?? 'your next session'}. Don't skip the warm-up.`, delay: 1200 },
    ];

  if (has(q, 'done', 'finished', 'completed', 'did it'))
    return [
      { text: `Nice one. How did the last two sets feel — 7 out of 10, or closer to 9?`, delay: 1000 },
      { text: `I'll look at your log tonight and adjust next week's volume.`, delay: 1200 },
    ];

  return [
    { text: `Got it. Tell me which area you want to train — chest, core, legs, or something short — and I'll build it for you now.`, delay: 1100 },
  ];
}

/** The conversation a new Pro member starts with. Timestamps are relative to now. */
export function seedConversation(trainerId: string, name: string): Omit<TrainerMsg, 'id'>[] {
  const coach = trainerById(trainerId);
  const now = Date.now();
  const ago = (mins: number) => now - mins * 60_000;
  return [
    {
      from: 'trainer',
      text: `Hi ${name}, I'm ${firstName(coach)} — I'll be your coach from here. I've looked at your profile and set up your first week.`,
      at: ago(180),
      status: 'read',
    },
    {
      from: 'trainer',
      text: `Start with this one. It's bodyweight only, so you can do it at home.`,
      at: ago(179),
      status: 'read',
      planKey: 'trainer:chest-triceps',
    },
    {
      from: 'user',
      text: `Thanks! Looks good, I'll do it this evening.`,
      at: ago(120),
      status: 'read',
    },
    {
      from: 'trainer',
      text: `Perfect. Message me once you're done and tell me how the last set felt — that's how I'll set next week's load.`,
      at: ago(118),
      status: 'delivered',
    },
  ];
}
