# Food knowledge engine: user-facing text (for the Help sheet and README, written by the food-engine agent)

## How the numbers are made
- When you log a meal, the AI only says **what** each food is and **how many grams** it thinks it is. The calories, protein, carbs, fat, fiber, sugar, sodium and saturated fat come from real food data, not from the AI.
- Where a number comes from is checked in this order: your own foods (anything you corrected or saved), the built-in list of about 470 foods (typed in from USDA FoodData Central reference values), the USDA FoodData Central lookup (needs a connection), then Open Food Facts for packaged foods.
- Each food shows how sure the app is: **high** (about plus or minus 8 percent), **medium** (15 percent) or **low** (30 percent). Restaurant and mixed dishes are always at best medium because they are typical values, not measurements.
- Raw and cooked are different: 150 g of raw chicken breast is 180 kcal, 150 g of cooked is 248 kcal. Words like grilled, baked, boiled, roasted mean cooked; fried and crispy mean fried; raw and uncooked mean raw. If you give no word the usual way it is eaten is assumed and the note says so.
- If nothing credible is found the app keeps the AI's own estimate and says so.

## My foods (`#my-foods`)
- Everything you corrected, saved or made is here: favorites first, then most used. Search the list, tap a food to change its name, serving, barcode or its numbers per 100 g, tap the star for favorites.
- **It learns from you.** When you fix the numbers of a food on a meal, the corrected version is saved and used first next time, for any amount of that food.
- **Add a food** by hand with its numbers per 100 g and a serving size. A warning shows if the numbers cannot be right (for example 900 kcal with no protein, carbs or fat); you can still save.
- **Make a recipe**: name it, say how many servings it makes, add ingredients (type a food and grams, or search), and see the numbers per serving as you go. Tap **Log** on a saved recipe to put one serving in today's meals in one tap.
- Deleting a food or recipe always asks first. Meals you already logged keep their numbers.

## Food data settings
- The USDA lookup uses a shared demo key that allows about 30 lookups an hour. Looked-up foods are remembered on this phone for good (up to 400), so the same food never costs a second lookup. If the limit is reached you see a message and the built-in list and your own foods keep working.
- For no limit, get a free key at fdc.nal.usda.gov (Get an API key) and paste it in My foods, Food data settings. The key stays on this phone and is not synced or backed up.

## More daily targets (`#food-goals`, "More targets")
- Optional targets for fiber (default 30 g), sodium (default 2,300 mg), sugar (default 50 g) and saturated fat (default 10 percent of your calories). Leave a box empty to use the default.

## Eating this week and month (`#food-week`)
- Shows your average fiber, sodium, sugar and saturated fat for the days that have that detail, and a plain note when you are well off a target (fiber under 70 percent, sodium over 115 percent, sugar or saturated fat over 130 percent). Notes appear only after 3 finished days with detail. Meals logged before this existed carry no detail and are left out of those averages.

## What should I eat next
- Given what is left today (calories, protein, carbs, fat) the app suggests foods and your own recipes that fit the calories and close the biggest gap, for example "+34 g protein for 180 kcal".

## Honest limits
- The built-in values were typed in from reference knowledge of USDA SR Legacy numbers, not looked up live. Mixed and restaurant dishes (marked typical in the data) can be off by a lot. Packaged-food data from Open Food Facts comes from volunteers. Nothing here is medical advice.

## Notes for the lead (not for the Help sheet)
- Code blocks: `FOODKB` (data, `fkFind`, `fkGrams`, `fkScale`), `FOODRESOLVE` (`fkResolve`, USDA, cache, `fkSanity`, `fkRange`, `fkItem`), `MYFOODS` (`fkLearn`, `fkMealTotals`, recipes, `fkSuggest`, the sheet). Test hooks in `window.__fk` (only when `window.PLANNER_TEST`).
- Storage: no new collection. `myfoods` items gain optional fields: `user`, `sg` (serving grams), `corr`, `fiber`, `sugar`, `na`, `sat`, `recipe`, `servings`, `ingredients`, and `per100` may carry the extended nutrients. Device-only keys: `planner.usdakey`, `planner.fkcache`, `planner.fkusage`.
- Meal items and meals may carry optional `fiber`, `sugar`, `na`, `sat`; `foodcfg` item `cfg` may carry `fiber`, `na`, `sugar`, `sat` (daily targets).
