import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dietKind, firstName, fmtNum, fmtWeight, goalSummary, useKeyboardShown, type DietKind } from '@/components/profile/shared';
import { Dialog, EASE_OUT, IconButton, layoutTransition, nativeOnly, PressableScale, Screen, T, tap, useToast, type IconName } from '@/components/ui';
import { foodById, type Food } from '@/data/foods';
import { workoutById } from '@/data/fitness';
import { exerciseById, PROGRAM_DAYS, programById, programDay, sessionStats } from '@/data/program';
import { round1, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, isPremiumActive, useStore, type AppState } from '@/lib/store';
import { C, MOTION, R } from '@/theme';

/** Actions are persisted with the chat, so links are plain route strings (cast to Href when opened). */
type Action = { label: string; icon: IconName; href?: string; water?: boolean };
type Reply = { text: string; action?: Action };
type Store = ReturnType<typeof useStore>;

const SUGGESTIONS = ['How am I doing today?', "What's my workout today?", 'Suggest a high-protein snack', 'What should I eat for dinner?', 'Plan a 15-min workout', 'Is biryani okay for weight loss?'];

/** Known foods only: a renamed/removed id is skipped instead of crashing a reply. */
const foodsOf = (ids: string[]) => ids.map((id) => foodById(id)).filter((f): f is Food => !!f);
const foodLink = (id: string, meal: string) => `/food/${encodeURIComponent(id)}?meal=${meal}`;
const snackMeal = () => (new Date().getHours() < 15 ? 'morningSnack' : 'eveningSnack');
const mealNow = () => {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : 'dinner';
};

/* ---------- Context from real app state ---------- */

function ctxOf(state: AppState, t: Store['targets']) {
  const today = todayKey();
  const tot = dayTotals(state.entries, today).total;
  const burned = burnedOn(state, today).total;
  const eaten = Math.round(tot.kcal);
  return {
    name: firstName(state.profile.name),
    eaten,
    budget: t.budget,
    burned,
    left: t.budget + burned - eaten,
    protein: Math.round(tot.protein),
    proteinT: t.protein,
    water: state.water[today] ?? 0,
    waterT: t.water,
    steps: state.steps[today] ?? 0,
    stepT: t.stepGoal,
    kind: dietKind(state.profile.diet),
    diet: state.profile.diet ? state.profile.diet.toLowerCase() : 'balanced',
    p: state.profile,
    t,
    units: state.settings.units,
    premium: isPremiumActive(state.premium) ? state.premium : null,
    program: programById(state.profile.program),
    programDone: Math.min(PROGRAM_DAYS, state.programProgress[state.profile.program] ?? 0),
    rest: state.settings.restSeconds,
  };
}
type Ctx = ReturnType<typeof ctxOf>;

function greeting(c: Ctx): string {
  const status = c.left >= 0 ? `${fmtNum(c.left)} kcal left` : `${fmtNum(-c.left)} kcal over`;
  const protein = c.protein < c.proteinT ? ` You still need ${c.proteinT - c.protein} g protein.` : ' Protein goal done — great job!';
  return `Hi ${c.name}! I'm Saathi, your AI nutrition coach.\n\nToday you've eaten ${fmtNum(c.eaten)} of ${fmtNum(c.budget)} kcal — ${status}.${protein}\n\nAsk me anything about food, workouts or your goal!`;
}

/* ---------- Canned, state-aware replies ---------- */

const SNACKS: Record<DietKind, string[]> = {
  nonveg: ['grilled-chicken', 'boiled-egg', 'sprouts', 'greek-yogurt'],
  egg: ['boiled-egg', 'sprouts', 'greek-yogurt', 'paneer-bhurji'],
  veg: ['sprouts', 'greek-yogurt', 'paneer-bhurji', 'makhana'],
  vegan: ['sprouts', 'peanuts', 'makhana', 'dhokla'],
};
type Plate = [string, number][];
const PLATES: Record<'breakfast' | 'lunch' | 'dinner', Record<DietKind, Plate>> = {
  breakfast: {
    veg: [['oats', 1], ['almonds', 1]],
    vegan: [['poha', 1], ['green-tea', 1]],
    egg: [['omelette', 1], ['bread-toast', 2]],
    nonveg: [['omelette', 1], ['bread-toast', 2]],
  },
  lunch: {
    veg: [['roti', 2], ['rajma', 1], ['green-salad', 1], ['buttermilk', 1]],
    vegan: [['roti', 2], ['chole', 1], ['green-salad', 1]],
    egg: [['roti', 2], ['egg-curry', 1], ['green-salad', 1]],
    nonveg: [['roti', 2], ['chicken-curry', 1], ['green-salad', 1]],
  },
  dinner: {
    veg: [['roti', 2], ['dal', 1], ['mix-veg', 1], ['green-salad', 1]],
    vegan: [['roti', 2], ['dal', 1], ['mix-veg', 1]],
    egg: [['roti', 2], ['egg-curry', 1], ['green-salad', 1]],
    nonveg: [['grilled-chicken', 1.5], ['brown-rice', 1], ['green-salad', 1]],
  },
};
const LIGHT: Record<DietKind, Plate> = {
  veg: [['dal', 1], ['green-salad', 1], ['curd', 1]],
  vegan: [['dal', 1], ['green-salad', 1]],
  egg: [['boiled-egg', 2], ['green-salad', 1]],
  nonveg: [['fish-curry', 1], ['green-salad', 1]],
};
const plateItems = (pl: Plate) => pl.flatMap(([id, q]) => {
  const f = foodById(id);
  return f ? [{ f, q }] : [];
});
const plateStats = (pl: Plate) => plateItems(pl).reduce((a, { f, q }) => ({ kcal: a.kcal + f.kcal * q, protein: a.protein + f.protein * q }), { kcal: 0, protein: 0 });
const plateLines = (pl: Plate) => plateItems(pl).map(({ f, q }) => `• ${q !== 1 ? `${q} × ` : ''}${f.name}`).join('\n');

function reply(raw: string, c: Ctx): Reply {
  const q = raw.toLowerCase();
  const has = (...k: string[]) => k.some((x) => q.includes(x));

  if (/^(hi|hey|hello|namaste|hii+|yo)\b/.test(q.trim()) && q.length < 20)
    return { text: `Namaste ${c.name}! How can I help today? You can ask me what to eat, how you're doing, or for a quick workout.` };

  if (has('thank'))
    return { text: `Anytime, ${c.name}! Small, consistent steps win. I'm here 24×7 whenever you need me.` };

  if (has('biryani', 'pizza', 'burger', 'samosa', 'sweet', 'mithai', 'gulab', 'cheat', 'junk', 'dessert')) {
    const nonveg = c.kind === 'nonveg';
    const b = foodById(nonveg ? 'chicken-biryani' : 'veg-pulao');
    if (has('biryani') && b) {
      const kcal = nonveg ? b.kcal : b.kcal * 2;
      const fits = c.left >= kcal;
      return {
        text: `Yes — in moderation! ${nonveg ? 'A plate of chicken biryani' : 'A 2-katori serving of veg biryani'} is ~${fmtNum(kcal)} kcal, mostly carbs.\n\nYou have ${fmtNum(Math.max(0, c.left))} kcal left today, so ${fits ? 'it fits — enjoy it guilt-free' : `a half portion (~${fmtNum(kcal / 2)} kcal) is the smarter choice today.`}\n\nMake it lighter:\n• Pair with raita & a big salad\n• ${nonveg ? 'Pick chicken over mutton' : 'Ask for extra veggies'}\n• Skip extra fried onions & ghee\n• Take a 20-min walk afterwards`,
        action: { label: `Log ${b.name}`, icon: 'add-circle', href: foodLink(b.id, mealNow()) },
      };
    }
    const s = foodById('makhana');
    return {
      text: `Treats are totally okay — I follow the 80/20 rule: eat well 80% of the time and enjoy the rest mindfully.\n\nKeep the portion small, have it earlier in the day, and balance with a lighter next meal.${s ? ` Craving something crunchy? ${s.emoji} ${s.name} is just ${s.kcal} kcal a cup.` : ''}`,
      action: s ? { label: `Log ${s.name}`, icon: 'add-circle', href: foodLink(s.id, snackMeal()) } : undefined,
    };
  }

  if (has('protein', 'snack', 'hungry', 'craving')) {
    const items = foodsOf(SNACKS[c.kind]);
    const top = items[0];
    const gap = Math.max(0, c.proteinT - c.protein);
    return {
      text: `Here are high-protein snacks for your ${c.diet} diet\n\n${items.map((x) => `• ${x.name} — ${round1(x.protein)} g protein, ${x.kcal} kcal`).join('\n')}\n\n${gap > 0 ? `You're ${gap} g short of today's ${c.proteinT} g protein goal${top ? `, so ${top.name} is a smart pick` : ''}.` : "You've already hit today's protein goal — keep snacks light!"}`,
      action: top ? { label: `Log ${top.name}`, icon: 'add-circle', href: foodLink(top.id, snackMeal()) } : undefined,
    };
  }

  if (has('dinner', 'lunch', 'breakfast', 'meal', 'food', 'diet plan') || /\beat(ing)?\b/.test(q)) {
    const meal = has('breakfast') ? 'breakfast' : has('lunch') ? 'lunch' : has('dinner') ? 'dinner' : mealNow();
    let plate = PLATES[meal][c.kind];
    let s = plateStats(plate);
    let intro = `For ${meal}, with ${fmtNum(Math.max(0, c.left))} kcal left, try this plate (~${fmtNum(s.kcal)} kcal · ${Math.round(s.protein)} g protein):`;
    if (meal !== 'breakfast' && c.left < s.kcal + 50) {
      plate = LIGHT[c.kind];
      s = plateStats(plate);
      intro =
        c.left > 0
          ? `You have only ${fmtNum(c.left)} kcal left, so keep ${meal} light (~${fmtNum(s.kcal)} kcal · ${Math.round(s.protein)} g protein):`
          : `You've used today's budget, but don't skip ${meal}. Keep it very light (~${fmtNum(s.kcal)} kcal):`;
    }
    return {
      text: `${intro}\n\n${plateLines(plate)}\n\nTip: start with the salad — the fibre keeps you full longer.`,
      action: { label: `Log ${meal}`, icon: 'add-circle', href: `/food-search?meal=${meal}` },
    };
  }

  if (has('program', 'six pack', 'six-pack', 'sixpack', '30 day', '30-day', 'training', 'abs', 'belly', 'my workout', 'workout today')) {
    const pr = c.program;
    if (c.programDone >= PROGRAM_DAYS)
      return {
        text: `You've completed all ${PROGRAM_DAYS} days of ${pr.title}! Time to level up — try the next program on the Workout tab.`,
        action: { label: 'Browse programs', icon: 'barbell', href: '/fitness' },
      };
    const day = c.programDone + 1;
    const s = programDay(pr.id, day);
    if (s.restDay)
      return {
        text: `Day ${day} of ${pr.title} is a rest day\n\nRecovery is when your core actually gets stronger. Go for a gentle walk, stretch, and aim for 7–8 hours of sleep tonight.`,
        action: { label: 'Open Workout', icon: 'barbell', href: '/fitness' },
      };
    const stats = sessionStats(s, c.rest);
    const list = s.items
      .slice(0, 4)
      .map((it) => {
        const ex = exerciseById(it.exerciseId);
        return `• ${ex.name} — ${it.reps ? `×${it.reps}` : `${it.seconds}s`}`;
      })
      .join('\n');
    return {
      text: `You're on ${pr.title} (${pr.level}) — ${c.programDone}/${PROGRAM_DAYS} days done.\n\nNext up: Day ${day} · ${stats.exercises} exercises · ~${stats.minutes} min · ~${stats.kcal} kcal\n\n${list}${s.items.length > 4 ? `\n• +${s.items.length - 4} more` : ''}\n\nAbs are made in the kitchen too — ${c.left > 0 ? `you have ${fmtNum(c.left)} kcal left today.` : "you've reached today's calorie budget."}`,
      action: { label: `Start Day ${day}`, icon: 'play-circle', href: `/program-day?key=${encodeURIComponent(s.key)}` },
    };
  }

  if (has('workout', 'exercise', 'hiit', 'yoga', 'walk', 'strength', 'muscle', 'dance', 'core', 'burn', 'gym')) {
    const id = has('yoga')
      ? 'morning-yoga'
      : has('walk')
        ? 'brisk-walk'
        : has('strength', 'muscle', 'gym', 'dumbbell')
          ? 'full-body-strength'
          : has('dance', 'zumba')
            ? 'dance-cardio'
            : has('core')
              ? 'core-blast'
              : 'fat-burn-hiit';
    const w = workoutById(id)!;
    const stepsLeft = c.stepT - c.steps;
    return {
      text: `Here's a ${w.minutes}-min ${w.title} — ~${w.kcal} kcal, ${w.level.toLowerCase()}, ${w.equipment.toLowerCase()}:\n\n${w.exercises.map((e) => `• ${e.name} — ${e.detail}`).join('\n')}\n\n${stepsLeft > 0 ? `You're also ${fmtNum(stepsLeft)} steps from your daily goal — a short walk later will close it.` : "You've already hit your step goal today. Amazing!"}`,
      action: { label: `Start ${w.title}`, icon: 'play-circle', href: `/workout/${w.id}` },
    };
  }

  if (has('water', 'hydrat', 'drink')) {
    const done = c.water >= c.waterT;
    return {
      text: `You've had ${c.water} of ${c.waterT} glasses of water today\n\n${done ? 'Goal done — brilliant!' : `${c.waterT - c.water} more to go. Keep a bottle at your desk and have a glass before every meal — it also helps control hunger.`}`,
      action: { label: 'Add a glass of water', icon: 'water', water: true },
    };
  }

  if (has('diabetes', 'sugar', 'pcos', 'pcod', 'thyroid', 'bp', 'pressure', 'cholesterol', 'liver', 'doctor', 'nutritionist', 'coach', 'trainer', 'expert', 'human')) {
    return {
      text: `For medical conditions, a personalised plan really matters. The basics:\n\n• Choose low-GI carbs — brown rice, ragi, jowar, oats\n• Add protein to every meal\n• Eat fibre first, carbs last\n• Limit sweets, juices and maida\n\nWith Fitora Pro, a certified specialist like Sneha Kulkarni (Diabetes Educator) builds your plan and reviews your logs every week.`,
      action: { label: 'See Pro plans', icon: 'diamond', href: '/plans?tier=pro' },
    };
  }

  if (has('how am i', 'doing', 'today', 'progress', 'summary', 'calorie', 'kcal', 'budget')) {
    const verdict =
      c.left < 0
        ? `You're ${fmtNum(-c.left)} kcal over — a 30-min brisk walk burns ~140 kcal.`
        : c.eaten < c.budget * 0.35 && new Date().getHours() >= 15
          ? "You're well under budget — don't skip meals, it leads to overeating at night."
          : "You're right on track";
    const water = c.water < c.waterT / 2 ? ` Also, drink ${c.waterT - c.water} more glasses of water.` : '';
    return {
      text: `Here's your day so far, ${c.name}:\n\n• Eaten: ${fmtNum(c.eaten)} / ${fmtNum(c.budget)} kcal\n• Burned: ${fmtNum(c.burned)} kcal\n• Protein: ${c.protein} / ${c.proteinT} g\n• Water: ${c.water} / ${c.waterT} glasses\n• Steps: ${fmtNum(c.steps)} / ${fmtNum(c.stepT)}\n\n${verdict}${water}`,
      action: { label: 'Open my diary', icon: 'book', href: '/diary' },
    };
  }

  if (has('weight', 'lose', 'loss', 'gain', 'goal', 'plateau', 'fat', 'kg')) {
    const g = goalSummary(c.p, c.t, c.units);
    const change = round1(c.p.startWeightKg - c.p.weightKg);
    const so = change > 0 ? `You've lost ${fmtWeight(change, c.units)} so far — great work! ` : change < 0 ? `You've gained ${fmtWeight(-change, c.units)} so far. ` : '';
    return {
      text: `Your goal: ${g.title}.\n\n${so}Stick to ~${fmtNum(c.budget)} kcal and ${c.proteinT} g protein a day and you'll get there.\n\nPlateaus are normal — if the scale doesn't move for 2 weeks, add 2,000 steps a day and cut back on liquid calories like chai sugar.`,
      action: { label: 'View my progress', icon: 'trending-down', href: '/progress' },
    };
  }

  if (has('premium', 'plan', 'price', 'subscription', 'upgrade', 'smart') || /\bpro\b/.test(q)) {
    return {
      text: c.premium
        ? `You're already on Fitora ${c.premium.tier === 'pro' ? 'Pro' : 'Smart'} — enjoy unlimited chats with me!`
        : `Fitora Smart starts at ₹1,799 for 3 months and unlocks unlimited Saathi chats, Snap scans and personalised plans. Pro adds your own nutritionist and trainer.`,
      action: { label: 'See plans', icon: 'diamond', href: '/plans' },
    };
  }

  if (has('sleep', 'tired', 'stress', 'energy')) {
    return {
      text: `Sleep and stress affect weight more than most people think\n\n• Aim for 7–8 hours, same time daily\n• No screens 30 min before bed\n• Finish dinner 2–3 hours before sleeping\n• Try 5 minutes of pranayama to unwind`,
      action: { label: 'Start Morning Yoga Flow', icon: 'play-circle', href: '/workout/morning-yoga' },
    };
  }

  return {
    text: `Hmm, I'm still learning about that one\n\nI can help with your calories, meals, high-protein snacks, workouts, water and weight goal. For anything medical, a Fitora Pro nutritionist is the best person to ask.`,
    action: { label: 'Talk to a human coach', icon: 'people', href: '/plans?tier=pro' },
  };
}

/* ---------- Screen ---------- */

const replyDelay = () => 900 + Math.random() * 600;
const BUBBLE_IN = nativeOnly(FadeInDown.duration(MOTION.base).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 10 }] }));
const LIST = layoutTransition;
// Hide the browser focus ring on react-native-web.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export default function CoachScreen() {
  const store = useStore();
  const { state, targets, hydrated, addChatMessage, clearChat, addWater } = store;
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardShown();
  const params = useLocalSearchParams<{ q?: string }>();

  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seeding = useRef(false);
  const sentQ = useRef(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The chat is persisted; greet only when it is empty (first visit or after a new chat).
  const chatLen = state.coachChat.length;
  useEffect(() => {
    if (chatLen > 0) {
      seeding.current = false;
      return;
    }
    if (!hydrated || seeding.current) return;
    seeding.current = true;
    addChatMessage({ from: 'bot', text: greeting(ctxOf(state, targets)) });
  }, [chatLen, hydrated, addChatMessage, state, targets]);

  // Reply and question are saved together right away; only the typing indicator is delayed,
  // so leaving the screen mid-"typing" never drops the answer. The pending reply stays hidden until then.
  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    tap();
    setInput('');
    const r = reply(text, ctxOf(state, targets));
    addChatMessage({ from: 'user', text });
    addChatMessage({ from: 'bot', ...r });
    setTyping(true);
    timers.current.push(setTimeout(() => setTyping(false), replyDelay()));
  };

  // Optional deep link: /coach?q=… asks once on arrival.
  const q = typeof params.q === 'string' ? params.q : '';
  useEffect(() => {
    if (!hydrated || !q || sentQ.current) return;
    sentQ.current = true;
    send(q);
  });

  const runAction = (a: Action) => {
    if (a.water) {
      const today = todayKey();
      const n = Math.min(16, (state.water[today] ?? 0) + 1);
      addWater(1, today);
      toast(`Added a glass of water · ${n} of ${targets.water} today`, 'water');
      return;
    }
    if (a.href) router.push(a.href as Href);
  };

  const clear = () => {
    setConfirmClear(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTyping(false);
    clearChat();
    toast('Started a new chat', 'chatbubbles');
  };

  // While Saathi is "typing", hold back the reply that was already saved.
  const msgs = typing ? state.coachChat.slice(0, -1) : state.coachChat;

  const canSend = !!input.trim() && !typing;

  return (
    <Screen>
      {/* Header */}
      <View style={st.header}>
        <IconButton icon="arrow-back" bordered onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={st.headMid}>
          <View>
            <View style={st.avatar}>
              <Ionicons name="sparkles" size={18} color={C.ai} />
            </View>
            <View style={st.online} />
          </View>
          <View>
            <Text style={st.title}>Saathi · AI Coach</Text>
            <Text style={st.status}>{typing ? 'typing…' : 'Online · replies instantly'}</Text>
          </View>
        </View>
        <IconButton icon="refresh" bordered onPress={() => setConfirmClear(true)} />
      </View>

      {!isPremiumActive(state.premium) && (
        <PressableScale
          scaleTo={0.98}
          onPress={() => {
            tap();
            router.push('/plans');
          }}
          style={st.upsell}
          accessibilityRole="button">
          <View style={st.upsellIcon}>
            <Ionicons name="diamond" size={12} color={C.gold} />
          </View>
          <Text style={st.upsellText} numberOfLines={1}>
            Free preview · Unlimited Saathi with Fitora Smart
          </Text>
          <Text style={st.upsellCta}>Upgrade</Text>
        </PressableScale>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={st.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          <View style={st.dayPill}>
            <Text style={st.dayLabel}>TODAY</Text>
          </View>
          {msgs.map((m) =>
            m.from === 'user' ? (
              <Animated.View key={m.id} entering={BUBBLE_IN} layout={LIST} style={[st.bubble, st.user]}>
                <Text style={st.userText}>{m.text}</Text>
              </Animated.View>
            ) : (
              <Animated.View key={m.id} entering={BUBBLE_IN} layout={LIST} style={st.botRow}>
                <RiaAvatar />
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <View style={[st.bubble, st.bot]}>
                    <Text style={st.botText}>{m.text}</Text>
                  </View>
                  {m.action && (
                    <PressableScale
                      scaleTo={0.96}
                      onPress={() => {
                        tap();
                        runAction({ ...m.action!, icon: m.action!.icon as IconName });
                      }}
                      style={st.action}
                      accessibilityRole="button">
                      <Ionicons name={m.action.icon as IconName} size={16} color={C.ai} />
                      <Text style={st.actionText}>{m.action.label}</Text>
                      <Ionicons name="chevron-forward" size={14} color={C.ai} />
                    </PressableScale>
                  )}
                </View>
              </Animated.View>
            ),
          )}
          {typing && (
            <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} layout={LIST} style={st.botRow}>
              <RiaAvatar />
              <View style={[st.bubble, st.bot, st.typingBubble]}>
                <TypingDots />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipsBar} contentContainerStyle={st.chips} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <PressableScale key={s} scaleTo={0.95} onPress={() => send(s)} disabled={typing} style={[st.chip, typing && { opacity: 0.5 }]} accessibilityRole="button">
              <Ionicons name="sparkles" size={13} color={C.ai} />
              <Text style={st.chipText}>{s}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        <View style={[st.inputBar, { paddingBottom: kb ? 10 : Math.max(insets.bottom, 10) }]}>
          <View style={[st.inputWrap, focused && st.inputFocus]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask Saathi anything…"
              placeholderTextColor={C.muted}
              style={[st.input, webNoOutline]}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
              submitBehavior="submit"
              selectionColor={C.primary}
            />
          </View>
          <SendButton enabled={canSend} onPress={() => send(input)} />
        </View>
      </KeyboardAvoidingView>

      <Dialog
        visible={confirmClear}
        iconName="chatbubbles"
        title="Start a new chat?"
        text="This clears your conversation with Saathi."
        confirm="New chat"
        cancel="Cancel"
        onConfirm={clear}
        onCancel={() => setConfirmClear(false)}
      />
    </Screen>
  );
}

function RiaAvatar() {
  return (
    <View style={st.botAvatar}>
      <Ionicons name="sparkles" size={12} color={C.ai} />
    </View>
  );
}

/** Send button that fills with brand colour once there is something to send. */
function SendButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  const p = useSharedValue(enabled ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(enabled ? 1 : 0, { duration: MOTION.base }));
  }, [enabled, p]);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.border, C.primaryDark]),
    transform: [{ scale: interpolate(p.get(), [0, 1], [0.92, 1]) }],
  }));
  return (
    <PressableScale scaleTo={0.9} onPress={onPress} disabled={!enabled} accessibilityRole="button" accessibilityLabel="Send" accessibilityState={{ disabled: !enabled }}>
      <Animated.View style={[st.send, fill]}>
        <Ionicons name="arrow-up" size={22} color={C.white} />
      </Animated.View>
    </PressableScale>
  );
}

const DOT_CYCLE = 940;

function TypingDots() {
  const reduce = useReducedMotion();
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} still={reduce} />
      ))}
    </View>
  );
}

function Dot({ index, still }: { index: number; still: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) {
      v.set(0.5);
      return;
    }
    const lead = index * 150;
    v.set(
      withRepeat(
        withSequence(withTiming(0, { duration: lead }), withTiming(1, { duration: 260 }), withTiming(0, { duration: 260 }), withTiming(0, { duration: DOT_CYCLE - 520 - lead })),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(v);
  }, [index, still, v]);
  const style = useAnimatedStyle(() => ({ opacity: interpolate(v.get(), [0, 1], [0.35, 1]), transform: [{ translateY: interpolate(v.get(), [0, 1], [0, -4]) }] }));
  return <Animated.View style={[st.dot, style]} />;
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  headMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  online: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary, borderWidth: 2, borderColor: C.bg },
  title: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  status: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 1 },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.navy, marginHorizontal: 16, marginTop: 10, borderRadius: R.md, paddingHorizontal: 12, height: 42 },
  upsellIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(245,196,81,0.16)', alignItems: 'center', justifyContent: 'center' },
  upsellText: { flex: 1, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.86)' },
  upsellCta: { fontSize: 12, fontWeight: '800', color: C.gold },
  list: { padding: 16, gap: 12 },
  dayPill: { alignSelf: 'center', backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft },
  dayLabel: { ...T.tiny, textAlign: 'center', letterSpacing: 0.8 },
  bubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  user: { alignSelf: 'flex-end', backgroundColor: C.primaryDark, borderBottomRightRadius: 6 },
  userText: { color: C.white, fontSize: 15, lineHeight: 21 },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  botAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  bot: { backgroundColor: C.aiSoft, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: C.aiBorder, maxWidth: '96%' },
  botText: { color: C.text, fontSize: 15, lineHeight: 21 },
  typingBubble: { paddingVertical: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: C.card, borderRadius: R.pill, borderWidth: 1, borderColor: C.aiBorder, paddingLeft: 12, paddingRight: 10, height: 38 },
  actionText: { color: C.ai, fontWeight: '700', fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ai },
  chipsBar: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft, backgroundColor: C.card },
  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.aiBorder, backgroundColor: C.aiSoft },
  chipText: { fontSize: 13, fontWeight: '600', color: C.ai },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, backgroundColor: C.card },
  inputWrap: { flex: 1, height: 48, borderRadius: 24, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  inputFocus: { borderColor: C.primary, backgroundColor: C.card },
  input: { flex: 1, paddingHorizontal: 18, fontSize: 15, color: C.text },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
