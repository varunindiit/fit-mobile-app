export type PlanTier = 'smart' | 'pro';

export const PLAN_TIERS: {
  id: PlanTier;
  name: string;
  tagline: string;
  color: string;
  features: string[];
  durations: { months: number; price: number; was: number; badge?: string }[];
}[] = [
  {
    id: 'smart',
    name: 'Fittelo Smart',
    tagline: 'AI-powered plan that adapts to you',
    color: '#27AD15',
    features: [
      'Unlimited Snap meal scans',
      'Saathi AI coach, 24×7',
      'Personalised meal & workout plans',
      'Smart insights on every meal',
      'Ad-free experience',
    ],
    durations: [
      { months: 3, price: 1799, was: 2999 },
      { months: 6, price: 2399, was: 4999, badge: 'Popular' },
      { months: 12, price: 2999, was: 7999, badge: 'Best value' },
    ],
  },
  {
    id: 'pro',
    name: 'Fittelo Pro',
    tagline: 'Your own expert nutritionist & trainer',
    color: '#7C3AED',
    features: [
      'Everything in Smart',
      'Dedicated certified nutritionist',
      'Personal fitness trainer',
      'Weekly 1-on-1 video check-ins',
      'Custom plans for diabetes, PCOS & thyroid',
    ],
    durations: [
      { months: 3, price: 8999, was: 12999 },
      { months: 6, price: 13999, was: 21999, badge: 'Popular' },
      { months: 12, price: 19999, was: 34999, badge: 'Best value' },
    ],
  },
];

export const COACHES = [
  { name: 'Dr. Kavya Iyer', role: 'Clinical Nutritionist', exp: '9 yrs', rating: 4.9, emoji: '👩‍⚕️' },
  { name: 'Arjun Mehta', role: 'Fitness Trainer', exp: '7 yrs', rating: 4.8, emoji: '🏋️‍♂️' },
  { name: 'Sneha Kulkarni', role: 'Diabetes Educator', exp: '11 yrs', rating: 4.9, emoji: '👩‍🔬' },
];

export const TESTIMONIALS = [
  { name: 'Priya, 31', text: 'Lost 9 kg in 4 months without giving up rotis!', kg: '-9 kg' },
  { name: 'Rahul, 38', text: 'My HbA1c went from 7.8 to 6.2 with my coach.', kg: '-12 kg' },
  { name: 'Neha, 26', text: 'Snap made logging meals effortless.', kg: '-6 kg' },
];

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');
