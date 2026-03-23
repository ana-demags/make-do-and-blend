# Make Do & Blend

A recipe discovery app that matches what's in your kitchen to recipes worth making. Type in your ingredients, apply optional filters, and find something to cook — or hit "Surprise Me" and let fate decide.

Built with Next.js 15, React 19, and TypeScript.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. (Optional) Create a `.env.local` file with your Spoonacular API key:

```
SPOONACULAR_API_KEY=your_key_here
```

You can get a free key at [spoonacular.com/food-api](https://spoonacular.com/food-api). The app works without it — searches, autocomplete, and "Surprise Me" all fall back to TheMealDB — but adding a key gives you more results, filter support, and nutrition data.

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Ingredient-based search** — enter what you have, get recipes that use it
- **Surprise Me** — random recipe discovery when you can't decide
- **Autocomplete** — ingredient suggestions as you type
- **Filters** — diet (vegetarian, vegan, gluten free, keto, paleo), cuisine, meal type, and intolerances
- **Recipe detail pages** — instructions, ingredients, nutrition info, cook time, servings, and source links
- **Dark mode** — respects system preference with manual toggle

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Radix UI primitives (shadcn-style components)
- **Icons:** Lucide React
- **APIs:** Spoonacular (API key required) + TheMealDB (public, no key needed)

## Project Structure

```
app/
├── api/
│   ├── autocomplete/   # Ingredient autocomplete (TheMealDB)
│   ├── nutrition/      # Nutrition data (Spoonacular)
│   ├── random/         # Random recipe discovery
│   ├── recipe/         # Single recipe detail
│   └── recipes/        # Ingredient-based search
├── recipe/[id]/        # Recipe detail page
├── layout.tsx
├── page.tsx
└── globals.css
components/ui/          # Reusable UI components (button, card, input, etc.)
lib/                    # Shared utilities
types/                  # TypeScript types for API responses
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
