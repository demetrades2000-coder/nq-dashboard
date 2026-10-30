// Today folds its Dashboards cards (and a few quiet ones) into one summary row each. Tests that click inside such a card open the row first, through the same tap.
module.exports = async function expand(p, id) {
  const sel = `.to-acc[data-toid="${id}"]`;
  if (await p.locator(sel).count() && !(await p.locator(sel + '[open]').count())) { await p.click(sel + ' > summary'); await new Promise((r) => setTimeout(r, 120)); }
};
