"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Recipe } from "@/types/spoonacular";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toTitleCase } from "@/lib/utils";
export default function Home() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme state
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Ref for scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // Dietary filter state
  const [selectedDiet, setSelectedDiet] = useState<string[]>([]);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [maxCookingTime, setMaxCookingTime] = useState<number>(0); // 0 = no limit

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedSuggestionIndex >= 0) {
      const element = document.getElementById(`suggestion-${selectedSuggestionIndex}`);
      if (element) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedSuggestionIndex]);

  // Toggle theme
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


  const addIngredient = (ingredient?: string) => {
    const ingredientToAdd = ingredient || currentIngredient;
    if (ingredientToAdd.trim()) {
      setIngredients([...ingredients, ingredientToAdd.trim()]);
      setCurrentIngredient("");
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/autocomplete?query=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(data.suggestions && data.suggestions.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
      }
    }, 200);
  }, []);

  const handleIngredientChange = (value: string) => {
    setCurrentIngredient(value);
    setSelectedSuggestionIndex(-1);
    fetchSuggestions(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        addIngredient();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          addIngredient(suggestions[selectedSuggestionIndex]);
        } else {
          addIngredient();
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const hasActiveFilters = ingredients.length > 0 || selectedDiet.length > 0 ||
    selectedCuisine.length > 0 || selectedMealType !== "" ||
    selectedIntolerances.length > 0 || maxCookingTime > 0;

  const clearFilters = () => {
    setIngredients([]);
    setSelectedDiet([]);
    setSelectedCuisine([]);
    setSelectedMealType("");
    setSelectedIntolerances([]);
    setMaxCookingTime(0);
  };

  const toggleIntolerance = (intolerance: string) => {
    if (selectedIntolerances.includes(intolerance)) {
      setSelectedIntolerances(selectedIntolerances.filter((i) => i !== intolerance));
    } else {
      setSelectedIntolerances([...selectedIntolerances, intolerance]);
    }
  };

  const surpriseMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/random", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          diet: selectedDiet.length > 0 ? selectedDiet : undefined,
          intolerances: selectedIntolerances.length > 0 ? selectedIntolerances : undefined,
          cuisine: selectedCuisine.length > 0 ? selectedCuisine : undefined,
          type: selectedMealType || undefined,
          maxReadyTime: maxCookingTime > 0 ? maxCookingTime : undefined,
        }),
      });
      const data = await response.json();

      if (response.ok && data.recipes) {
        setRecipes(data.recipes);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (response.status === 429) {
        setError("We've hit our daily recipe lookup limit. You can still use Surprise Me and search without filters — filtered searches will be back tomorrow.");
      } else if (response.status === 404) {
        setError("No recipes found for that combination of filters. Try removing some filters and surprising yourself again.");
      } else {
        setError("Something went wrong on our end. Please try again later.");
      }
    } catch (error) {
      console.error("Error fetching random recipe:", error);
      setError("Something went wrong on our end. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const searchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          diet: selectedDiet.length > 0 ? selectedDiet : undefined,
          intolerances: selectedIntolerances.length > 0 ? selectedIntolerances : undefined,
          cuisine: selectedCuisine.length > 0 ? selectedCuisine : undefined,
          type: selectedMealType || undefined,
          maxReadyTime: maxCookingTime > 0 ? maxCookingTime : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError("We've hit our daily recipe lookup limit. You can still use Surprise Me and search without filters — filtered searches will be back tomorrow.");
        } else {
          setError("Something went wrong on our end. Please try again later.");
        }
        setRecipes([]);
        return;
      }

      setRecipes(data.recipes || []);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      setError("Something went wrong on our end. Please try again later.");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen border border-foreground dark:border-foreground/20">
      {/* Theme Toggle Button - only render after mount to prevent hydration mismatch */}
      {mounted && (
        <Button
          onClick={toggleTheme}
          variant="default"
          size="icon"
          className="fixed top-4 right-4 rounded-full w-10 h-10 z-50"
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
        </Button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] min-h-screen">
        {/* Left Sidebar - Sticky Form with Beige Background */}
        <aside className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto bg-background p-12 pb-32 border-r border-foreground dark:border-foreground/20">
          <div className="max-w-2xl mx-auto">
        <h1 className="text-6xl text-left mb-6 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
        Make Do & Blend
        </h1>
        <p className="text-xl text-left mb-12 text-foreground">It's time to make something. Before you give up on that lonely zucchini, let's find it some friends.</p>

        {hasActiveFilters && (
          <div className="mb-10">
            <Button variant="link" onClick={clearFilters} className="text-base p-0 h-auto underline">
              Clear all filters
            </Button>
          </div>
        )}

        <Card className="mb-20 bg-background border-0 shadow-none">
          <CardHeader className="pb-4">
            <h3 className="text-xl text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>Add your ingredients</h3>
          </CardHeader>
          <CardContent>

          <div className="mb-12">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={currentIngredient}
                  onChange={(e) => handleIngredientChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Enter one or more ingredients"
                  className="w-full"
                  role="combobox"
                  aria-expanded={showSuggestions}
                  aria-controls="ingredient-suggestions"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    selectedSuggestionIndex >= 0
                      ? `suggestion-${selectedSuggestionIndex}`
                      : undefined
                  }
                />
                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    id="ingredient-suggestions"
                    role="listbox"
                    className="absolute z-10 w-full mt-1 bg-background border rounded-[0.5rem] max-h-48 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        id={`suggestion-${index}`}
                        role="option"
                        aria-selected={index === selectedSuggestionIndex}
                        onClick={() => addIngredient(suggestion)}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        className={`w-full text-left px-4 py-2 cursor-pointer ${
                          index === selectedSuggestionIndex
                            ? "bg-accent text-accent-foreground"
                            : "text-popover-foreground hover:bg-accent"
                        }`}
                      >
                        {suggestion.toLowerCase()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button onClick={() => addIngredient()} size="default" variant="default">
                Add
              </Button>
            </div>
          </div>

          {ingredients.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl mb-4 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
                Your ingredients
              </h3>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-3 h-9 pl-4 pr-2 rounded-full bg-primary text-primary-foreground text-base"
                  >
                    <span>{ingredient}</span>
                    <button
                      onClick={() => removeIngredient(index)}
                      className="hover:bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold transition-colors"
                      aria-label={`Remove ${ingredient}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dietary Filters */}
          <div className="mb-12">
            <h3 className="text-xl mb-4 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
              Dietary preferences
            </h3>

            {/* Diet Type */}
            <div className="mb-8">
              <ToggleGroup
                type="multiple"
                value={selectedDiet}
                onValueChange={(value) => setSelectedDiet(value)}
                className="flex-wrap justify-start"
              >
                <ToggleGroupItem value="vegetarian" aria-label="Vegetarian">
                  Vegetarian
                </ToggleGroupItem>
                <ToggleGroupItem value="vegan" aria-label="Vegan">
                  Vegan
                </ToggleGroupItem>
                <ToggleGroupItem value="glutenFree" aria-label="Gluten Free">
                  Gluten Free
                </ToggleGroupItem>
                <ToggleGroupItem value="ketogenic" aria-label="Ketogenic">
                  Ketogenic
                </ToggleGroupItem>
                <ToggleGroupItem value="paleo" aria-label="Paleo">
                  Paleo
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Cuisine */}
          <div className="mb-12">
            <h3 className="text-xl mb-4 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
              Cuisine
            </h3>
            <div>
              <ToggleGroup
                type="multiple"
                value={selectedCuisine}
                onValueChange={(value) => setSelectedCuisine(value)}
                className="flex-wrap justify-start"
              >
                <ToggleGroupItem value="african">African</ToggleGroupItem>
                <ToggleGroupItem value="asian">Asian</ToggleGroupItem>
                <ToggleGroupItem value="american">American</ToggleGroupItem>
                <ToggleGroupItem value="british">British</ToggleGroupItem>
                <ToggleGroupItem value="cajun">Cajun</ToggleGroupItem>
                <ToggleGroupItem value="caribbean">Caribbean</ToggleGroupItem>
                <ToggleGroupItem value="chinese">Chinese</ToggleGroupItem>
                <ToggleGroupItem value="french">French</ToggleGroupItem>
                <ToggleGroupItem value="german">German</ToggleGroupItem>
                <ToggleGroupItem value="greek">Greek</ToggleGroupItem>
                <ToggleGroupItem value="indian">Indian</ToggleGroupItem>
                <ToggleGroupItem value="italian">Italian</ToggleGroupItem>
                <ToggleGroupItem value="japanese">Japanese</ToggleGroupItem>
                <ToggleGroupItem value="korean">Korean</ToggleGroupItem>
                <ToggleGroupItem value="mediterranean">Mediterranean</ToggleGroupItem>
                <ToggleGroupItem value="mexican">Mexican</ToggleGroupItem>
                <ToggleGroupItem value="middle eastern">Middle Eastern</ToggleGroupItem>
                <ToggleGroupItem value="spanish">Spanish</ToggleGroupItem>
                <ToggleGroupItem value="thai">Thai</ToggleGroupItem>
                <ToggleGroupItem value="vietnamese">Vietnamese</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Meal Type */}
          <div className="mb-12">
            <h3 className="text-xl mb-4 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
              Meal type
            </h3>
            <div>
              <ToggleGroup
                type="single"
                value={selectedMealType}
                onValueChange={(value) => setSelectedMealType(value || "")}
                className="flex-wrap justify-start"
              >
                <ToggleGroupItem value="breakfast">Breakfast</ToggleGroupItem>
                <ToggleGroupItem value="brunch">Brunch</ToggleGroupItem>
                <ToggleGroupItem value="lunch">Lunch</ToggleGroupItem>
                <ToggleGroupItem value="dinner">Dinner</ToggleGroupItem>
                <ToggleGroupItem value="snack">Snack</ToggleGroupItem>
                <ToggleGroupItem value="dessert">Dessert</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Max Cooking Time */}
            {/* <h3 className="text-xl font-semibold mb-4 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
              Max cooking time
            </h3>
            <div className="mb-6">
              <p className="text-sm text-foreground mb-3">
                {maxCookingTime > 0 ? `${maxCookingTime} min` : "Any"}
              </p>
              <Slider
                min={0}
                max={120}
                step={30}
                value={[maxCookingTime]}
                onValueChange={(value) => setMaxCookingTime(value[0])}
                className="w-full"
              />
              <div className="relative w-full text-xs text-muted-foreground mt-3 h-4">
                <span className="absolute" style={{ left: '0%' }}>Any</span>
                <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>30</span>
                <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>60</span>
                <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>90</span>
                <span className="absolute" style={{ left: '100%', transform: 'translateX(-100%)' }}>120</span>
              </div>
            </div> */}

          {/* Intolerances */}
          <div className="mb-12">
            <h3 className="text-xl mb-4 text-foreground" style={{ fontFamily: 'Basteleur, serif' }}>
              Intolerances
            </h3>
            <div>
              <div className="grid grid-cols-2 gap-3">
                {["Dairy", "Egg", "Gluten", "Peanut", "Soy", "Shellfish"].map((intolerance) => (
                  <div
                    key={intolerance}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`intolerance-${intolerance.toLowerCase()}`}
                      checked={selectedIntolerances.includes(intolerance.toLowerCase())}
                      onCheckedChange={() => toggleIntolerance(intolerance.toLowerCase())}
                    />
                    <label
                      htmlFor={`intolerance-${intolerance.toLowerCase()}`}
                      className="text-base text-foreground cursor-pointer"
                    >
                      {intolerance}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          </CardContent>
        </Card>
          </div>

          {/* Fixed Button Group - Pinned to Bottom */}
          <div className="fixed bottom-0 left-0 lg:w-[40%] w-full bg-background border border-foreground/100 dark:border-foreground/20 rounded-t-3xl p-6 lg:p-8 z-40">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-4">
                <Button
                  onClick={searchRecipes}
                  disabled={ingredients.length === 0 || loading}
                  className="flex-1"
                >
                  {loading ? "Searching..." : "Find recipes"}
                </Button>
                <Button
                  onClick={surpriseMe}
                  disabled={loading}
                  variant="secondary"
                  className="flex-1"
                  title="Get a random recipe"
                >
                  Surprise me
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Area - Results with Mint Green Background */}
        <main ref={resultsRef} className={`p-12 bg-background-secondary min-h-screen flex ${!loading && recipes.length === 0 && !error ? 'items-center' : ''}`}>
          <div className="max-w-4xl mx-auto w-full">
            {error && (
              <div className="bg-red-950 border border-red-900 rounded-lg p-4 mb-6">
                <p className="text-red-100">
                  {error}
                  {hasActiveFilters && (
                    <>
                      {" "}
                      <button
                        onClick={() => { clearFilters(); setError(null); }}
                        className="text-red-100 underline hover:text-red-200 transition-colors"
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
                <p>Searching for recipes...</p>
              </div>
            )}

            {!loading && recipes.length === 0 && !error && (
              <div className="text-center px-8">
                <h2 className="text-4xl text-foreground mb-6 leading-tight" style={{ fontFamily: 'Basteleur, serif' }}>
                  What are we<br />feeling today?
                </h2>
                <p className="text-lg text-foreground max-w-lg mx-auto">
                  Expand a little bit on what's in your kitchen and pantry, and we'll get something cookin' for you.
                </p>
              </div>
            )}

            {recipes.length > 0 && (
              <div>
                <h2 className="text-4xl text-foreground mb-8" style={{ fontFamily: 'Basteleur, serif' }}>
                  Found {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-0">
                  {recipes.map((recipe, index) => (
                    <div key={recipe.id}>
                      <Link
                        href={`/recipe/${recipe.id}?source=${encodeURIComponent(recipe.source || "")}`}
                        className="flex gap-6 group py-6 hover:opacity-80 transition-opacity"
                      >
                        {/* Square Image */}
                        <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-foreground dark:border-foreground/20">
                          {recipe.image ? (
                            <Image
                              src={recipe.image}
                              alt={recipe.title}
                              fill
                              className="object-cover"
                              sizes="100px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-200" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl text-foreground mb-2" style={{ fontFamily: 'Basteleur, serif' }}>
                            {toTitleCase(recipe.title)}
                          </h3>
                          <p className="text-base text-foreground">
                            {recipe.usedIngredients > 0 && recipe.missedIngredients >= 0 ? (
                              <>You have {recipe.usedIngredients} of the ingredients. {recipe.missedIngredients} more needed.</>
                            ) : recipe.source ? (
                              <>From {recipe.source}</>
                            ) : null}
                          </p>
                        </div>
                      </Link>
                      {index < recipes.length - 1 && (
                        <div className="border-b border-dashed border-foreground/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
