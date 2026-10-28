export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Profile = {
  sex: Sex;
  age: number;
  height: number; // cm
  weight: number; // kg
  activity: Activity;
  goal: Goal;
};

export type Macros = { kcal: number; protein: number; fat: number; carbs: number };

export type Targets = Macros & { bmr: number; tdee: number; water: number };

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Сніданок' },
  { key: 'lunch', label: 'Обід' },
  { key: 'dinner', label: 'Вечеря' },
  { key: 'snack', label: 'Перекус' },
];

export const ACTIVITY: { key: Activity; label: string; hint: string; factor: number }[] = [
  { key: 'sedentary', label: 'Мінімальна', hint: 'Сидяча робота, без тренувань', factor: 1.2 },
  { key: 'light', label: 'Низька', hint: 'Тренування 1–3 рази на тиждень', factor: 1.375 },
  { key: 'moderate', label: 'Середня', hint: 'Тренування 3–5 разів на тиждень', factor: 1.55 },
  { key: 'high', label: 'Висока', hint: 'Тренування 6–7 разів на тиждень', factor: 1.725 },
  { key: 'extreme', label: 'Дуже висока', hint: 'Фізична робота або 2 тренування на день', factor: 1.9 },
];

export const GOALS: { key: Goal; label: string; factor: number }[] = [
  { key: 'lose', label: 'Схуднути', factor: 0.85 },
  { key: 'maintain', label: 'Підтримка', factor: 1 },
  { key: 'gain', label: 'Набрати', factor: 1.1 },
];

/** Basal metabolic rate, Mifflin–St Jeor equation. */
export function mifflinStJeor({ sex, age, height, weight }: Profile) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
}

export function calcTargets(p: Profile): Targets {
  const bmr = mifflinStJeor(p);
  const activity = ACTIVITY.find((a) => a.key === p.activity)?.factor ?? 1.2;
  const goal = GOALS.find((g) => g.key === p.goal)?.factor ?? 1;
  const tdee = bmr * activity;
  const minKcal = p.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(minKcal, Math.round((tdee * goal) / 10) * 10);

  // Protein by body weight, fat 25% of energy, the rest goes to carbs.
  const protein = Math.round(p.weight * (p.goal === 'maintain' ? 1.6 : 1.8));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((p.weight * 30) / 50) * 50;

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water };
}

/** Nutrients for `grams` of a food given per 100 g. */
export function scale(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: per100.kcal * k,
    protein: per100.protein * k,
    fat: per100.fat * k,
    carbs: per100.carbs * k,
  };
}

export function fmt(n: number, digits = 0) {
  const p = 10 ** digits;
  return String(Math.round(n * p) / p);
}
