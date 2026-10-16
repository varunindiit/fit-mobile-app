/**
 * 30-day training programs, exercise library and focus sessions
 * (inspired by the "Six Pack in 30 Days" reference app).
 */

export type Exercise = {
  id: string;
  name: string;
  emoji: string;
  kind: 'reps' | 'time';
  base: number; // reps, or seconds when kind === 'time'
  focus: string[];
  muscles: string;
  instructions: string[];
  mistakes: { title: string; text: string }[];
  breathing: string[];
};

const COMMON_CORE_MISTAKES = [
  { title: 'Not engaging the core', text: 'Keep your abs tight throughout. A loose core shifts the work to your back and neck.' },
  { title: 'Moving too fast', text: 'Slow, controlled reps beat fast, jerky ones. Control the lowering phase.' },
  { title: 'Holding your breath', text: 'Keep breathing steadily — it keeps your muscles supplied with oxygen.' },
];

export const EXERCISES: Exercise[] = [
  { id: 'jumping-jacks', name: 'Jumping Jacks', emoji: '🤸', kind: 'time', base: 30, focus: ['Full body', 'Cardio'], muscles: 'Calves, shoulders, core', instructions: ['Stand upright with your legs together and arms at your sides.', 'Jump while spreading your legs and raising your arms overhead.', 'Jump back to the start position and repeat.'], mistakes: [{ title: 'Landing heavily', text: 'Land softly on the balls of your feet to protect your knees.' }, ...COMMON_CORE_MISTAKES.slice(1, 2)], breathing: ['Breathe rhythmically — in for two jumps, out for two jumps.'] },
  { id: 'abdominal-crunches', name: 'Abdominal Crunches', emoji: '🙇', kind: 'reps', base: 12, focus: ['Rectus abdominis'], muscles: 'Upper abs', instructions: ['Lie on your back with knees bent and feet flat on the floor.', 'Place your hands lightly behind your ears.', 'Lift your shoulders off the floor using your abs, then lower slowly.'], mistakes: [{ title: 'Pulling on the neck', text: 'Your hands only support your head. Let your abs do the lifting.' }, ...COMMON_CORE_MISTAKES], breathing: ['Exhale as you crunch up.', 'Inhale as you lower back down.'] },
  { id: 'russian-twist', name: 'Russian Twist', emoji: '🔄', kind: 'reps', base: 16, focus: ['Obliques', 'Rectus abdominis'], muscles: 'Obliques', instructions: ['Sit with knees bent and lean back slightly with a straight back.', 'Lift your feet off the ground for more challenge.', 'Rotate your torso to touch the floor on each side.'], mistakes: [{ title: 'Rounding the back', text: 'Keep your chest proud and spine long throughout the twist.' }, ...COMMON_CORE_MISTAKES.slice(0, 2)], breathing: ['Exhale as you twist to each side.', 'Inhale as you return to centre.'] },
  { id: 'mountain-climber', name: 'Mountain Climber', emoji: '🧗', kind: 'time', base: 20, focus: ['Full body', 'Rectus abdominis'], muscles: 'Core, shoulders, hip flexors', instructions: ['Start in a push-up position.', 'Bring your right knee towards your chest, then switch legs quickly.', 'Keep your hips level and keep alternating.'], mistakes: [{ title: 'Hips too high', text: 'Keep a straight line from head to heels like a plank.' }, ...COMMON_CORE_MISTAKES.slice(1)], breathing: ['Keep a quick, steady breathing rhythm.'] },
  { id: 'heel-touch', name: 'Heel Touch', emoji: '👆', kind: 'reps', base: 20, focus: ['Obliques'], muscles: 'Obliques', instructions: ['Lie on your back with knees bent, feet flat, arms by your sides.', 'Lift your shoulders slightly and reach to touch your right heel, then your left.', 'Keep alternating side to side.'], mistakes: [{ title: 'Dropping the shoulders', text: 'Keep your shoulder blades lifted the whole set for constant tension.' }, ...COMMON_CORE_MISTAKES.slice(0, 1)], breathing: ['Exhale with each reach.', 'Breathe in as you pass through the centre.'] },
  { id: 'leg-raises', name: 'Leg Raises', emoji: '🦵', kind: 'reps', base: 12, focus: ['Rectus abdominis', 'Quadriceps'], muscles: 'Lower abs', instructions: ['Lie on your back with legs straight and hands under your hips.', 'Lift your legs until they are at a right angle with the floor.', 'Lower slowly without letting your feet touch the ground.'], mistakes: [{ title: 'Arching the lower back', text: 'Press your lower back into the floor to protect your spine.' }, ...COMMON_CORE_MISTAKES.slice(1)], breathing: ['Exhale as you raise your legs.', 'Inhale as you lower them.'] },
  { id: 'plank', name: 'Plank', emoji: '🧱', kind: 'time', base: 30, focus: ['Rectus abdominis', 'Full body'], muscles: 'Entire core, shoulders', instructions: ['Rest on your forearms and toes with elbows under shoulders.', 'Keep your body in a straight line from head to heels.', 'Hold the position while squeezing your core and glutes.'], mistakes: [{ title: 'Sagging hips', text: 'Squeeze your glutes to keep your hips in line with your body.' }, ...COMMON_CORE_MISTAKES.slice(2)], breathing: ['Breathe slowly and deeply throughout the hold.'] },
  { id: 'bent-leg-twist', name: 'Bent Leg Twist', emoji: '🌀', kind: 'reps', base: 6, focus: ['Obliques'], muscles: 'Obliques, lower back', instructions: ['Lie on your back with your knees up at a 90 degree angle.', 'Extend your arms to the sides with palms down on the ground.', 'Twist your legs to the left while keeping your upper body in place, then to the right.'], mistakes: [{ title: 'Lifting the upper body', text: 'Keep your shoulders and arms flat on the ground to stabilise your torso.' }, { title: 'Separating the knees', text: 'Keep knees and feet together so the twist stays safe and effective.' }, ...COMMON_CORE_MISTAKES.slice(0, 1)], breathing: ['Inhale deeply as you bring your knees to centre.', 'Exhale as you twist to one side.'] },
  { id: 'reverse-crunches', name: 'Reverse Crunches', emoji: '🔃', kind: 'reps', base: 8, focus: ['Rectus abdominis', 'Glutes'], muscles: 'Lower abs', instructions: ['Lie on your back with knees up at a 90 degree angle and hands behind your head.', 'Lift your hips off the ground, bringing your knees toward your chest.', 'Lower slowly back down and repeat.'], mistakes: [{ title: 'Not keeping the lower back flat', text: 'Keep your lower back flat on the floor to avoid straining it.' }, { title: 'Not using a full range of motion', text: 'Bring your knees as close to your chest as possible before lowering.' }, ...COMMON_CORE_MISTAKES.slice(1, 2)], breathing: ['Exhale as you lift your hips.', 'Inhale as you lower them back down.'] },
  { id: 'v-crunch', name: 'V Crunch', emoji: '✌️', kind: 'reps', base: 10, focus: ['Rectus abdominis'], muscles: 'Upper & lower abs', instructions: ['Lie on your back with your legs straight and arms overhead.', 'Lift your upper body and legs at the same time to form a V.', 'Reach for your toes, then lower slowly.'], mistakes: [{ title: 'Using momentum', text: 'Lift with your abs, not by swinging your arms.' }, ...COMMON_CORE_MISTAKES.slice(0, 2)], breathing: ['Exhale as you form the V.', 'Inhale as you lower.'] },
  { id: 'flutter-kicks', name: 'Flutter Kicks', emoji: '🏊', kind: 'time', base: 30, focus: ['Rectus abdominis', 'Quadriceps'], muscles: 'Lower abs, hip flexors', instructions: ['Lie on your back with hands under your hips.', 'Lift your legs slightly off the floor.', 'Kick your legs up and down in small, quick movements.'], mistakes: [{ title: 'Kicking too high', text: 'Small, controlled kicks keep tension on the lower abs.' }, ...COMMON_CORE_MISTAKES.slice(0, 1)], breathing: ['Breathe steadily; do not hold your breath.'] },
  { id: 'cross-arm-crunches', name: 'Cross Arm Crunches', emoji: '🙅', kind: 'reps', base: 14, focus: ['Rectus abdominis'], muscles: 'Upper abs', instructions: ['Lie on your back with knees bent and arms crossed over your chest.', 'Curl your shoulders off the floor.', 'Lower slowly and repeat.'], mistakes: COMMON_CORE_MISTAKES, breathing: ['Exhale up, inhale down.'] },
  { id: 'bicycle-crunches', name: 'Bicycle Crunches', emoji: '🚴', kind: 'reps', base: 16, focus: ['Obliques', 'Rectus abdominis'], muscles: 'Obliques, abs', instructions: ['Lie on your back with hands behind your head and legs lifted.', 'Bring your right elbow towards your left knee while extending the right leg.', 'Switch sides in a pedalling motion.'], mistakes: [{ title: 'Rushing the movement', text: 'Rotate fully on each side instead of just flapping your elbows.' }, ...COMMON_CORE_MISTAKES.slice(2)], breathing: ['Exhale on each twist.'] },
  { id: 'side-plank', name: 'Side Plank', emoji: '📐', kind: 'time', base: 20, focus: ['Obliques', 'Glutes'], muscles: 'Obliques, shoulders', instructions: ['Lie on your side, propped up on one forearm.', 'Lift your hips so your body forms a straight line.', 'Hold, then switch sides.'], mistakes: [{ title: 'Hips dropping', text: 'Push your hips up towards the ceiling the whole time.' }], breathing: ['Breathe slowly through the hold.'] },
  { id: 'x-man-crunch', name: 'X Man Crunch', emoji: '❌', kind: 'reps', base: 10, focus: ['Rectus abdominis', 'Full body'], muscles: 'Full core', instructions: ['Lie on your back with arms and legs spread wide like an X.', 'Crunch up, bringing your arms and legs together.', 'Return slowly to the X position.'], mistakes: COMMON_CORE_MISTAKES.slice(0, 2), breathing: ['Exhale as you crunch in.', 'Inhale as you open up.'] },
  { id: 'push-ups', name: 'Push-ups', emoji: '💪', kind: 'reps', base: 10, focus: ['Chest', 'Arm'], muscles: 'Chest, triceps, shoulders', instructions: ['Start in a high plank with hands slightly wider than shoulders.', 'Lower your chest until it almost touches the floor.', 'Push back up to the start.'], mistakes: [{ title: 'Flaring the elbows', text: 'Keep elbows at about 45 degrees to protect your shoulders.' }, ...COMMON_CORE_MISTAKES.slice(0, 1)], breathing: ['Inhale on the way down.', 'Exhale as you push up.'] },
  { id: 'wide-push-ups', name: 'Wide Arm Push-ups', emoji: '🦅', kind: 'reps', base: 10, focus: ['Chest'], muscles: 'Outer chest', instructions: ['Start in a push-up position with hands wider than shoulder-width.', 'Lower your chest towards the floor.', 'Push back up.'], mistakes: [{ title: 'Partial reps', text: 'Lower until your chest is close to the floor for full benefit.' }], breathing: ['Inhale down, exhale up.'] },
  { id: 'tricep-dips', name: 'Tricep Dips', emoji: '🪑', kind: 'reps', base: 12, focus: ['Arm'], muscles: 'Triceps', instructions: ['Sit on the edge of a chair, hands next to your hips.', 'Slide forward and lower your body by bending your elbows.', 'Push back up.'], mistakes: [{ title: 'Shrugging shoulders', text: 'Keep your shoulders down and away from your ears.' }], breathing: ['Inhale as you lower, exhale as you push.'] },
  { id: 'squats', name: 'Squats', emoji: '🏋️', kind: 'reps', base: 15, focus: ['Leg', 'Glutes', 'Quadriceps'], muscles: 'Quads, glutes, hamstrings', instructions: ['Stand with feet shoulder-width apart.', 'Push your hips back and bend your knees as if sitting in a chair.', 'Drive through your heels to stand.'], mistakes: [{ title: 'Knees caving in', text: 'Push your knees out in line with your toes.' }, { title: 'Heels lifting', text: 'Keep your weight on your heels and mid-foot.' }], breathing: ['Inhale on the way down.', 'Exhale as you stand up.'] },
  { id: 'lunges', name: 'Lunges', emoji: '🚶', kind: 'reps', base: 12, focus: ['Leg', 'Glutes'], muscles: 'Quads, glutes', instructions: ['Step forward with one leg and lower until both knees are at 90 degrees.', 'Push back to the start.', 'Alternate legs.'], mistakes: [{ title: 'Front knee past toes', text: 'Take a long enough step so the front knee stays above the ankle.' }], breathing: ['Inhale as you lower, exhale as you rise.'] },
  { id: 'glute-bridge', name: 'Glute Bridge', emoji: '🌉', kind: 'reps', base: 15, focus: ['Glutes', 'Back'], muscles: 'Glutes, hamstrings, lower back', instructions: ['Lie on your back with knees bent and feet flat.', 'Lift your hips until your body forms a straight line from shoulders to knees.', 'Squeeze your glutes, then lower slowly.'], mistakes: [{ title: 'Over-arching', text: 'Stop when your body is in a straight line; do not over-extend the back.' }], breathing: ['Exhale as you lift, inhale as you lower.'] },
  { id: 'superman', name: 'Superman', emoji: '🦸', kind: 'reps', base: 12, focus: ['Back'], muscles: 'Lower back, glutes', instructions: ['Lie face down with arms extended in front.', 'Lift your arms, chest and legs off the floor at the same time.', 'Hold for a second and lower.'], mistakes: [{ title: 'Craning the neck', text: 'Keep your gaze down to keep your neck neutral.' }], breathing: ['Exhale as you lift, inhale as you lower.'] },
  { id: 'burpees', name: 'Burpees', emoji: '⚡', kind: 'reps', base: 8, focus: ['Full body', 'Cardio'], muscles: 'Full body', instructions: ['From standing, squat and place your hands on the floor.', 'Jump your feet back into a plank, then jump them forward.', 'Explode up into a jump.'], mistakes: [{ title: 'Sloppy plank', text: 'Keep your core tight when you jump back so your hips do not sag.' }], breathing: ['Exhale on the jump; find a steady rhythm.'] },
  { id: 'cobra-stretch', name: 'Cobra Stretch', emoji: '🐍', kind: 'time', base: 30, focus: ['Rectus abdominis', 'Back'], muscles: 'Abs, hip flexors (stretch)', instructions: ['Lie face down with hands under your shoulders.', 'Gently push your chest up, keeping your hips on the floor.', 'Hold and breathe.'], mistakes: [{ title: 'Pushing too far', text: 'Only go as high as is comfortable for your lower back.' }], breathing: ['Breathe slowly and deeply to relax into the stretch.'] },
  { id: 'spine-twist', name: 'Spine Lumbar Twist Stretch', emoji: '🧘', kind: 'time', base: 30, focus: ['Back', 'Obliques'], muscles: 'Lower back (stretch)', instructions: ['Lie on your back and bring one knee across your body.', 'Extend the opposite arm and look the other way.', 'Hold, then switch sides.'], mistakes: [{ title: 'Forcing the twist', text: 'Let gravity do the work; do not push the knee down.' }], breathing: ['Exhale to sink deeper into the stretch.'] },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)!;

export type ProgramId = 'belly' | 'abs' | 'sixpack';

export const PROGRAMS: {
  id: ProgramId;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  bolts: number;
  colors: [string, string];
  users: string;
  desc: string;
  emoji: string;
  pool: string[];
  baseCount: number;
  mult: number;
}[] = [
  { id: 'belly', title: 'Lose Belly Fat', level: 'Beginner', bolts: 1, colors: ['#4F8BFF', '#2563EB'], users: '89,58,192+', desc: 'Start your journey to a flatter stomach. Just 7 minutes a day to shed belly fat easily.', emoji: '🔥', pool: ['jumping-jacks', 'abdominal-crunches', 'heel-touch', 'mountain-climber', 'leg-raises', 'plank', 'glute-bridge', 'bicycle-crunches', 'cobra-stretch', 'spine-twist'], baseCount: 8, mult: 1 },
  { id: 'abs', title: 'Rock Hard Abs', level: 'Intermediate', bolts: 2, colors: ['#8B5CF6', '#6D28D9'], users: '61,16,700+', desc: 'Powerful moves to hit every part of your abs for a coveted six-pack.', emoji: '💪', pool: ['jumping-jacks', 'russian-twist', 'mountain-climber', 'reverse-crunches', 'v-crunch', 'flutter-kicks', 'cross-arm-crunches', 'bicycle-crunches', 'side-plank', 'plank', 'heel-touch', 'cobra-stretch'], baseCount: 12, mult: 1.3 },
  { id: 'sixpack', title: 'Six Pack Abs', level: 'Advanced', bolts: 3, colors: ['#FF7A59', '#E5484D'], users: '38,40,500+', desc: 'Intense, high-volume core training for experienced athletes who want visible abs.', emoji: '🏆', pool: ['bent-leg-twist', 'reverse-crunches', 'v-crunch', 'flutter-kicks', 'heel-touch', 'cross-arm-crunches', 'x-man-crunch', 'mountain-climber', 'russian-twist', 'burpees', 'side-plank', 'plank', 'leg-raises', 'bicycle-crunches', 'cobra-stretch', 'spine-twist'], baseCount: 16, mult: 1.6 },
];

export const programById = (id: string) => PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0];

export type SessionItem = { exerciseId: string; reps?: number; seconds?: number };
export type Session = { key: string; title: string; subtitle: string; colors: [string, string]; emoji: string; items: SessionItem[]; restDay?: boolean };

export const PROGRAM_DAYS = 30;
export const isRestDay = (day: number) => day % 7 === 0;

/** Deterministic plan for a program day (1-based). */
export function programDay(programId: string, day: number): Session {
  const p = programById(programId);
  const key = `program:${p.id}:${day}`;
  if (isRestDay(day)) return { key, title: `Day ${day}`, subtitle: 'Rest day', colors: p.colors, emoji: '😴', items: [], restDay: true };
  const count = Math.min(p.pool.length + 6, p.baseCount + Math.floor(day / 6));
  const items: SessionItem[] = [];
  // warm-up first, stretch last, rotate the middle so each day differs
  const body = p.pool.filter((id) => !['jumping-jacks', 'cobra-stretch', 'spine-twist'].includes(id));
  items.push({ exerciseId: 'jumping-jacks', seconds: 30 });
  for (let i = 0; items.length < count - 1; i++) {
    const ex = exerciseById(body[(i + day * 3) % body.length]);
    const scale = p.mult * (1 + day * 0.03);
    items.push(ex.kind === 'time' ? { exerciseId: ex.id, seconds: Math.round((ex.base * scale) / 5) * 5 } : { exerciseId: ex.id, reps: Math.round(ex.base * scale) });
  }
  items.push({ exerciseId: day % 2 ? 'cobra-stretch' : 'spine-twist', seconds: 30 });
  return { key, title: `Day ${day}`, subtitle: `${p.title} · ${p.level}`, colors: p.colors, emoji: p.emoji, items };
}

/** Body-part sessions for the "Body focus" tabs and the carousels on the Training tab. */
export const FOCUS_SESSIONS: (Session & { part: string; level: string; equipment?: boolean })[] = [
  { key: 'focus:abs-beginner', part: 'Abs', level: 'Beginner', title: 'Abs Beginner', subtitle: '10 min', colors: ['#4F8BFF', '#2563EB'], emoji: '🔥', items: [{ exerciseId: 'jumping-jacks', seconds: 30 }, { exerciseId: 'abdominal-crunches', reps: 12 }, { exerciseId: 'heel-touch', reps: 20 }, { exerciseId: 'leg-raises', reps: 10 }, { exerciseId: 'plank', seconds: 30 }, { exerciseId: 'cobra-stretch', seconds: 30 }] },
  { key: 'focus:rock-hard', part: 'Abs', level: 'Advanced', title: 'Rock-Hard Six Packs', subtitle: 'Advanced · 30 min', colors: ['#14B8A6', '#0E7490'], emoji: '🏆', items: [{ exerciseId: 'mountain-climber', seconds: 40 }, { exerciseId: 'v-crunch', reps: 16 }, { exerciseId: 'x-man-crunch', reps: 14 }, { exerciseId: 'flutter-kicks', seconds: 45 }, { exerciseId: 'russian-twist', reps: 30 }, { exerciseId: 'burpees', reps: 12 }, { exerciseId: 'side-plank', seconds: 40 }, { exerciseId: 'plank', seconds: 60 }] },
  { key: 'focus:intense-shred', part: 'Full body', level: 'Advanced', title: 'Intense Shred', subtitle: 'Advanced · 22 min', colors: ['#FF7A59', '#E5484D'], emoji: '⚡', items: [{ exerciseId: 'jumping-jacks', seconds: 45 }, { exerciseId: 'burpees', reps: 12 }, { exerciseId: 'squats', reps: 20 }, { exerciseId: 'push-ups', reps: 14 }, { exerciseId: 'mountain-climber', seconds: 45 }, { exerciseId: 'lunges', reps: 16 }, { exerciseId: 'plank', seconds: 45 }] },
  { key: 'focus:stronger-abs', part: 'Abs', level: 'Intermediate', title: 'Stronger Abs Shape & Blast', subtitle: 'Intermediate · 17 min', colors: ['#22C55E', '#15803D'], emoji: '💥', items: [{ exerciseId: 'bicycle-crunches', reps: 20 }, { exerciseId: 'reverse-crunches', reps: 12 }, { exerciseId: 'russian-twist', reps: 24 }, { exerciseId: 'flutter-kicks', seconds: 30 }, { exerciseId: 'side-plank', seconds: 30 }, { exerciseId: 'plank', seconds: 45 }] },
  { key: 'focus:chest-beginner', part: 'Chest', level: 'Beginner', title: 'Chest Beginner', subtitle: 'Beginner · 9 min', colors: ['#3B82F6', '#1D4ED8'], emoji: '💪', items: [{ exerciseId: 'jumping-jacks', seconds: 30 }, { exerciseId: 'push-ups', reps: 8 }, { exerciseId: 'wide-push-ups', reps: 8 }, { exerciseId: 'tricep-dips', reps: 10 }, { exerciseId: 'cobra-stretch', seconds: 30 }], equipment: false },
  { key: 'focus:chest-dumbbell', part: 'Chest', level: 'Advanced', title: 'Chest Dumbbell Circuit', subtitle: 'Advanced · 24 min', colors: ['#B45309', '#78350F'], emoji: '🏋️', items: [{ exerciseId: 'push-ups', reps: 15 }, { exerciseId: 'wide-push-ups', reps: 14 }, { exerciseId: 'tricep-dips', reps: 15 }, { exerciseId: 'burpees', reps: 10 }, { exerciseId: 'plank', seconds: 45 }], equipment: true },
  { key: 'focus:arm-toning', part: 'Arm', level: 'Beginner', title: 'Arm Toning', subtitle: 'Beginner · 8 min', colors: ['#EC4899', '#BE185D'], emoji: '💪', items: [{ exerciseId: 'tricep-dips', reps: 12 }, { exerciseId: 'push-ups', reps: 8 }, { exerciseId: 'plank', seconds: 30 }, { exerciseId: 'side-plank', seconds: 20 }] },
  { key: 'focus:leg-day', part: 'Leg', level: 'Intermediate', title: 'Leg Day Burner', subtitle: 'Intermediate · 14 min', colors: ['#F59E0B', '#B45309'], emoji: '🦵', items: [{ exerciseId: 'squats', reps: 20 }, { exerciseId: 'lunges', reps: 16 }, { exerciseId: 'glute-bridge', reps: 18 }, { exerciseId: 'mountain-climber', seconds: 30 }, { exerciseId: 'squats', reps: 15 }] },
  { key: 'focus:back-relief', part: 'Back', level: 'Beginner', title: 'Back Strength & Relief', subtitle: 'Beginner · 10 min', colors: ['#27AD15', '#177A0A'], emoji: '🧘', items: [{ exerciseId: 'superman', reps: 12 }, { exerciseId: 'glute-bridge', reps: 15 }, { exerciseId: 'cobra-stretch', seconds: 30 }, { exerciseId: 'spine-twist', seconds: 30 }] },
  { key: 'focus:ultimate-core', part: 'Full body', level: 'Advanced', title: 'Ultimate Abs & Core Blast', subtitle: 'Advanced · 32 min', colors: ['#7C3AED', '#4C1D95'], emoji: '🔥', items: [{ exerciseId: 'burpees', reps: 12 }, { exerciseId: 'v-crunch', reps: 18 }, { exerciseId: 'x-man-crunch', reps: 14 }, { exerciseId: 'bicycle-crunches', reps: 30 }, { exerciseId: 'leg-raises', reps: 16 }, { exerciseId: 'plank', seconds: 60 }], equipment: true },
];

// Keep card subtitles consistent with the computed session length.
FOCUS_SESSIONS.forEach((s) => {
  s.subtitle = `${s.level} · ${sessionStats(s).minutes} min`;
});

export const BODY_PARTS = ['Abs', 'Chest', 'Arm', 'Leg', 'Back', 'Full body'];

export function sessionByKey(key: string): Session | undefined {
  if (key.startsWith('program:')) {
    const [, pid, day] = key.split(':');
    return programDay(pid, Number(day));
  }
  return FOCUS_SESSIONS.find((s) => s.key === key);
}

/** Estimated duration (min) and calories for a session, including 30s rests. */
export function sessionStats(s: Session, restSeconds = 30) {
  const work = s.items.reduce((a, it) => a + (it.seconds ?? (it.reps ?? 10) * 3), 0);
  const total = work + Math.max(0, s.items.length - 1) * restSeconds;
  return { exercises: s.items.length, minutes: Math.max(1, Math.round(total / 60)), kcal: Math.round(work * 0.16 + s.items.length * 2.5) };
}
