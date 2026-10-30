# Food support: user-facing text (for the Help sheet and README, written by the lead)

## Find a food (`#find-food`)
- Search any food by name. Your saved foods and a built-in list of about 150 common foods answer instantly and work offline; online results from Open Food Facts are added underneath when you have a connection.
- Scan a barcode with the camera, or type the number under the bars. If the camera is blocked or the page is not secure, the typed number still works.
- Pick an amount in servings (0.25 to 10) or in grams, and see calories, protein, carbs and fat before you add it.
- Tap the star to keep a food as a favorite. Favorites and recent foods are at the top when the search box is empty.
- All values are estimates. Packaged-food data comes from volunteers, so check it against the label when it matters.

## Daily food goals (`#food-goals`)
- Type your own calories, protein, carbs and fat, or let the calculator work them out from sex, age, height, weight, activity and goal (lose, maintain or gain, at a pace you choose).
- The calculator uses the Mifflin-St Jeor formula, protein defaults to 1.8 g per kg (you can change it), and it never suggests less than 1,200 kcal a day (women) or 1,500 (men). It is an estimate, not medical advice.
- Until you set goals, 2,200 kcal, 150 g protein, 250 g carbs and 70 g fat are used.

## Eating this week and month (`#food-week`)
- Bars for each of the last 7 or 30 days against your calorie goal; today is outlined. Tap a bar for that day's numbers.
- Average calories and protein, days logged, days within 10 percent of your goal, days protein reached 90 percent of the goal, the split of calories from protein, carbs and fat, and the days closest to and furthest from your goal.
- Plain-language notes appear only after 3 finished logged days. Today is left out of the averages until you have eaten 60 percent of your goal.

## Notes for the lead (not for the Help sheet)
- Test hook: set `window.PLANNER_TEST = true` before load to get `window.__food` (used only by the tests).
- Extra optional fields written to `foodcfg` item `cfg` by the calculator: `rate` (kg per week) and `pk` (g protein per kg). `myfoods` items match the data contract exactly.
