import { describe, expect, it } from '@jest/globals';

import { foodById, MEALS } from '@/data/foods';
import { addDays, targets, todayKey } from '../calc';
import { DEMO_DAYS, demoSeed } from '../demo';
import { DEFAULT_PROFILE, dayTotals } from '../store';

const profile = { ...DEFAULT_PROFILE, goal: 'lose' as const, weightKg: 70, targetKg: 62, pace: 0.5, diet: 'Non-vegetarian', restDays: ['Sunday'] };
const t = targets(profile);
const today = todayKey();
const days = Array.from({ length: DEMO_DAYS }, (_, i) => addDays(today, i - (DEMO_DAYS - 1)));

describe('demo history', () => {
  const d = demoSeed(profile, today);

  it('logs every one of the last 30 days', () => {
    expect(new Set(d.entries.map((e) => e.date)).size).toBe(DEMO_DAYS);
    expect(d.entries.every((e) => e.qty > 0 && foodById(e.foodId))).toBe(true);
    expect(Object.keys(d.water)).toHaveLength(DEMO_DAYS);
    expect(Object.keys(d.steps)).toHaveLength(DEMO_DAYS);
  });

  it('fills past days with all five meals, close to the calorie budget', () => {
    const past = days.slice(0, DEMO_DAYS - 1);
    for (const k of past) {
      const { total, byMeal } = dayTotals(d.entries, k);
      expect(Object.keys(byMeal).length).toBeGreaterThanOrEqual(4);
      expect(total.kcal).toBeGreaterThan(t.budget * 0.7);
      expect(total.kcal).toBeLessThan(t.budget * 1.4);
      expect(d.water[k]).toBeGreaterThanOrEqual(5);
      expect(d.steps[k]).toBeGreaterThan(t.stepGoal * 0.5);
    }
    // Some days land over budget, so the charts aren't a flat line.
    expect(past.some((k) => dayTotals(d.entries, k).total.kcal > t.budget)).toBe(true);
  });

  it('leaves today half done: morning meals only, half the water and steps', () => {
    const { total, byMeal } = dayTotals(d.entries, today);
    expect(Object.keys(byMeal).sort()).toEqual(['breakfast', 'lunch', 'morningSnack']);
    expect(total.kcal).toBeGreaterThan(t.budget * 0.38);
    expect(total.kcal).toBeLessThan(t.budget * 0.62);
    expect(d.water[today]).toBe(Math.round(t.water / 2));
    expect(d.steps[today]).toBe(Math.round((t.stepGoal * 0.5) / 100) * 100);
    expect(d.workouts.some((w) => w.date === today)).toBe(false);
  });

  it('builds a training history and program progress', () => {
    expect(d.workouts.length).toBeGreaterThan(12);
    expect(d.workouts.every((w) => w.minutes > 0 && w.kcal > 0 && days.includes(w.date))).toBe(true);
    // Newest first, like the store's own logs.
    expect(d.workouts[0].date >= d.workouts[d.workouts.length - 1].date).toBe(true);
    expect(d.programProgress.belly).toBeGreaterThan(0);
    // Sunday is a rest day in this profile.
    expect(d.workouts.some((w) => new Date(`${w.date}T00:00:00`).getDay() === 0)).toBe(false);
  });

  it('weighs in from the starting weight down to the weight given at sign-up', () => {
    expect(d.weights.length).toBeGreaterThan(8);
    expect(d.weights.map((w) => w.date)).toEqual([...d.weights.map((w) => w.date)].sort());
    expect(d.weights.at(-1)).toMatchObject({ date: today, kg: 70 });
    expect(d.startWeightKg).toBeGreaterThan(70); // losing weight, so 30 days ago was heavier
  });

  it('keeps snapped meals in step with the diary entries', () => {
    expect(d.snaps.length).toBeGreaterThan(2);
    for (const snap of d.snaps) {
      const linked = d.entries.filter((e) => e.snapId === snap.id);
      expect(linked.map((e) => ({ foodId: e.foodId, qty: e.qty }))).toEqual(snap.items);
      expect(snap.kcal).toBeGreaterThan(0);
    }
  });

  it('respects a vegetarian or vegan diet', () => {
    const veg = demoSeed({ ...profile, diet: 'Vegetarian' }, today);
    expect(veg.entries.every((e) => foodById(e.foodId)?.type === 'veg')).toBe(true);
    const vegan = demoSeed({ ...profile, diet: 'Vegan' }, today);
    const dairy = ['curd', 'greek-yogurt', 'buttermilk', 'lassi', 'masala-chai', 'paneer-bhurji', 'palak-paneer', 'whey'];
    expect(vegan.entries.some((e) => dairy.includes(e.foodId))).toBe(false);
  });

  it('scales with the user: a bigger budget means bigger plates', () => {
    const big = demoSeed({ ...profile, goal: 'gain', gender: 'male', weightKg: 85, targetKg: 92, heightCm: 180, activity: 'very' }, today);
    const yesterday = addDays(today, -1);
    expect(dayTotals(big.entries, yesterday).total.kcal).toBeGreaterThan(dayTotals(d.entries, yesterday).total.kcal);
    expect(big.startWeightKg).toBeLessThan(85); // gaining, so 30 days ago was lighter
  });

  it('covers every meal slot across the month', () => {
    const slots = new Set(d.entries.map((e) => e.meal));
    expect([...slots].sort()).toEqual(MEALS.map((m) => m.key).sort());
  });
});
