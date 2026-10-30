// Today folds its Dashboards cards (and a few quiet ones) into one summary row each. Tests that click inside such a card open the row first, through the same tap.
module.exports = async function expand(p, id) {
  const sel = `.to-acc[data-toid="${id}"]`;
  if (await p.locator(sel).count() && !(await p.locator(sel + '[open]').count())) { await p.click(sel + ' > summary'); await new Promise((r) => setTimeout(r, 120)); }
};
// Open the folded row that holds the element matching sel (no-op when it is not inside one, or already open).
module.exports.within = async function within(p, sel) {
  const id = await p.evaluate((s) => { const e = document.querySelector(s), d = e && e.closest('.to-acc'); return d && !d.open ? d.dataset.toid : null; }, sel);
  if (id) await module.exports(p, id);
};
