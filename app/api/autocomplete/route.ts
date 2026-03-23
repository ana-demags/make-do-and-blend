import { NextRequest, NextResponse } from "next/server";

let cachedIngredients: string[] | null = null;

async function getIngredientList(): Promise<string[]> {
  if (cachedIngredients) return cachedIngredients;

  const response = await fetch(
    "https://www.themealdb.com/api/json/v1/1/list.php?i=list"
  );

  if (!response.ok) {
    console.error("TheMealDB ingredient list error:", response.status);
    return [];
  }

  const data = await response.json();
  const ingredients: string[] = (data.meals || []).map(
    (item: { strIngredient: string }) => {
      const name = item.strIngredient.toLowerCase();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  );
  cachedIngredients = ingredients;

  return ingredients;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const ingredients = await getIngredientList();
    const lowerQuery = query.toLowerCase();

    const suggestions = ingredients
      .filter((name) => name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 8);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error in autocomplete API:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
