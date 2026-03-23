import { NextResponse } from "next/server";
import { Recipe } from "@/types/spoonacular";

class QuotaExceededError extends Error {
  constructor() {
    super("Spoonacular API quota exceeded");
  }
}

async function fetchSpoonacularRandom(
  diet?: string[],
  intolerances?: string[],
  cuisine?: string[],
  type?: string,
  maxReadyTime?: number
): Promise<Recipe[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({ apiKey, number: "5" });

  const tags: string[] = [];
  if (diet && diet.length > 0) tags.push(...diet);
  if (cuisine && cuisine.length > 0) tags.push(...cuisine);
  if (type) tags.push(type);
  if (tags.length > 0) params.append("tags", tags.join(","));
  if (intolerances && intolerances.length > 0) {
    params.append("intolerances", intolerances.join(","));
  }
  if (maxReadyTime && maxReadyTime > 0) {
    params.append("maxReadyTime", maxReadyTime.toString());
  }

  const response = await fetch(
    `https://api.spoonacular.com/recipes/random?${params}`
  );
  if (!response.ok) {
    console.error(`Spoonacular random API error: ${response.status} ${response.statusText}`);
    if (response.status === 402) {
      throw new QuotaExceededError();
    }
    return [];
  }

  const data = await response.json();
  if (!data.recipes || data.recipes.length === 0) {
    console.log("Spoonacular returned no random recipes for tags:", tags.join(", ") || "(none)");
    return [];
  }

  return data.recipes.map((r: any) => ({
    id: r.id,
    title: r.title,
    image: r.image?.replace("312x231", "636x393"),
    usedIngredients: 0,
    missedIngredients: r.extendedIngredients?.length || 0,
    likes: r.aggregateLikes || 0,
    sourceUrl: r.sourceUrl || r.spoonacularSourceUrl,
    source: "Spoonacular",
  }));
}

async function fetchTheMealDBRandom(): Promise<Recipe[]> {
  const requests = Array.from({ length: 5 }, () =>
    fetch("https://www.themealdb.com/api/json/v1/1/random.php")
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
  );

  const results = await Promise.all(requests);

  return results
    .filter((data) => data?.meals?.length > 0)
    .map((data) => {
      const meal = data.meals[0];
      return {
        id: 1000000 + parseInt(meal.idMeal),
        title: meal.strMeal,
        image: meal.strMealThumb,
        usedIngredients: 0,
        missedIngredients: 0,
        likes: 0,
        sourceUrl: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
        source: "TheMealDB",
      };
    });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { diet, intolerances, cuisine, type, maxReadyTime } = body;

    const hasFilters = (diet && diet.length > 0) || (cuisine && cuisine.length > 0) || type || maxReadyTime ||
      (intolerances && intolerances.length > 0);

    const [spoonacularRecipes, mealDBRecipes] = await Promise.all([
      fetchSpoonacularRandom(diet, intolerances, cuisine, type, maxReadyTime),
      hasFilters ? Promise.resolve([]) : fetchTheMealDBRandom(),
    ]);

    const allRecipes = [...spoonacularRecipes, ...mealDBRecipes];

    if (allRecipes.length === 0) {
      return NextResponse.json(
        { error: "No random recipes found" },
        { status: 404 }
      );
    }

    // Shuffle combined results
    for (let i = allRecipes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allRecipes[i], allRecipes[j]] = [allRecipes[j], allRecipes[i]];
    }

    return NextResponse.json({ recipes: allRecipes.slice(0, 5) });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "quota_exceeded" },
        { status: 429 }
      );
    }
    console.error("Error fetching random recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch random recipe" },
      { status: 500 }
    );
  }
}
