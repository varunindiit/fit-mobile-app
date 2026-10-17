/**
 * Pro personal trainers.
 *
 * Mock data, deliberately kept in one place and shaped like an API response so the
 * screens can be pointed at a real endpoint later without touching their layout.
 * These are fictional people: there are no licensed photographs of real trainers in
 * the app, so every surface renders an initials avatar, never a stock portrait
 * presented as the user's coach.
 */
import type { IconName } from '@/components/ui';

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type Certification = { title: string; body: string; year: number };

export type Trainer = {
  id: string;
  name: string;
  /** Headline role, e.g. "Strength & Conditioning Coach". */
  role: string;
  /** What they are known for — shown as chips. */
  specialities: string[];
  years: number;
  rating: number;
  reviews: number;
  /** Members they currently coach — used for the "limited slots" feel. */
  clients: number;
  city: string;
  languages: string[];
  intro: string;
  certifications: Certification[];
  /**
   * Portrait for this coach. These are generated images of fictional people (see
   * assets/images/CREDITS.md) — never a photograph of a real person presented as
   * the member's coach. Optional: a trainer without one falls back to initials.
   */
  photo?: number;
  /** Brand accent for this trainer's surfaces. */
  color: string;
  icon: IconName;
  /** Working hours per weekday, empty when they are off. */
  hours: Record<Weekday, string[]>;
  /** Minutes the trainer usually takes to answer a message. */
  replyMins: number;
};

export const TRAINERS: Trainer[] = [
  {
    id: 'arjun-mehta',
    name: 'Arjun Mehta',
    role: 'Strength & Conditioning Coach',
    specialities: ['Fat loss', 'Core strength', 'Home workouts', 'Beginners'],
    years: 7,
    rating: 4.8,
    reviews: 412,
    clients: 38,
    city: 'Pune',
    languages: ['English', 'Hindi', 'Marathi'],
    intro:
      "I coach people who train at home with almost no equipment. We start from where you actually are, fix your form first, and add load only once the movement is clean. Expect short sessions, honest feedback and a plan you can keep up on a busy week.",
    certifications: [
      { title: 'Certified Strength & Conditioning Specialist', body: 'NSCA', year: 2019 },
      { title: 'Level 2 Personal Trainer', body: 'ACE', year: 2017 },
      { title: 'Functional Movement Screen L1', body: 'FMS', year: 2021 },
    ],
    photo: require('@/assets/images/trainers/arjun-mehta.webp'),
    color: '#2563EB',
    icon: 'barbell',
    hours: {
      Mon: ['07:00', '08:00', '18:00', '19:00'],
      Tue: ['07:00', '18:00', '19:00'],
      Wed: ['07:00', '08:00', '18:00'],
      Thu: ['07:00', '18:00', '19:00'],
      Fri: ['07:00', '08:00', '17:00'],
      Sat: ['09:00', '10:00'],
      Sun: [],
    },
    replyMins: 12,
  },
  {
    id: 'kavya-iyer',
    name: 'Kavya Iyer',
    role: 'Mobility & Rehab Coach',
    specialities: ['Posture', 'Back care', 'Mobility', 'Post-natal'],
    years: 9,
    rating: 4.9,
    reviews: 587,
    clients: 31,
    city: 'Bengaluru',
    languages: ['English', 'Hindi', 'Tamil'],
    intro:
      'Most people I work with sit at a desk all day and feel it in their back and hips. We rebuild range of motion first, then strength. Sessions are calm, precise and built around what your body can do today.',
    certifications: [
      { title: 'Clinical Exercise Physiologist', body: 'ACSM', year: 2016 },
      { title: 'Yoga Therapy, 500h', body: 'Yoga Alliance', year: 2018 },
    ],
    color: '#7C3AED',
    icon: 'body',
    hours: {
      Mon: ['06:30', '07:30', '17:30'],
      Tue: ['06:30', '17:30', '18:30'],
      Wed: ['06:30', '07:30', '17:30'],
      Thu: ['06:30', '17:30'],
      Fri: ['06:30', '07:30', '17:30', '18:30'],
      Sat: [],
      Sun: ['09:00', '10:00'],
    },
    replyMins: 20,
  },
  {
    id: 'rohit-shetty',
    name: 'Rohit Shetty',
    role: 'HIIT & Endurance Coach',
    specialities: ['HIIT', 'Conditioning', 'Athletic performance', 'Advanced'],
    years: 11,
    rating: 4.7,
    reviews: 903,
    clients: 44,
    city: 'Mumbai',
    languages: ['English', 'Hindi'],
    intro:
      'I train people who already have a base and want to get genuinely fitter. Intervals, tempo work and honest progression. If you want someone to push you and hold you to it, we will get on well.',
    certifications: [
      { title: 'Certified Personal Trainer', body: 'NASM', year: 2014 },
      { title: 'Performance Enhancement Specialist', body: 'NASM', year: 2019 },
      { title: 'First Aid & CPR', body: 'Red Cross', year: 2024 },
    ],
    color: '#E5484D',
    icon: 'flash',
    hours: {
      Mon: ['06:00', '07:00', '20:00'],
      Tue: ['06:00', '20:00', '21:00'],
      Wed: ['06:00', '07:00', '20:00'],
      Thu: ['06:00', '20:00'],
      Fri: ['06:00', '07:00', '20:00'],
      Sat: ['08:00', '09:00', '10:00'],
      Sun: [],
    },
    replyMins: 35,
  },
];

export const DEFAULT_TRAINER_ID = TRAINERS[0].id;

export const trainerById = (id: string | null | undefined): Trainer => TRAINERS.find((t) => t.id === id) ?? TRAINERS[0];

export const firstName = (t: Trainer) => t.name.split(' ')[0];

/** Today's weekday key, matching `Trainer.hours`. */
export const weekdayOf = (d = new Date()): Weekday => WEEKDAYS[(d.getDay() + 6) % 7];

export type Availability = {
  /** The trainer is inside a working hour right now. */
  online: boolean;
  /** Short status line: "Online now", "Back at 18:00", "Off today". */
  label: string;
  /** Remaining slots for today. */
  todaySlots: string[];
  /** Next slot as `{ day, time }`, or null when nothing is scheduled this week. */
  next: { day: Weekday; time: string } | null;
};

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Whether the trainer is working right now, and when they are next free.
 * A slot counts as "online" for the hour it starts.
 */
export function availability(t: Trainer, now = new Date()): Availability {
  const today = weekdayOf(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const slots = t.hours[today] ?? [];
  const online = slots.some((s) => mins >= minutes(s) && mins < minutes(s) + 60);
  const todaySlots = slots.filter((s) => minutes(s) > mins);

  let next: Availability['next'] = todaySlots.length ? { day: today, time: todaySlots[0] } : null;
  if (!next) {
    const start = WEEKDAYS.indexOf(today);
    for (let i = 1; i <= 7 && !next; i++) {
      const day = WEEKDAYS[(start + i) % 7];
      const first = (t.hours[day] ?? [])[0];
      if (first) next = { day, time: first };
    }
  }

  const label = online
    ? 'Online now'
    : todaySlots.length
      ? `Back at ${todaySlots[0]}`
      : next
        ? `Next on ${next.day} at ${next.time}`
        : 'Off this week';
  return { online, label, todaySlots, next };
}

/** Upcoming one-to-one sessions the trainer has booked with this member. */
export type BookedSession = {
  id: string;
  /** Days from today. */
  inDays: number;
  time: string;
  minutes: number;
  kind: 'video' | 'audio';
  topic: string;
};

export const BOOKED_SESSIONS: Record<string, BookedSession[]> = {
  'arjun-mehta': [
    { id: 'bs1', inDays: 0, time: '19:00', minutes: 30, kind: 'video', topic: 'Form check — push-ups & plank' },
    { id: 'bs2', inDays: 3, time: '07:00', minutes: 20, kind: 'audio', topic: 'Week 2 check-in' },
    { id: 'bs3', inDays: 7, time: '18:00', minutes: 45, kind: 'video', topic: 'Plan review & progression' },
  ],
  'kavya-iyer': [
    { id: 'bs1', inDays: 1, time: '06:30', minutes: 30, kind: 'video', topic: 'Hip mobility assessment' },
    { id: 'bs2', inDays: 4, time: '17:30', minutes: 20, kind: 'audio', topic: 'Desk posture habits' },
  ],
  'rohit-shetty': [
    { id: 'bs1', inDays: 0, time: '20:00', minutes: 45, kind: 'video', topic: 'Interval technique' },
    { id: 'bs2', inDays: 2, time: '06:00', minutes: 30, kind: 'audio', topic: 'Conditioning block review' },
  ],
};

export const bookedFor = (trainerId: string) => BOOKED_SESSIONS[trainerId] ?? BOOKED_SESSIONS[DEFAULT_TRAINER_ID];
