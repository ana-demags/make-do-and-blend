import { NextResponse } from "next/server";
import pluralize from "pluralize";
import {
  RecipeDetails,
  FullRecipeDetails,
  TheMealDBRecipe,
  AnalyzedInstruction,
} from "@/types/spoonacular";

const SECTION_HEADER_PATTERN = /^(?:steps?\s+for\s+(?:the\s+)?|for\s+(?:the\s+)?|to\s+make\s+(?:the\s+)?)(.+?):\s*(.*?)\s*$/i;

function parseMealDBInstructions(raw: string): AnalyzedInstruction[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => /[a-zA-Z]{2,}/.test(line))
    .filter((line) => !/^step\s*\d*$/i.test(line));

  const groups: AnalyzedInstruction[] = [];
  let currentGroup: AnalyzedInstruction = { name: "", steps: [] };

  for (const line of lines) {
    const stripped = line.replace(/^\d+[\.\)]\s*/, "");
    if (stripped.length === 0) continue;

    const headerMatch = stripped.match(SECTION_HEADER_PATTERN);
    if (headerMatch) {
      if (currentGroup.steps.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = { name: headerMatch[1].trim(), steps: [] };
      if (headerMatch[2] && headerMatch[2].length > 0) {
        currentGroup.steps.push({
          number: 1,
          step: headerMatch[2],
          ingredients: [],
          equipment: [],
        });
      }
      continue;
    }

    currentGroup.steps.push({
      number: currentGroup.steps.length + 1,
      step: stripped,
      ingredients: [],
      equipment: [],
    });
  }

  if (currentGroup.steps.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const source = searchParams.get("source");

    if (!id || !source) {
      return NextResponse.json(
        { error: "Recipe ID and source are required" },
        { status: 400 }
      );
    }

    if (source === "Spoonacular") {
      return await fetchSpoonacularRecipe(id);
    } else if (source === "TheMealDB") {
      return await fetchTheMealDBRecipe(id);
    } else {
      return NextResponse.json(
        { error: "Invalid source specified" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe details" },
      { status: 500 }
    );
  }
}

async function fetchSpoonacularRecipe(id: string) {
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=true`;
  const response = await fetch(url);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch recipe from Spoonacular" },
      { status: response.status }
    );
  }

  const data: FullRecipeDetails = await response.json();

  // Log timing data to debug
  console.log('Spoonacular timing data:', {
    readyInMinutes: data.readyInMinutes,
    preparationMinutes: data.preparationMinutes,
    cookingMinutes: data.cookingMinutes
  });

  // Optimize image URL for higher quality
  let imageUrl = data.image;
  if (imageUrl) {
    imageUrl = imageUrl
      .replace("312x231", "636x393")
      .replace("556x370", "636x393")
      .replace("240x150", "636x393");
  }

  // Transform to unified format
  const recipeDetails: RecipeDetails = {
    id: data.id.toString(),
    title: data.title,
    image: imageUrl,
    servings: data.servings,
    readyInMinutes: data.readyInMinutes,
    preparationMinutes: data.preparationMinutes,
    cookingMinutes: data.cookingMinutes,
    sourceUrl: data.sourceUrl || data.spoonacularSourceUrl,
    source: "Spoonacular",
    cuisines: data.cuisines || [],
    diets: data.diets || [],
    dishTypes: data.dishTypes || [],
    vegetarian: data.vegetarian,
    vegan: data.vegan,
    glutenFree: data.glutenFree,
    dairyFree: data.dairyFree,
    instructions: data.instructions || "",
    ingredients: data.extendedIngredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      original: ing.original,
    })),
    analyzedInstructions: data.analyzedInstructions,
    summary: data.summary,
    healthScore: data.healthScore,
    likes: data.aggregateLikes,
    nutrition: data.nutrition,
    pricePerServing: data.pricePerServing,
  };

  return NextResponse.json(recipeDetails);
}

async function fetchTheMealDBRecipe(id: string) {
  const numericId = parseInt(id);
  const realId = numericId >= 1000000 ? (numericId - 1000000).toString() : id;
  const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${realId}`;
  const response = await fetch(url);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch recipe from TheMealDB" },
      { status: response.status }
    );
  }

  const data = await response.json();

  if (!data.meals || data.meals.length === 0) {
    return NextResponse.json(
      { error: "Recipe not found in TheMealDB" },
      { status: 404 }
    );
  }

  const meal: TheMealDBRecipe = data.meals[0];

  // Extract ingredients and measurements
  const ingredients: { name: string; amount: number; unit: string; original: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}` as keyof TheMealDBRecipe];
    const measure = meal[`strMeasure${i}` as keyof TheMealDBRecipe];

    if (ingredient && ingredient.trim() !== "") {
      const measureStr = measure?.trim() || "";
      let name = ingredient.trim().toLowerCase();
      const isBarenumber = /^\d+(\.\d+)?$/.test(measureStr);
      if (isBarenumber && parseFloat(measureStr) > 1) {
        name = pluralize(name);
      }
      const full = `${measureStr} ${name}`.trim().toLowerCase();
      ingredients.push({
        name,
        amount: 0,
        unit: "",
        original: full.charAt(0).toUpperCase() + full.slice(1),
      });
    }
  }

  // Parse tags
  const tags = meal.strTags ? meal.strTags.split(",").map((t) => t.trim()) : [];

  // Determine diets based on tags and category
  const diets: string[] = [];
  const vegetarian = tags.some((t) => t.toLowerCase().includes("vegetarian"));
  const vegan = tags.some((t) => t.toLowerCase().includes("vegan"));

  if (vegetarian) diets.push("vegetarian");
  if (vegan) diets.push("vegan");

  // Generate a descriptive summary from available metadata
  const summaryParts: string[] = [];

  if (meal.strCategory) {
    summaryParts.push(`A delicious ${meal.strCategory.toLowerCase()} dish`);
  }

  if (meal.strArea) {
    summaryParts.push(`from ${meal.strArea} cuisine`);
  }

  if (tags.length > 0) {
    const relevantTags = tags.filter(t =>
      !t.toLowerCase().includes('meal') &&
      !t.toLowerCase().includes('dish')
    ).slice(0, 2);

    if (relevantTags.length > 0) {
      summaryParts.push(`featuring ${relevantTags.join(' and ').toLowerCase()}`);
    }
  }

  const summary = summaryParts.length > 0
    ? summaryParts.join(' ') + '.'
    : undefined;

  // Transform to unified format
  const recipeDetails: RecipeDetails = {
    id: meal.idMeal,
    title: meal.strMeal,
    image: meal.strMealThumb,
    servings: 4, // TheMealDB doesn't provide servings, use default
    readyInMinutes: 0, // TheMealDB doesn't provide timing
    sourceUrl: meal.strSource || meal.strYoutube || "",
    source: "TheMealDB",
    cuisines: meal.strArea ? [meal.strArea] : [],
    diets,
    dishTypes: meal.strCategory ? [meal.strCategory] : [],
    vegetarian,
    vegan,
    glutenFree: false, // TheMealDB doesn't provide this info
    dairyFree: false, // TheMealDB doesn't provide this info
    instructions: meal.strInstructions,
    ingredients,
    analyzedInstructions: meal.strInstructions
      ? parseMealDBInstructions(meal.strInstructions)
      : undefined,
    tags,
    summary,
  };

  return NextResponse.json(recipeDetails);
}
