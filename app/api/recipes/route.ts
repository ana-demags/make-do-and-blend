import { NextRequest, NextResponse } from "next/server";
import { SpoonacularRecipe, Recipe } from "@/types/spoonacular";

class QuotaExceededError extends Error {
  constructor() {
    super("Spoonacular API quota exceeded");
  }
}
import {
  TheMealDBFilterResponse,
  TheMealDBDetailsResponse,
} from "@/types/themealdb";

// Fetch recipes from Spoonacular
async function fetchSpoonacularRecipes(
  ingredients: string[],
  diet?: string[],
  intolerances?: string[],
  cuisine?: string[],
  type?: string,
  maxReadyTime?: number
): Promise<Recipe[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (!apiKey) {
    console.warn("SPOONACULAR_API_KEY not set, skipping Spoonacular");
    return [];
  }

  try {
    const ingredientsParam = ingredients.join(",");
    const url = new URL(
      "https://api.spoonacular.com/recipes/findByIngredients"
    );
    url.searchParams.append("ingredients", ingredientsParam);
    url.searchParams.append("number", "10");
    url.searchParams.append("ranking", "1");
    url.searchParams.append("ignorePantry", "true");

    if (diet && diet.length > 0) {
      url.searchParams.append("diet", diet.join(","));
    }
    if (intolerances && intolerances.length > 0) {
      url.searchParams.append("intolerances", intolerances.join(","));
    }
    if (cuisine && cuisine.length > 0) {
      url.searchParams.append("cuisine", cuisine.join(","));
    }
    if (type) {
      url.searchParams.append("type", type);
    }
    if (maxReadyTime && maxReadyTime > 0) {
      url.searchParams.append("maxReadyTime", maxReadyTime.toString());
    }

    url.searchParams.append("apiKey", apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Spoonacular API error:", response.status);
      if (response.status === 402) {
        throw new QuotaExceededError();
      }
      return [];
    }

    const spoonacularRecipes: SpoonacularRecipe[] = await response.json();

    return spoonacularRecipes.map((recipe) => {
      let imageUrl = recipe.image;
      if (imageUrl) {
        imageUrl = imageUrl
          .replace("312x231", "636x393")
          .replace("556x370", "636x393")
          .replace("240x150", "636x393");
      }

      return {
        id: recipe.id,
        title: recipe.title,
        image: imageUrl,
        usedIngredients: recipe.usedIngredientCount,
        missedIngredients: recipe.missedIngredientCount,
        likes: recipe.likes,
        sourceUrl: `https://spoonacular.com/recipes/${recipe.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}-${recipe.id}`,
        source: "Spoonacular",
      };
    });
  } catch (error) {
    console.error("Error fetching from Spoonacular:", error);
    return [];
  }
}

// Fetch recipes from TheMealDB
async function fetchTheMealDBRecipes(
  ingredients: string[]
): Promise<Recipe[]> {
  try {
    // TheMealDB only supports filtering by one ingredient at a time
    // We'll use the first ingredient
    const primaryIngredient = ingredients[0];

    // Filter by ingredient
    const filterUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(
      primaryIngredient
    )}`;
    const filterResponse = await fetch(filterUrl);

    if (!filterResponse.ok) {
      console.error("TheMealDB filter error:", filterResponse.status);
      return [];
    }

    const filterData: TheMealDBFilterResponse = await filterResponse.json();

    if (!filterData.meals || filterData.meals.length === 0) {
      return [];
    }

    // Get details for first 5 meals to avoid too many API calls
    const mealsToFetch = filterData.meals.slice(0, 5);

    const detailsPromises = mealsToFetch.map(async (meal) => {
      const detailUrl = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`;
      const detailResponse = await fetch(detailUrl);

      if (!detailResponse.ok) {
        return null;
      }

      const detailData: TheMealDBDetailsResponse =
        await detailResponse.json();

      if (!detailData.meals || detailData.meals.length === 0) {
        return null;
      }

      const mealDetails = detailData.meals[0];

      // Count how many of the user's ingredients are in this recipe
      const recipeIngredients: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ingredient =
          mealDetails[`strIngredient${i}` as keyof typeof mealDetails];
        if (ingredient && ingredient.trim()) {
          recipeIngredients.push(ingredient.toLowerCase());
        }
      }

      const usedCount = ingredients.filter((userIng) =>
        recipeIngredients.some((recipeIng) =>
          recipeIng.includes(userIng.toLowerCase())
        )
      ).length;

      const missedCount = Math.max(0, recipeIngredients.length - usedCount);

      return {
        // Use a large number + mealId to avoid conflicts with Spoonacular IDs
        id: 1000000 + parseInt(mealDetails.idMeal),
        title: mealDetails.strMeal,
        image: mealDetails.strMealThumb,
        usedIngredients: usedCount,
        missedIngredients: missedCount,
        likes: 0, // TheMealDB doesn't have likes
        sourceUrl:
          mealDetails.strSource ||
          `https://www.themealdb.com/meal/${mealDetails.idMeal}`,
        source: "TheMealDB",
      };
    });

    const results = await Promise.all(detailsPromises);
    return results.filter((recipe): recipe is Recipe => recipe !== null);
  } catch (error) {
    console.error("Error fetching from TheMealDB:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ingredients, diet, intolerances, cuisine, type, maxReadyTime } =
      await request.json();

    // Validate we have ingredients
    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one ingredient" },
        { status: 400 }
      );
    }

    const filterInfo = [];
    if (diet && diet.length > 0) filterInfo.push(`diet: ${diet.join(", ")}`);
    if (intolerances && intolerances.length > 0)
      filterInfo.push(`intolerances: ${intolerances.join(", ")}`);

    console.log(
      `Searching recipes for: ${ingredients.join(", ")}${
        filterInfo.length > 0 ? ` (${filterInfo.join(", ")})` : ""
      }`
    );

    // Fetch from both APIs in parallel
    const [spoonacularRecipes, mealDBRecipes] = await Promise.all([
      fetchSpoonacularRecipes(
        ingredients,
        diet,
        intolerances,
        cuisine,
        type,
        maxReadyTime
      ),
      fetchTheMealDBRecipes(ingredients),
    ]);

    // Merge results
    const allRecipes = [...spoonacularRecipes, ...mealDBRecipes];

    // Sort by how many ingredients match (descending)
    allRecipes.sort((a, b) => b.usedIngredients - a.usedIngredients);

    console.log(
      `Found ${spoonacularRecipes.length} from Spoonacular, ${mealDBRecipes.length} from TheMealDB`
    );

    return NextResponse.json({
      recipes: allRecipes,
      count: allRecipes.length,
      sources: {
        spoonacular: spoonacularRecipes.length,
        themealdb: mealDBRecipes.length,
      },
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: "quota_exceeded" },
        { status: 429 }
      );
    }
    console.error("Error in recipe API:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}
