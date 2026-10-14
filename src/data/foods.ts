export type Food = {
  id: string;
  name: string;
  emoji: string;
  category: 'Breakfast' | 'Meals' | 'Breads & Rice' | 'Snacks' | 'Fruits' | 'Beverages' | 'Protein' | 'Sweets';
  unit: string; // e.g. "1 katori (150 g)"
  kcal: number; // per unit
  protein: number; // g per unit
  carbs: number;
  fat: number;
  fiber: number;
  type: 'veg' | 'egg' | 'nonveg';
  score: number; // health score out of 10
  note?: string;
};

export const FOODS: Food[] = [
  { id: 'poha', name: 'Poha', emoji: '🍛', category: 'Breakfast', unit: '1 plate (180 g)', kcal: 270, protein: 5.4, carbs: 46, fat: 7.2, fiber: 2.8, type: 'veg', score: 7, note: 'Light, iron-rich breakfast. Add peanuts for protein.' },
  { id: 'idli', name: 'Idli', emoji: '🍥', category: 'Breakfast', unit: '1 piece (40 g)', kcal: 58, protein: 2, carbs: 12, fat: 0.2, fiber: 0.6, type: 'veg', score: 8, note: 'Fermented and easy to digest.' },
  { id: 'masala-dosa', name: 'Masala Dosa', emoji: '🌯', category: 'Breakfast', unit: '1 piece (160 g)', kcal: 387, protein: 7.5, carbs: 54, fat: 15.6, fiber: 3.2, type: 'veg', score: 5 },
  { id: 'upma', name: 'Rava Upma', emoji: '🥣', category: 'Breakfast', unit: '1 katori (150 g)', kcal: 250, protein: 5.8, carbs: 38, fat: 8.4, fiber: 2.4, type: 'veg', score: 6 },
  { id: 'aloo-paratha', name: 'Aloo Paratha', emoji: '🫓', category: 'Breakfast', unit: '1 piece (120 g)', kcal: 290, protein: 6.2, carbs: 41, fat: 11, fiber: 3.5, type: 'veg', score: 4, note: 'High in refined carbs and fat. Pair with curd.' },
  { id: 'oats', name: 'Oats Porridge with Milk', emoji: '🥣', category: 'Breakfast', unit: '1 bowl (250 g)', kcal: 245, protein: 10.4, carbs: 36, fat: 6.5, fiber: 4.6, type: 'veg', score: 9, note: 'Great source of soluble fibre.' },
  { id: 'boiled-egg', name: 'Boiled Egg', emoji: '🥚', category: 'Protein', unit: '1 egg (50 g)', kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, type: 'egg', score: 9, note: 'Complete protein with all essential amino acids.' },
  { id: 'omelette', name: 'Masala Omelette', emoji: '🍳', category: 'Breakfast', unit: '2 eggs (120 g)', kcal: 210, protein: 13, carbs: 3, fat: 16, fiber: 0.6, type: 'egg', score: 7 },
  { id: 'bread-toast', name: 'Brown Bread Toast', emoji: '🍞', category: 'Breakfast', unit: '1 slice (30 g)', kcal: 75, protein: 3, carbs: 13, fat: 1, fiber: 2, type: 'veg', score: 6 },
  { id: 'dal', name: 'Dal Tadka', emoji: '🍲', category: 'Meals', unit: '1 katori (150 g)', kcal: 180, protein: 9, carbs: 24, fat: 5.4, fiber: 5.2, type: 'veg', score: 8, note: 'Good plant protein and fibre.' },
  { id: 'rajma', name: 'Rajma Masala', emoji: '🫘', category: 'Meals', unit: '1 katori (150 g)', kcal: 210, protein: 10, carbs: 27, fat: 6.6, fiber: 7.5, type: 'veg', score: 8 },
  { id: 'chole', name: 'Chole', emoji: '🥘', category: 'Meals', unit: '1 katori (150 g)', kcal: 240, protein: 10.5, carbs: 30, fat: 8.8, fiber: 8, type: 'veg', score: 7 },
  { id: 'paneer-bhurji', name: 'Paneer Bhurji', emoji: '🧀', category: 'Protein', unit: '1 katori (120 g)', kcal: 290, protein: 17, carbs: 6, fat: 22, fiber: 1.2, type: 'veg', score: 7 },
  { id: 'palak-paneer', name: 'Palak Paneer', emoji: '🥬', category: 'Meals', unit: '1 katori (150 g)', kcal: 260, protein: 12, carbs: 9, fat: 19, fiber: 3, type: 'veg', score: 7 },
  { id: 'mix-veg', name: 'Mixed Veg Sabzi', emoji: '🥗', category: 'Meals', unit: '1 katori (150 g)', kcal: 130, protein: 3.5, carbs: 14, fat: 7, fiber: 4.5, type: 'veg', score: 8 },
  { id: 'chicken-curry', name: 'Chicken Curry', emoji: '🍗', category: 'Meals', unit: '1 katori (180 g)', kcal: 300, protein: 26, carbs: 8, fat: 18, fiber: 1.5, type: 'nonveg', score: 7 },
  { id: 'grilled-chicken', name: 'Grilled Chicken Breast', emoji: '🍗', category: 'Protein', unit: '100 g', kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, type: 'nonveg', score: 9, note: 'Lean, high-quality protein.' },
  { id: 'fish-curry', name: 'Fish Curry', emoji: '🐟', category: 'Meals', unit: '1 katori (180 g)', kcal: 240, protein: 24, carbs: 6, fat: 13, fiber: 1, type: 'nonveg', score: 8 },
  { id: 'egg-curry', name: 'Egg Curry', emoji: '🍛', category: 'Meals', unit: '1 katori (2 eggs)', kcal: 260, protein: 14, carbs: 8, fat: 19, fiber: 1.8, type: 'egg', score: 7 },
  { id: 'chicken-biryani', name: 'Chicken Biryani', emoji: '🍚', category: 'Meals', unit: '1 plate (300 g)', kcal: 520, protein: 24, carbs: 62, fat: 19, fiber: 2.5, type: 'nonveg', score: 4, note: 'Calorie dense. Keep the portion small.' },
  { id: 'veg-pulao', name: 'Veg Pulao', emoji: '🍚', category: 'Breads & Rice', unit: '1 katori (150 g)', kcal: 210, protein: 4.5, carbs: 36, fat: 5.5, fiber: 2.2, type: 'veg', score: 6 },
  { id: 'rice', name: 'Steamed Rice', emoji: '🍚', category: 'Breads & Rice', unit: '1 katori (150 g)', kcal: 195, protein: 4, carbs: 43, fat: 0.4, fiber: 0.6, type: 'veg', score: 6 },
  { id: 'brown-rice', name: 'Brown Rice', emoji: '🍚', category: 'Breads & Rice', unit: '1 katori (150 g)', kcal: 165, protein: 3.8, carbs: 34, fat: 1.3, fiber: 2.7, type: 'veg', score: 8 },
  { id: 'roti', name: 'Phulka / Roti', emoji: '🫓', category: 'Breads & Rice', unit: '1 piece (35 g)', kcal: 85, protein: 3, carbs: 17, fat: 0.5, fiber: 2.4, type: 'veg', score: 8 },
  { id: 'butter-naan', name: 'Butter Naan', emoji: '🫓', category: 'Breads & Rice', unit: '1 piece (90 g)', kcal: 290, protein: 8, carbs: 45, fat: 8.5, fiber: 2, type: 'veg', score: 3 },
  { id: 'curd', name: 'Curd (Dahi)', emoji: '🥛', category: 'Protein', unit: '1 katori (100 g)', kcal: 60, protein: 3.5, carbs: 4.7, fat: 3.1, fiber: 0, type: 'veg', score: 9, note: 'Probiotic, great for gut health.' },
  { id: 'greek-yogurt', name: 'Greek Yogurt', emoji: '🥛', category: 'Protein', unit: '1 cup (150 g)', kcal: 130, protein: 15, carbs: 6, fat: 4.5, fiber: 0, type: 'veg', score: 9 },
  { id: 'sprouts', name: 'Sprouts Salad', emoji: '🥗', category: 'Snacks', unit: '1 bowl (120 g)', kcal: 120, protein: 8, carbs: 18, fat: 1.5, fiber: 6, type: 'veg', score: 10, note: 'Excellent high-protein, high-fibre snack.' },
  { id: 'green-salad', name: 'Green Salad', emoji: '🥗', category: 'Snacks', unit: '1 bowl (150 g)', kcal: 45, protein: 2, carbs: 8, fat: 0.4, fiber: 3, type: 'veg', score: 10 },
  { id: 'samosa', name: 'Samosa', emoji: '🥟', category: 'Snacks', unit: '1 piece (70 g)', kcal: 262, protein: 3.5, carbs: 24, fat: 17, fiber: 2, type: 'veg', score: 2, note: 'Deep-fried. An occasional treat.' },
  { id: 'dhokla', name: 'Khaman Dhokla', emoji: '🟨', category: 'Snacks', unit: '2 pieces (80 g)', kcal: 130, protein: 5, carbs: 20, fat: 3.5, fiber: 1.5, type: 'veg', score: 7 },
  { id: 'makhana', name: 'Roasted Makhana', emoji: '🍿', category: 'Snacks', unit: '1 cup (25 g)', kcal: 90, protein: 2.4, carbs: 19, fat: 0.5, fiber: 3.6, type: 'veg', score: 9 },
  { id: 'peanuts', name: 'Roasted Peanuts', emoji: '🥜', category: 'Snacks', unit: '1 handful (30 g)', kcal: 170, protein: 7.5, carbs: 5, fat: 14, fiber: 2.5, type: 'veg', score: 7 },
  { id: 'almonds', name: 'Almonds', emoji: '🌰', category: 'Snacks', unit: '10 pieces (12 g)', kcal: 70, protein: 2.5, carbs: 2.5, fat: 6, fiber: 1.5, type: 'veg', score: 9 },
  { id: 'biscuits', name: 'Marie Biscuits', emoji: '🍪', category: 'Snacks', unit: '4 pieces (28 g)', kcal: 125, protein: 2, carbs: 21, fat: 3.5, fiber: 0.5, type: 'veg', score: 3 },
  { id: 'banana', name: 'Banana', emoji: '🍌', category: 'Fruits', unit: '1 medium (118 g)', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, type: 'veg', score: 8 },
  { id: 'apple', name: 'Apple', emoji: '🍎', category: 'Fruits', unit: '1 medium (180 g)', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, type: 'veg', score: 9 },
  { id: 'papaya', name: 'Papaya', emoji: '🥭', category: 'Fruits', unit: '1 bowl (150 g)', kcal: 65, protein: 0.7, carbs: 16, fat: 0.4, fiber: 2.5, type: 'veg', score: 9 },
  { id: 'mango', name: 'Mango', emoji: '🥭', category: 'Fruits', unit: '1 cup (165 g)', kcal: 100, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, type: 'veg', score: 7 },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', category: 'Fruits', unit: '1 bowl (150 g)', kcal: 45, protein: 0.9, carbs: 11, fat: 0.2, fiber: 0.6, type: 'veg', score: 8 },
  { id: 'masala-chai', name: 'Masala Chai', emoji: '☕', category: 'Beverages', unit: '1 cup (150 ml)', kcal: 95, protein: 2.5, carbs: 13, fat: 3.5, fiber: 0, type: 'veg', score: 5, note: 'Try reducing sugar to cut calories.' },
  { id: 'black-coffee', name: 'Black Coffee', emoji: '☕', category: 'Beverages', unit: '1 cup (200 ml)', kcal: 5, protein: 0.3, carbs: 0, fat: 0, fiber: 0, type: 'veg', score: 8 },
  { id: 'green-tea', name: 'Green Tea', emoji: '🍵', category: 'Beverages', unit: '1 cup (200 ml)', kcal: 2, protein: 0, carbs: 0, fat: 0, fiber: 0, type: 'veg', score: 10 },
  { id: 'buttermilk', name: 'Buttermilk (Chaas)', emoji: '🥛', category: 'Beverages', unit: '1 glass (250 ml)', kcal: 60, protein: 3, carbs: 5, fat: 3, fiber: 0, type: 'veg', score: 9 },
  { id: 'lassi', name: 'Sweet Lassi', emoji: '🥤', category: 'Beverages', unit: '1 glass (250 ml)', kcal: 220, protein: 7, carbs: 34, fat: 6, fiber: 0, type: 'veg', score: 4 },
  { id: 'coconut-water', name: 'Coconut Water', emoji: '🥥', category: 'Beverages', unit: '1 glass (250 ml)', kcal: 45, protein: 0.5, carbs: 9, fat: 0.5, fiber: 2.6, type: 'veg', score: 9 },
  { id: 'whey', name: 'Whey Protein Shake', emoji: '🥤', category: 'Protein', unit: '1 scoop (30 g)', kcal: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, type: 'veg', score: 8 },
  { id: 'gulab-jamun', name: 'Gulab Jamun', emoji: '🍡', category: 'Sweets', unit: '1 piece (40 g)', kcal: 150, protein: 2, carbs: 22, fat: 6, fiber: 0.2, type: 'veg', score: 1, note: 'High in sugar. Enjoy mindfully.' },
  { id: 'kheer', name: 'Rice Kheer', emoji: '🍮', category: 'Sweets', unit: '1 katori (150 g)', kcal: 250, protein: 6, carbs: 38, fat: 8, fiber: 0.3, type: 'veg', score: 3 },
  { id: 'dark-chocolate', name: 'Dark Chocolate (70%)', emoji: '🍫', category: 'Sweets', unit: '2 squares (20 g)', kcal: 115, protein: 1.5, carbs: 9, fat: 8.5, fiber: 2.2, type: 'veg', score: 6 },
];

export const FOOD_CATEGORIES = ['All', 'Breakfast', 'Meals', 'Breads & Rice', 'Protein', 'Snacks', 'Fruits', 'Beverages', 'Sweets'] as const;

export const POPULAR_IDS = ['roti', 'dal', 'rice', 'masala-chai', 'poha', 'boiled-egg', 'curd', 'banana', 'idli', 'chicken-curry'];

export const foodById = (id: string) => FOODS.find((f) => f.id === id);

export type MealKey = 'breakfast' | 'morningSnack' | 'lunch' | 'eveningSnack' | 'dinner';

export const MEALS: { key: MealKey; label: string; icon: string; share: number; time: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', share: 0.25, time: '8:00 AM' },
  { key: 'morningSnack', label: 'Morning Snack', icon: 'cafe-outline', share: 0.1, time: '11:00 AM' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline', share: 0.3, time: '1:30 PM' },
  { key: 'eveningSnack', label: 'Evening Snack', icon: 'nutrition-outline', share: 0.1, time: '5:00 PM' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline', share: 0.25, time: '8:30 PM' },
];

export const mealLabel = (k: string) => MEALS.find((m) => m.key === k)?.label ?? 'Meal';

// Simulated "Snap" photo recognitions
export const SNAP_SAMPLES: { title: string; items: { foodId: string; qty: number }[] }[] = [
  { title: 'Home-style thali', items: [{ foodId: 'roti', qty: 2 }, { foodId: 'dal', qty: 1 }, { foodId: 'mix-veg', qty: 1 }, { foodId: 'rice', qty: 0.5 }, { foodId: 'green-salad', qty: 1 }] },
  { title: 'South Indian breakfast', items: [{ foodId: 'idli', qty: 3 }, { foodId: 'masala-chai', qty: 1 }] },
  { title: 'Protein bowl', items: [{ foodId: 'grilled-chicken', qty: 1.5 }, { foodId: 'brown-rice', qty: 1 }, { foodId: 'green-salad', qty: 1 }] },
];
