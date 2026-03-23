"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RecipeDetails } from "@/types/spoonacular";
import { Zap, BicepsFlexed, Apple, Droplet, CakeSlice, Wheat } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

export default function RecipePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const source = searchParams.get("source");

  const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    if (!id || !source) {
      setError("Missing recipe ID or source");
      setLoading(false);
      return;
    }

    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/recipe?id=${id}&source=${source}`);
        const data = await response.json();

        if (response.ok) {
          setRecipe(data);
        } else {
          setError(data.error || "Failed to load recipe");
        }
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id, source]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl text-foreground mb-4" style={{ fontFamily: 'Basteleur, serif' }}>Error</h2>
          <p className="text-base text-foreground mb-6">{error || "Recipe not found"}</p>
          <Link href="/" className="text-primary hover:underline">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, "");
  };

  return (
    <div className="min-h-screen">
      {/* Theme Toggle Button */}
      {mounted && (
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 rounded-full w-10 h-10 z-50 bg-black text-white border-2 border-black hover:bg-black/90 flex items-center justify-center"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      )}

      {/* Top Section - Beige Background */}
      <div className="bg-background px-6 sm:px-12 pt-12 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          {/* Breadcrumb */}
          <div className="mb-8 sm:mb-16">
            <Link href="/" className="text-base text-foreground hover:underline">
              Home
            </Link>
            <span className="text-foreground mx-2">/</span>
            <span className="text-base text-foreground font-semibold">{toTitleCase(recipe.title)}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-8xl text-foreground mb-10 leading-[1.05] max-w-5xl mx-auto" style={{ fontFamily: 'Basteleur, serif' }}>
            {toTitleCase(recipe.title)}
          </h1>

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-foreground">
            {recipe.preparationMinutes && recipe.preparationMinutes > 0 ? (
              <>
                <span className="text-base whitespace-nowrap">{recipe.preparationMinutes} min prep</span>
                <span className="text-foreground/30 hidden sm:inline">|</span>
              </>
            ) : null}
            {recipe.cookingMinutes && recipe.cookingMinutes > 0 ? (
              <>
                <span className="text-base whitespace-nowrap">{recipe.cookingMinutes} min cook</span>
                <span className="text-foreground/30 hidden sm:inline">|</span>
              </>
            ) : null}
            {(!recipe.preparationMinutes || !recipe.cookingMinutes) && recipe.readyInMinutes > 0 && (
              <>
                <span className="text-base whitespace-nowrap">{recipe.readyInMinutes} min total</span>
                <span className="text-foreground/30 hidden sm:inline">|</span>
              </>
            )}
            <span className="text-base whitespace-nowrap">{recipe.servings} servings</span>
            {recipe.pricePerServing && (
              <>
                <span className="text-foreground/30 hidden sm:inline">|</span>
                <span className="text-base whitespace-nowrap">${(recipe.pricePerServing / 100).toFixed(2)} per serving</span>
              </>
            )}
          </div>

          {/* Source Link */}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-block text-base text-foreground underline hover:opacity-70 transition-opacity"
            >
              View recipe on {recipe.source}
            </a>
          )}
        </div>
      </div>

      {/* Bottom Section - Mint Green Background */}
      <div className="bg-background-secondary px-6 py-12 sm:p-12">
        <div className="max-w-4xl mx-auto">
          {/* Nutrition Facts */}
          {recipe.nutrition && (
            <div className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-12">
                <div>
                  <h2 className="text-3xl sm:text-4xl text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
                    Nutrition facts
                  </h2>
                </div>
                <div>
                  <p className="text-base text-foreground mb-6">Per serving</p>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { name: "Calories", icon: Zap },
                      { name: "Protein", icon: BicepsFlexed },
                      { name: "Fiber", icon: Apple },
                      { name: "Fat", icon: Droplet },
                      { name: "Sugar", icon: CakeSlice },
                      { name: "Carbohydrates", icon: Wheat }
                    ].map(({ name, icon: Icon }) => {
                      const nutrient = recipe.nutrition!.nutrients.find(
                        (n) => n.name === name
                      );
                      if (!nutrient) return null;

                      return (
                        <div key={name} className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-foreground flex-shrink-0" />
                          <span className="text-base text-foreground">
                            {Math.round(nutrient.amount)}{nutrient.unit === 'g' ? 'g' : ''} {name.toLowerCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-b border-dashed border-foreground/50 mb-12" />
            </div>
          )}

          {/* Ingredients */}
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
                  Ingredients
                </h2>
              </div>
              <div>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="text-base text-foreground">
                      {ingredient.original}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-b border-dashed border-foreground/50 mb-12" />
          </div>

          {/* Instructions */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
              <div>
                <h2 className="text-3xl sm:text-4xl text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
                  Instructions
                </h2>
              </div>
              <div>
                {recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 ? (
                  <div className="space-y-10">
                    {recipe.analyzedInstructions.map((group, groupIndex) => (
                      <div key={groupIndex}>
                        {group.name && (
                          <h3 className="text-xl text-foreground mb-4" style={{ fontFamily: 'Basteleur, serif' }}>
                            {group.name}
                          </h3>
                        )}
                        <ol className="space-y-6">
                          {group.steps.map((step) => (
                            <li key={step.number} className="flex gap-4">
                              <span className="text-base text-foreground font-medium flex-shrink-0">
                                {step.number}.
                              </span>
                              <p className="text-base text-foreground flex-1">
                                {step.step}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-base text-foreground whitespace-pre-wrap">
                    {recipe.instructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
