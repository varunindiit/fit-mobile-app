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
      { months: 3, price: 17.99, was: 29.99 },
      { months: 6, price: 23.99, was: 49.99, badge: 'Popular' },
      { months: 12, price: 29.99, was: 79.99, badge: 'Best value' },
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
      { months: 3, price: 89.99, was: 129.99 },
      { months: 6, price: 139.99, was: 219.99, badge: 'Popular' },
      { months: 12, price: 199.99, was: 349.99, badge: 'Best value' },
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

/** USD price label: whole dollars stay clean ($30), cents show two digits ($17.99). */
export const formatUSD = (n: number) => {
  const v = Math.round(n * 100) / 100;
  const [whole, cents] = (Number.isInteger(v) ? String(v) : v.toFixed(2)).split('.');
  return '$' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (cents ? '.' + cents : '');
};
