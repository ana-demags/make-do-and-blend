// TypeScript types for recipe nutrition data
// Spoonacular Nutrition API: https://spoonacular.com/food-api/docs#Get-Recipe-Nutrition-Widget-by-ID

export interface SpoonacularNutrition {
  calories: string;
  carbs: string;
  fat: string;
  protein: string;
  bad: NutrientInfo[];
  good: NutrientInfo[];
}

export interface NutrientInfo {
  title: string;
  amount: string;
  indented: boolean;
  percentOfDailyNeeds: number;
}

// Simplified nutrition data for our frontend
export interface Nutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
  sugar?: string;
}
