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
      'All 30 program days',
      'Full workout & class library',
      'Complete progress analytics',
      'Customise any workout',
      'Saathi AI coach, 24×7',
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
    tagline: 'Your own personal trainer',
    color: '#7C3AED',
    features: [
      'Everything in Smart',
      'Personal trainer & coaching dashboard',
      'Trainer chat, audio & video calls',
      'Workouts written by your trainer',
      'Real-athlete exercise videos',
    ],
    durations: [
      { months: 3, price: 89.99, was: 129.99 },
      { months: 6, price: 139.99, was: 219.99, badge: 'Popular' },
      { months: 12, price: 199.99, was: 349.99, badge: 'Best value' },
    ],
  },
];

/** USD price label: whole dollars stay clean ($30), cents show two digits ($17.99). */
export const formatUSD = (n: number) => {
  const v = Math.round(n * 100) / 100;
  const [whole, cents] = (Number.isInteger(v) ? String(v) : v.toFixed(2)).split('.');
  return '$' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (cents ? '.' + cents : '');
};
