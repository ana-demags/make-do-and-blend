import { NextRequest, NextResponse } from "next/server";
import { SpoonacularNutrition, Nutrition } from "@/types/nutrition";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const recipeId = searchParams.get("id");
    const source = searchParams.get("source");

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    // Only Spoonacular has nutrition data in our current setup
    if (source !== "Spoonacular") {
      return NextResponse.json(
        { error: "Nutrition data only available for Spoonacular recipes" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SPOONACULAR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Fetch nutrition data from Spoonacular
    const url = `https://api.spoonacular.com/recipes/${recipeId}/nutritionWidget.json?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Spoonacular nutrition API error:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch nutrition data" },
        { status: response.status }
      );
    }

    const nutritionData: SpoonacularNutrition = await response.json();

    // Transform to our simpler format
    const nutrition: Nutrition = {
      calories: parseInt(nutritionData.calories),
      protein: nutritionData.protein,
      carbs: nutritionData.carbs,
      fat: nutritionData.fat,
    };

    // Optionally extract fiber and sugar from the detailed nutrients
    const fiberNutrient = nutritionData.good.find((n) =>
      n.title.toLowerCase().includes("fiber")
    );
    const sugarNutrient = nutritionData.bad.find((n) =>
      n.title.toLowerCase().includes("sugar")
    );

    if (fiberNutrient) {
      nutrition.fiber = fiberNutrient.amount;
    }

    if (sugarNutrient) {
      nutrition.sugar = sugarNutrient.amount;
    }

    return NextResponse.json(nutrition);
  } catch (error) {
    console.error("Error fetching nutrition:", error);
    return NextResponse.json(
      { error: "Failed to fetch nutrition data" },
      { status: 500 }
    );
  }
}
