export type Notif = { id: string; icon: string; title: string; body: string; time: string; route: string };

export const NOTIFICATIONS: Notif[] = [
  { id: 'n1', icon: '🍳', title: 'Time for breakfast', body: 'Log your breakfast to stay on track with your calorie budget.', time: '8:05 AM', route: '/food-search?meal=breakfast' },
  { id: 'n2', icon: '💧', title: 'Hydration check', body: 'You are 5 glasses away from your water goal. Drink up!', time: '10:30 AM', route: '/(tabs)' },
  { id: 'n3', icon: '✨', title: 'Saathi has a tip for you', body: 'Swap your evening samosa for roasted makhana and save ~170 kcal.', time: 'Yesterday', route: '/coach' },
  { id: 'n4', icon: '🏆', title: 'New streak: 3 days!', body: 'You logged all your meals 3 days in a row. Keep it going.', time: 'Yesterday', route: '/diary' },
  { id: 'n5', icon: '⚖️', title: 'Weekly weigh-in', body: 'It has been 7 days since your last weigh-in. Log your weight.', time: '2 days ago', route: '/progress' },
  { id: 'n6', icon: '👑', title: 'Fitora Pro: 40% off', body: 'Get a personal nutritionist and trainer. Offer ends Sunday.', time: '3 days ago', route: '/plans' },
];
