export type Workout = {
  id: string;
  title: string;
  category: 'Yoga' | 'HIIT' | 'Strength' | 'Cardio' | 'Walking';
  minutes: number;
  kcal: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string;
  emoji: string;
  color: string;
  coach: string;
  description: string;
  exercises: { name: string; detail: string; seconds: number }[];
};

export const WORKOUTS: Workout[] = [
  {
    id: 'morning-yoga', title: 'Morning Yoga Flow', category: 'Yoga', minutes: 20, kcal: 90, level: 'Beginner', equipment: 'Yoga mat', emoji: '🧘', color: '#14B8A6', coach: 'Anjali R.',
    description: 'A gentle flow to wake up your body, improve flexibility and set a calm tone for the day.',
    exercises: [
      { name: 'Pranayama breathing', detail: '2 min', seconds: 120 },
      { name: 'Surya Namaskar', detail: '5 rounds', seconds: 300 },
      { name: 'Tadasana to Vrikshasana', detail: '2 min', seconds: 120 },
      { name: 'Bhujangasana', detail: '3 × 30 sec', seconds: 90 },
      { name: 'Balasana & Shavasana', detail: '4 min', seconds: 240 },
    ],
  },
  {
    id: 'fat-burn-hiit', title: 'Fat Burn HIIT', category: 'HIIT', minutes: 15, kcal: 180, level: 'Intermediate', equipment: 'No equipment', emoji: '🔥', color: '#F97316', coach: 'Rohit S.',
    description: 'Short, intense intervals that spike your heart rate and keep burning calories after you finish.',
    exercises: [
      { name: 'Jumping jacks', detail: '45 sec', seconds: 45 },
      { name: 'High knees', detail: '45 sec', seconds: 45 },
      { name: 'Burpees', detail: '40 sec', seconds: 40 },
      { name: 'Mountain climbers', detail: '45 sec', seconds: 45 },
      { name: 'Squat jumps', detail: '40 sec', seconds: 40 },
      { name: 'Plank hold', detail: '60 sec', seconds: 60 },
    ],
  },
  {
    id: 'full-body-strength', title: 'Full Body Strength', category: 'Strength', minutes: 30, kcal: 210, level: 'Intermediate', equipment: 'Dumbbells', emoji: '🏋️', color: '#7C3AED', coach: 'Vikram M.',
    description: 'Build lean muscle with compound movements that target every major muscle group.',
    exercises: [
      { name: 'Goblet squats', detail: '3 × 12', seconds: 180 },
      { name: 'Dumbbell rows', detail: '3 × 10 each', seconds: 180 },
      { name: 'Push-ups', detail: '3 × 12', seconds: 150 },
      { name: 'Romanian deadlift', detail: '3 × 10', seconds: 180 },
      { name: 'Shoulder press', detail: '3 × 10', seconds: 150 },
    ],
  },
  {
    id: 'brisk-walk', title: 'Brisk Walk', category: 'Walking', minutes: 30, kcal: 140, level: 'Beginner', equipment: 'None', emoji: '🚶', color: '#0EA472', coach: 'Self-paced',
    description: 'A steady, guided brisk walk. Perfect after meals to help control blood sugar.',
    exercises: [
      { name: 'Warm-up walk', detail: '5 min easy pace', seconds: 300 },
      { name: 'Brisk walk', detail: '20 min', seconds: 1200 },
      { name: 'Cool-down', detail: '5 min', seconds: 300 },
    ],
  },
  {
    id: 'dance-cardio', title: 'Bollywood Dance Cardio', category: 'Cardio', minutes: 25, kcal: 220, level: 'Beginner', equipment: 'None', emoji: '💃', color: '#EC4899', coach: 'Meera K.',
    description: 'Fun, high-energy dance moves set to upbeat music. You will not even notice you are working out.',
    exercises: [
      { name: 'Warm-up grooves', detail: '4 min', seconds: 240 },
      { name: 'Bhangra combo', detail: '6 min', seconds: 360 },
      { name: 'Garba steps', detail: '6 min', seconds: 360 },
      { name: 'Freestyle finale', detail: '5 min', seconds: 300 },
      { name: 'Stretch', detail: '4 min', seconds: 240 },
    ],
  },
  {
    id: 'core-blast', title: '10-min Core Blast', category: 'Strength', minutes: 10, kcal: 70, level: 'Beginner', equipment: 'Yoga mat', emoji: '💪', color: '#3B82F6', coach: 'Rohit S.',
    description: 'A quick core routine for a stronger back and better posture.',
    exercises: [
      { name: 'Crunches', detail: '40 sec', seconds: 40 },
      { name: 'Bicycle crunches', detail: '40 sec', seconds: 40 },
      { name: 'Leg raises', detail: '40 sec', seconds: 40 },
      { name: 'Russian twists', detail: '40 sec', seconds: 40 },
      { name: 'Plank', detail: '60 sec', seconds: 60 },
    ],
  },
  {
    id: 'power-yoga', title: 'Power Yoga', category: 'Yoga', minutes: 35, kcal: 200, level: 'Advanced', equipment: 'Yoga mat', emoji: '🤸', color: '#0D9488', coach: 'Anjali R.',
    description: 'A dynamic, strength-building yoga practice for experienced practitioners.',
    exercises: [
      { name: 'Sun salutation B', detail: '6 rounds', seconds: 480 },
      { name: 'Warrior sequence', detail: '8 min', seconds: 480 },
      { name: 'Arm balances', detail: '6 min', seconds: 360 },
      { name: 'Hip openers', detail: '6 min', seconds: 360 },
      { name: 'Shavasana', detail: '5 min', seconds: 300 },
    ],
  },
  {
    id: 'cycling', title: 'Indoor Cycling Intervals', category: 'Cardio', minutes: 30, kcal: 260, level: 'Advanced', equipment: 'Stationary bike', emoji: '🚴', color: '#E5484D', coach: 'Vikram M.',
    description: 'Interval-based ride alternating sprints and recovery for maximum calorie burn.',
    exercises: [
      { name: 'Warm-up spin', detail: '5 min', seconds: 300 },
      { name: 'Sprint intervals', detail: '8 × 30 sec', seconds: 480 },
      { name: 'Hill climb', detail: '8 min', seconds: 480 },
      { name: 'Cool-down', detail: '5 min', seconds: 300 },
    ],
  },
];

export const WORKOUT_CATEGORIES = ['All', 'Yoga', 'HIIT', 'Strength', 'Cardio', 'Walking'] as const;

export const workoutById = (id: string) => WORKOUTS.find((w) => w.id === id);

// Activities for manual logging: kcal per minute
export const ACTIVITIES = [
  { id: 'walking', label: 'Walking', emoji: '🚶', kcalPerMin: 4.5 },
  { id: 'running', label: 'Running', emoji: '🏃', kcalPerMin: 10 },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', kcalPerMin: 8 },
  { id: 'yoga', label: 'Yoga', emoji: '🧘', kcalPerMin: 4 },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', kcalPerMin: 9 },
  { id: 'badminton', label: 'Badminton', emoji: '🏸', kcalPerMin: 7 },
  { id: 'cricket', label: 'Cricket', emoji: '🏏', kcalPerMin: 5 },
  { id: 'gym', label: 'Gym workout', emoji: '🏋️', kcalPerMin: 6.5 },
];
