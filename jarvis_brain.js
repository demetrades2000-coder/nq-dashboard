// Jarvis: the owner talks to the bot in plain language and it answers from the bot's real data (FACTS).
// One ES module, no imports, no DOM: the page passes facts(), nav() and now(). Works on the phone site and the PC dashboard.
//   createBrain({ facts, nav, now }) -> brain
//   brain.ask(text) -> Promise<Reply>   Reply = { text, speak, cards?, route?, chips?, control?, intent }
//   brain.briefing() -> Reply · brain.suggestions() -> [string] · brain.intents -> [{ name, examples }]
//   brain.setLLM({ key, model, on }) / brain.llm · brain.history() / brain.clear()
// Deterministic and data-grounded: every number comes from FACTS; a missing field is said to be missing, never invented.
// Optional "smart mode" (the owner's own Anthropic key, stored only on the device) rewrites the answer with the same FACTS and
// falls back to the built-in reply on any error.

const LOG_KEY = 'le.jarvis.log', LLM_KEY = 'le.jarvis.llm', LOG_MAX = 60;
const API_URL = 'https://api.anthropic.com/v1/messages', DEFAULT_MODEL = 'claude-sonnet-5-5';

// ----------------------------------------------------------------------------------------------------- formatting
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const n0 = (v) => Math.round(Math.abs(v)).toLocaleString('en-US');
export const money = (v, signed = true) => !isNum(v) ? '—' : (v < 0 ? '-$' : signed && v > 0 ? '+$' : '$') + n0(v);
export const usd = (v) => money(v, false);
export const pct = (v) => !isNum(v) ? '—' : (Math.abs(v) < 10 && v % 1 ? v.toFixed(1) : String(Math.round(v))) + '%';
export const fR = (v) => !isNum(v) ? '—' : (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v).toFixed(Math.abs(v) >= 10 ? 0 : 1) + 'R';
const pf = (v) => !isNum(v) ? '—' : v.toFixed(2);
const n1 = (v) => !isNum(v) ? '—' : v.toFixed(1);
const px = (v) => !isNum(v) ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;
export function mins(m) {
  if (!isNum(m)) return '—';
  m = Math.round(m);
  if (m < 1) return 'under a minute';
  if (m < 60) return plural(m, 'min', 'min');
  if (m < 60 * 36) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${String(r).padStart(2, '0')} min` : plural(h, 'hour'); }
  return plural(Math.round(m / 1440), 'day');
}
const sessions = (n) => !isNum(n) ? '—' : `${Math.round(n)} sessions (about ${n <= 5 ? 'a week' : n <= 10 ? '2 weeks' : n <= 15 ? '3 weeks' : n <= 22 ? 'a month' : Math.round(n / 21 * 10) / 10 + ' months'})`;
// a fraction (0.05) or a percentage (5) -> '5%'
const frac = (v) => !isNum(v) ? '—' : pct(Math.abs(v) <= 1 ? v * 100 : v);
const lines = (...a) => a.filter((x) => x != null && x !== '').join('\n');
const strip = (s) => String(s ?? '').replace(/\*\*/g, '');

// ----------------------------------------------------------------------------------------------------- glossary (built in, plain words)
const GLOSSARY = {
  sweep: ['sweep', 'A **sweep** is price running through an old high or low where other traders\' stops sit, then turning. It is step one: from 08:00 ET the bot waits for a liquidity pool to be swept before it looks for an entry.'],
  ifvg: ['IFVG', 'An **IFVG** (inverted fair value gap) is a gap that price first fills and then breaks back through, flipping its role. Inside a killzone that flip is the trigger to enter after a sweep.'],
  cisd: ['CISD', 'A **CISD** (change in state of delivery) is the first candle that closes back through the opening prices of the move that swept the pool. It is the second trigger the bot accepts, next to the IFVG.'],
  killzone: ['killzone', 'The **killzones** are the two New York windows when the bot may enter: 09:30–11:30 and 13:30–15:30 ET. Outside them it only watches.'],
  cold: ['cold streak', 'A **cold streak** means the last 15 finished signals add up to 0R or less. The bot then trades at a quarter of the size until the streak ends. It never pauses for weeks; it trades smaller.'],
  late: ['late entry', 'A **late entry** is a setup where the 15-minute structure has already turned the trade\'s way before the trigger. Those trade at half size (the research showed they win less).'],
  press: ['press', 'The **press** is the fast-eval sizing mode: full $800 risk on any stop up to 60 points while the eval is above a floor. It roughly halves the time to pass but fails about twice as many evals, so it is OFF.'],
  r: ['R', '**R** is one unit of risk: the $ between entry and stop. +2R means the trade made twice what it risked. Every result here shows $ next to R.'],
  pool: ['liquidity pool', 'A **liquidity pool** is an old high or low (session, day, week, equal highs/lows) where stop orders cluster. Price is drawn to them; the bot targets the nearest major one at least 1.5R away.'],
  giveback: ['giveback', 'A **giveback** exit closes a trade that reached +0.5R and then came all the way back through the entry: it does not let a winner turn into a full loss.'],
  timestop: ['time stop', 'The **30-minute time stop** closes a trade that is not yet +0.5R after 30 minutes: a setup that has not moved is usually wrong.'],
  be: ['breakeven', 'The stop moves to **breakeven** once the trade is +1R (+3R on trending days, so a runner is not cut short).'],
  eval: ['MFFU eval', 'The **MFFU Builder 50K** eval: make $3,000 from $50,000 before the $2,000 end-of-day trailing max loss is hit (it locks at $50,100). The owner wants it decided within 2 weeks and never slower than 3 weeks.'],
  micro: ['micros', '**MNQ micros** are the small Nasdaq futures contract: $2 a point. The bot sizes in micros so a wide stop can still mean small risk.'],
};
const GLOSS_RX = {
  sweep: /\bsweeps?\b/, ifvg: /\bifvg|inverted fair value|fair value gap|fvg\b/, cisd: /\bcisd|change in state of delivery\b/, killzone: /\bkill ?zones?\b/,
  cold: /\bcold streaks?\b/, late: /\blate entr(y|ies)\b/, press: /\b(the )?press\b/, r: /\b(an? r|one r|r means|is r|r unit|what is r|r value)\b/, pool: /\bliquidity pools?|pool\b/,
  giveback: /\bgive ?back\b/, timestop: /\btime stop\b/, be: /\bbreak ?even|be at\b/, eval: /\bwhat is (the |an? )?(mffu|eval)\b/, micro: /\bmicros?\b/,
};
const REJECTED_DEFAULT = [
  'Published models as taught: ICT 2022, Silver Bullet, Mech/IFVG, continuation, ATM 5m/1m with a sharp V (0.2–1.5 trades a week, PF about 1)',
  '92 confluences and 6 daily-bias methods', 'Grade / confidence sizing, partials and trails',
  'Fixed 10–15 point stops: wicked out, lose money', 'Target variants: no cap, draw mode, "last real pool" (all worse)',
  'Re-sweep, inducement, FBOS, RBOS as filters: no edge that held in both periods', 'The skip-mode cold-streak filter: best PF, but it paused trading for 14 weeks',
  'Sitting out or halving after a max-size loss: loses money in both periods',
];
const FIVE_YEAR_NOTE = 'Honest range: the 5-year net has landed between about $8k and $17k across the lock versions, so 2026 (an unusually good year) is the exception, not the rule.';

// ----------------------------------------------------------------------------------------------------- normalizing the question
const CONTRACTIONS = [[/\bwhat's\b/g, 'what is'], [/\bwhere's\b/g, 'where is'], [/\bhow's\b/g, 'how is'], [/\bwho's\b/g, 'who is'], [/\bwhen's\b/g, 'when is'], [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'], [/\bit's\b/g, 'it is'], [/\blet's\b/g, 'let us'], [/\bi'm\b/g, 'i am'], [/\byou're\b/g, 'you are'], [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'],
  [/\bdon't\b/g, 'do not'], [/\bdoesn't\b/g, 'does not'], [/\bdidn't\b/g, 'did not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'], [/\bwasn't\b/g, 'was not'], [/\bshouldn't\b/g, 'should not'], [/\bi'd\b/g, 'i would'], [/\byou'd\b/g, 'you would'], [/\bi've\b/g, 'i have'], [/\byou've\b/g, 'you have'],
  [/\bwe've\b/g, 'we have'], [/\bhaven't\b/g, 'have not'], [/\bhasn't\b/g, 'has not'], [/\bu\b/g, 'you'], [/\bur\b/g, 'your'], [/\bwhatcha\b/g, 'what are you'], [/\bwat\b/g, 'what'], [/\bpnl\b/g, 'p&l'],
  [/\bp and l\b/g, 'p&l'], [/\bpl\b/g, 'p&l'], [/\bnas(daq)?\b/g, 'nq'], [/\bmnq\b/g, 'nq'], [/\btgt\b/g, 'target'], [/\bsl\b/g, 'stop'], [/\btp\b/g, 'target'], [/\bdd\b/g, 'drawdown'],
  [/\bpoints?\b/g, 'pt'], [/\bpts\b/g, 'pt'], [/\bmicro\b/g, 'micros'], [/\bcontracts?\b/g, 'micros'], [/\bkz\b/g, 'killzone'], [/\btrades?\b/g, 'trade'], [/\bwk\b/g, 'week']];
export function normalize(text) {
  let s = String(text || '').toLowerCase().replace(/[’`´]/g, "'").replace(/[“”]/g, '"');
  s = s.replace(/(\d),(\d{3})\b/g, '$1$2');                      // 24,500 -> 24500
  s = s.replace(/(\d)\s*-\s*(pt|point)/g, '$1 $2');              // 44-point -> 44 point
  for (const [rx, to] of CONTRACTIONS) s = s.replace(rx, to);
  s = s.replace(/[^a-z0-9$&%.+\s-]/g, ' ').replace(/\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

// ----------------------------------------------------------------------------------------------------- intents: keyword / regex groups with weights
// each pattern: [weight, regex]. The best total wins; below MIN_SCORE the brain falls back to the closest three.
const MIN_SCORE = 2;
const INTENTS = [
  { name: 'control', pat: [[8, /^(mute|unmute|be quiet|quiet|shut up|silence|stop talking|stop speaking|hush|talk to me|speak to me|speak|voice on|voice off|sound on|sound off|say it|read it out)$/],
    [8, /^(clear|clear the chat|clear chat|clear history|reset chat|reset the chat|start over|new chat|wipe the chat|forget the chat)$/], [8, /^(help|help me|what can you do|what can i ask|what can i ask you|commands|menu|options|what do you know)$/],
    [8, /^(repeat|repeat that|say that again|again|say again|what did you say|one more time|come again)$/], [3, /\b(mute|unmute|stop talking|clear the chat|what can you do|what can i ask|repeat that|say that again)\b/]],
    examples: ['mute', 'stop talking', 'talk to me', 'clear the chat', 'help', 'what can you do', 'repeat', 'say that again', 'unmute', 'what can I ask you'] },
  { name: 'calculator', pat: [[6, /\b\d+(\.\d+)?\s*(pt|point)\b/], [4, /\b\d+(\.\d+)?\s*(pt\s*)?stop\b/], [3, /\bhow many micros\b/], [2, /\bsize for\b/], [2, /\bmicros? (at|for|on|with)\b/], [1, /\b(cold|late|trend\w*|full)\b/]],
    examples: ['size for a 44 point stop', 'how many micros at 30 pts cold', '30 point stop late entry', 'what size on a 25 pt stop', 'how many micros for a 50 point stop on a trending day', 'size at 20 points', 'micros for 60 pts cold and late', '44 pt stop'] },
  { name: 'navigation', pat: [[3, /^(open|show me|show|go to|goto|take me to|bring up|navigate to|pull up|jump to|switch to)\b/],
    [4, /^(open|show me|show|go to|goto|take me to|bring up|navigate to|pull up|jump to|switch to)\s+(the |my |me )?(chart|trade|trades|news|settings|strategy|results|lab|write-?ups?|evals?|intraday|cold|risk|engine|today|home|dashboard)\b/],
    [3, /\b(the )?(chart|trade list|trade page|trade tab|news page|news tab|settings|strategy page|results page|the lab|lab page|write-?ups?|evals page|eval page|intraday|cold-?streak page|risk page|engine page|today page|home|dashboard)\b/],
    [2, /\b(page|tab|screen)\b/], [-4, /\b(run|experiment)\b/]],
    examples: ['open the chart', 'show me the trades', 'go to news', 'settings', 'open the strategy page', 'take me to the lab', 'show results', 'go to the eval page', 'open write-ups', 'show me today'] },
  { name: 'status', pat: [[5, /\b(what are you doing|what you doing|what are you up to|what is going on|anything going on|what is happening|sitrep|status|status report|how are things|where are we|what is the bot doing|what is up|are you trading|are you running|are you working|are you alive|are you on|you up|update me|give me an update|what are you watching|what are you looking at)\b/],
    [2, /\b(doing|going on|happening|trading now|right now|at the moment|currently)\b/], [1, /\b(bot|you|engine)\b/], [1, /\b(now|today)\b/]],
    examples: ['what are you doing', 'status', 'anything going on', 'are you trading', 'what is going on right now', 'give me an update', 'what are you watching', 'are you running', 'sitrep', 'what is the bot doing'] },
  { name: 'position', pat: [[5, /\b(in a trade|in a position|open trade|open position|are you in|are you long|are you short|position)\b/], [4, /\b(where is (your|the|my) stop|your stop|the stop at|stop at|where is (your|the) target|your target|the target at|entry price|entry at|what is the entry|the entry|holding|riding|flat|at risk right now|at risk now|is at risk)\b/],
    [2, /\b(what is the target|the target)\b/], [1, /\b(stop|target|entry)\b/], [-3, /\b(how do you|where do you put|rule|pick|choose)\b/]],
    examples: ['are you in a trade', 'where is your stop', 'what is the target', 'position', 'are you long or short', 'what is the entry', 'are you holding anything', 'are we in a position', 'are you flat', 'how much is at risk right now'] },
  { name: 'price', pat: [[5, /\b(where is nq|nq at|nq price|price of nq|price now|the price|what is the price|current price|how much is nq|nq level|nq now|where is the market|market at|quote|last price|where is price|price check)\b/], [2, /\bprice\b/], [1, /\bnq\b/]],
    examples: ['where is NQ', 'price', 'what is the price', 'NQ at', 'how much is NQ', 'where is the market', 'price check', 'current price', 'quote'] },
  { name: 'size', pat: [[5, /\b(what size|size now|current size|what size are you|size are you|are we cold|are you cold|in a cold streak|cold now|quarter size|half size|why quarter|why half|why smaller|why small|full size|what multiplier|the multiplier|how big are you trading|size today|size mode|how are you sizing|sizing now|trading size)\b/],
    [3, /\bcold\b/], [2, /\bsize\b/], [1, /\b(streak|smaller|bigger|micros)\b/], [-2, /\bwhat is an? \b/]],
    examples: ['what size', 'are we cold', 'why quarter size', 'what size are you trading', 'size now', 'are you in a cold streak', 'how are you sizing right now', 'is the cold streak over', 'what multiplier', 'full size or not'] },
  { name: 'eval_timing', pat: [[6, /\b(buy (the|an|a|my) eval|buy an eval|start (the|an|a|my) eval|start an eval|reset (the|my|an) eval|reset eval|new eval|good time to start|good time to buy|time to start|should i start|should i buy|when should i start|when should i buy|when to start|when to buy|start now|is now (a )?good|eval timing|right time|start trading the eval|take the eval|begin the eval|fresh eval|another eval|next eval|start a new account)\b/],
    [2, /\b(good time|should i|when should|timing)\b/], [1, /\beval\b/]],
    examples: ['should I buy the eval', 'reset my eval?', 'good time to start', 'is now a good time to start an eval', 'when should I buy the next eval', 'eval timing', 'should I start a new eval now', 'time to start?', 'should I reset', 'good time to buy'] },
  { name: 'eval', pat: [[5, /\b(how is the eval|eval going|eval status|eval doing|the eval|my eval|far from the target|to the target|to target|cushion|trailing|max loss|balance|room left|how much room|the account|account balance|mffu|how far|how close|target left|how much to the target|how much have you made on the eval|eval profit|eval p&l|eval balance)\b/],
    [2, /\beval\b/], [1, /\b(target|profit|floor)\b/]],
    examples: ['how is the eval', 'how far from the target', 'cushion', 'trailing max loss', 'eval status', 'what is the balance', 'how much room is left', 'how close are we to passing', 'eval profit', 'mffu'] },
  { name: 'today', pat: [[5, /\b(what happened today|today so far|how was today|today p&l|p&l today|profit today|made today|lost today|anything today|trade today|did you trade today|today result|how did today go|how did we do today|today)\b/], [1, /\b(happened|so far)\b/]],
    examples: ['today', 'what happened today', 'P&L today', 'did you trade today', 'how did we do today', 'anything today', 'how was today', 'today so far'] },
  { name: 'week', pat: [[5, /\b(this week|the week|week so far|how many trade this week|weekly|on pace|on track|2 to 4|2-4|two to four|week p&l|p&l this week|how is the week|how was the week|week result|how did the week go|how many trade|this wk|trade count)\b/], [2, /\bweek\b/], [1, /\b(pace|track|count)\b/]],
    examples: ['this week', 'how many trades this week', 'on pace for 2-4?', 'how is the week going', 'week so far', 'weekly P&L', 'are we on track this week', 'how was the week', 'trade count this week'] },
  { name: 'last_trade', pat: [[5, /\b(last trade|latest trade|most recent trade|recent trade|previous trade|explain the trade|explain that trade|why did you enter|why did you lose|why did you win|why did you take|why did you exit|why did you get out|what went wrong|what went right|the trade report|that trade|last entry|last loss|last win|the last one|what was the lesson|walk me through the trade)\b/],
    [2, /\b(why did you|explain)\b/], [1, /\b(trade|enter|lose|loss|win)\b/]],
    examples: ['explain the last trade', 'why did you enter', 'why did you lose', 'last trade', 'what went wrong', 'why did you take that trade', 'walk me through the trade', 'what was the lesson from the last trade', 'latest trade', 'why did you exit'] },
  { name: 'results', pat: [[5, /\b(how good is this|how good are you|how good is the bot|how much does it make|how much do you make|how much does this make|how much money|profit factor|drawdown|max drawdown|worst drawdown|5 years|five years|2021|2026|per month|a month|monthly|eval odds|pass rate|pass odds|odds of passing|chance of passing|back to back|back-to-back|b2b|results|backtest|performance|track record|net profit|win rate|how profitable|does this work|does it work|is it profitable|how much has it made|expectancy|edge|the numbers|show me the numbers|how often do you win|how many evals|evals passed)\b/],
    [2, /\b(pf|profit|returns|made|make|win|odds|years|history)\b/], [-2, /\btoday\b/], [-2, /\bthis week\b/], [-7, /\bhow does (it|this|the bot) work\b/]],
    examples: ['how good is this', 'how much does it make', 'profit factor', 'drawdown', '2026', '5 years', 'per month', 'eval odds', 'back to back', 'win rate', 'does this work', 'how much money has it made', 'track record', 'how often do you win'] },
  { name: 'strategy', pat: [[5, /\b(how do you trade|how does it trade|the rules|your rules|what are the rules|how do you enter|entry rule|entry rules|where do you put the stop|where does the stop go|how do you place the stop|how do you pick the target|how do you choose the target|target rule|how do you size|sizing rule|how do you manage|the strategy|your strategy|explain the strategy|how it works|how does it work|how does this work|how does the bot work|what do you trade|what do you look for|the plan|the method|the setup|the five steps|the steps|what is the edge|explain the setup|the system)\b/],
    [4, /\b(what is|what are|define|meaning of|explain|tell me about)\s+(an? |the )?(sweep|ifvg|cisd|killzone|kill zone|cold streak|late entry|press|liquidity pool|pool|giveback|time stop|breakeven|r|micros?|mffu|eval|fvg)\b/],
    [2, /\b(sweep|ifvg|cisd|killzone|kill zone|fvg|giveback|breakeven|liquidity pool|rule|rules)\b/], [1, /\b(stop|target|enter|entry|manage|strategy|setup)\b/], [-3, /\b\d+\s*pt\b/]],
    examples: ['how do you trade', 'the rules', 'how do you enter', 'where do you put the stop', 'how do you pick the target', 'how do you size', 'what is a sweep', 'what is an IFVG', 'what is a killzone', 'what is a cold streak', 'what is a late entry', 'what is the press', 'explain the strategy', 'how does it work', 'what is CISD'] },
  { name: 'news', pat: [[5, /\b(news|what is coming|what is coming up|coming up|next news|next event|next release|next data|economic data|fomc|fed day|fed|cpi|nfp|payrolls|jobs report|clear to trade|am i clear|blackout|blackouts|headline|headlines|calendar|economic calendar|moving the dollar|the dollar|dxy|usd|red folder|events today|what is on today|any data today|rate decision|powell|warsh|earnings|what is on the calendar|high impact)\b/],
    [2, /\b(coming|release|data|event|events|day)\b/], [1, /\b(is it|today|clear)\b/], [-6, /\bcalendar effects?\b/]],
    examples: ['what is coming', 'next news', 'is it FOMC day', 'am I clear to trade', 'blackouts today', 'headlines', 'what is moving the dollar', 'what is on the calendar', 'any high impact data today', 'news'] },
  { name: 'pc', pat: [[6, /\b(is the pc on|the pc|pc on|pc bot|pc alive|the surface|surface alive|is the surface|heartbeat|heart beat|the computer|my computer|desktop|the machine|laptop|ninjatrader|ninja|windows bot|home bot|pc running|is the pc|pc status)\b/], [3, /\bpc\b/], [1, /\b(on|alive|running|silent)\b/]],
    examples: ['is the PC on', 'is the Surface alive', 'heartbeat', 'PC status', 'is the computer running', 'is the PC bot alive', 'pc', 'is NinjaTrader connected'] },
  { name: 'research', pat: [[7, /\bcalendar effects?\b/], [5, /\b(what did you learn|what have you learned|what did you test|what have you tested|what has been tested|what was tested|research|experiment|experiments|write-?ups?|study|studies|findings|finding|lessons|lesson|learned|what is rejected|what was rejected|rejected|tried and failed|what did not work|what failed|show run|the run|run id|stress test|stress tests|monte carlo|robustness|leakage|calendar effect|calendar effects|loss anatomy|intraday anatomy|eval game|what to expect|streaks)\b/],
    [4, /\b(ema|emas|vwap|moving average|moving averages|volume profile|daily bias|bias|inducement|regime|vix|breakeven at|be trending|partials|trail|trailing stop|time of day|day of week|weekday|hour of day|fixed stop|wider stops|tighter stops|stop size|target variants|draw mode|silver bullet|ict|confluence|confluences|filters?)\b/],
    [2, /\b(what about|did you try|have you tried|have you tested|did you test|test|tested|idea|would .* help|would .* work|does .* help|does .* work)\b/], [1, /\b(stops|targets|management|timing|risk)\b/]],
    examples: ['what did you learn', 'what did you test', 'what about EMAs', 'what about VWAP', 'moving averages', 'calendar effects', 'stress tests', 'monte carlo', 'what about tighter stops', 'targets research', 'daily bias', 'inducement', 'what is rejected', 'lessons', 'show run baseline', 'did you try a trailing stop', 'would a VIX filter help'] },
  { name: 'press', pat: [[6, /\b(fast eval|fast-eval|fast mode|press mode|the press|turn on the press|press on|press off|pass in 2 weeks|pass in two weeks|pass faster|faster eval|speed up the eval|quicker eval|pass quicker|pass sooner|can you pass in|2 week eval|two week eval|eval speed|how fast can you pass|how long to pass|how long does an eval take|time to pass)\b/], [2, /\bpress\b/], [1, /\b(fast|faster|quick|quicker|speed)\b/], [-7, /\b(what is|what are|explain|define|meaning)\b/]],
    examples: ['fast eval mode', 'can you pass in 2 weeks', 'press', 'turn on the press', 'how long does an eval take', 'how fast can you pass', 'pass faster', 'eval speed', 'is the press on'] },
  { name: 'smalltalk', pat: [[5, /^(hello|hi|hey|yo|hiya|howdy|sup|good morning|good afternoon|good evening|good night|morning|evening|gm|gn|thanks|thank you|thx|ty|cheers|nice|cool|great|awesome|ok|okay|good job|well done|nice work|love it|lol|haha|who are you|what are you|what is your name|are you there|you there|jarvis|hey jarvis|yo jarvis|hello jarvis|how are you|how are you doing|you good|what is up jarvis|bye|goodbye|see you|later|good bot|good boy)( jarvis| bot| there| man| bro| buddy)?$/],
    [2, /\b(hello|hi|hey|thanks|thank you|who are you|good morning|good night|jarvis)\b/]],
    examples: ['hello', 'thanks', 'who are you', 'good morning', 'hey Jarvis', 'how are you', 'good night', 'thank you', 'yo', 'nice work'] },
];

// ----------------------------------------------------------------------------------------------------- the brain
export function createBrain({ facts, nav, now } = {}) {
  const F = () => { try { return facts?.() || {}; } catch { return {}; } };
  const NOW = () => { try { return now ? now() : new Date(); } catch { return new Date(); } };
  const storage = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }, del(k) { try { localStorage.removeItem(k); } catch { } } };
  let log = storage.get(LOG_KEY, []); if (!Array.isArray(log)) log = [];
  let llm = { on: false, key: '', model: DEFAULT_MODEL, ...(storage.get(LLM_KEY, null) || {}) };
  let lastReply = null;
  const route = (k, arg) => { const r = F().routes || {}; const base = r[k] || null; if (!base) return null; return arg != null ? base.replace(/\/?$/, '/') + encodeURIComponent(arg) : base; };
  const push = (role, text) => { log.push({ role, text: strip(text).slice(0, 2000), t: NOW().toISOString() }); if (log.length > LOG_MAX) log = log.slice(-LOG_MAX); storage.set(LOG_KEY, log); };

  // ---- shared pieces
  const freshness = (f) => {
    const age = f.age_min, s = f.clock?.session, inSession = s && !['weekend', 'closed', 'overnight'].includes(s);
    if (!isNum(age)) return { text: f.source === 'pc' ? 'PC bot' : 'Cloud bot', warn: null };
    const src = f.source === 'pc' ? 'PC bot' : 'Cloud bot';
    const warn = inSession && age > 20 ? `Heads up: this state is ${mins(age)} old; the cloud monitor runs every 15 minutes in the killzones.` : null;
    return { text: `${src} · state ${mins(age)} old`, warn };
  };
  const sessionWords = (c) => {
    if (!c) return 'I do not have the clock from this build.';
    const nx = c.next && isNum(c.next.in_min) ? ` ${c.next.what} in ${mins(c.next.in_min)}.` : '';
    const map = { weekend: 'It is the weekend, the market is closed.', closed: 'The market is closed for the day.', overnight: 'Overnight session: the bot waits for 08:00 ET to start watching for a sweep.',
      premarket: 'Pre-market: watching for a sweep from 08:00 ET, no entries before 09:30.', am_killzone: 'NY AM killzone (09:30–11:30 ET): the bot may enter.', lunch: 'Lunch, between the killzones: watching, no entries.',
      pm_killzone: 'NY PM killzone (13:30–15:30 ET): the bot may enter.', after_pm: 'After the PM killzone: no new entries, flat by 15:55.' };
    return (map[c.session] || `Session: ${c.session || 'unknown'}.`) + nx;
  };
  const stateWords = (ms) => {
    if (!ms) return null;
    const m = String(ms).toUpperCase();
    if (m.includes('WAITING')) return 'waiting for a sweep';
    if (m.includes('ARMED') || m.includes('HUNTING')) return 'armed: a pool was swept, hunting the IFVG/CISD trigger';
    if (m.includes('PENDING')) return 'an entry order is working';
    if (m.includes('IN TRADE')) return 'in a trade, managing it';
    if (m.includes('DONE')) return 'done for the day (one trade a day)';
    if (m.includes('OUTSIDE')) return 'outside the killzones, watching only';
    return String(ms).toLowerCase();
  };
  const posWords = (p) => {
    if (!p) return 'Flat: no paper position open.';
    const risk = isNum(p.risk_usd) ? p.risk_usd : (isNum(p.qty) && isNum(p.entry) && isNum(p.stop) ? p.qty * Math.abs(p.entry - p.stop) * 2 : null);
    const rr = isNum(p.entry) && isNum(p.stop) && isNum(p.target) && p.entry !== p.stop ? Math.abs(p.target - p.entry) / Math.abs(p.entry - p.stop) : null;
    return `**${p.side || 'position'}** ${isNum(p.qty) ? plural(p.qty, 'micro') : ''} from ${px(p.entry)}, stop ${px(p.stop)}, target ${px(p.target)}${rr ? ` (${n1(rr)}R)` : ''}. $ at risk: ${usd(risk)}${rr && isNum(risk) ? `, at the target ${money(risk * rr)}` : ''}. Paper only.`;
  };
  const tradeWords = (t, withReport = true) => {
    if (!t) return null;
    const head = `${t.day || ''} ${t.entry ? t.entry.replace(/^\d\d-\d\d /, '') : ''}`.trim();
    const base = `**${t.side || '?'}** ${t.trigger ? t.trigger + ' ' : ''}${head ? 'at ' + head : ''}${t.qty != null ? `, ${plural(t.qty, 'micro')}` : ''}${t.mult != null && t.mult < 1 ? ` (${t.mult}× size)` : ''}: **${fR(t.R)} · ${money(t.usd)}**${t.exit_reason ? `, out on ${t.exit_reason}` : ''}${t.exit ? ` at ${t.exit}` : ''}.`;
    if (!withReport || !t.report) return base;
    const r = t.report, j = (x) => Array.isArray(x) ? x.join('; ') : (x || '');
    return lines(base, r.why ? `Why: ${j(r.why)}` : null, r.plan ? `Plan: ${j(r.plan)}` : null, r.result ? `Result: ${j(r.result)}` : null, (r.lesson || r.lessons) ? `Lesson: ${j(r.lesson || r.lessons)}` : null);
  };
  const periodWords = (label, p) => !p ? `${label}: no numbers in this build.` : `**${label}:** ${plural(p.trades ?? 0, 'trade')}, ${n1(p.per_week)}/week, PF ${pf(p.pf)}, **${money(p.net)}**${isNum(p.per_month) ? ` (${money(p.per_month)} a month)` : ''}, max drawdown ${money(p.max_dd)}${isNum(p.win_pct) ? `, wins ${pct(p.win_pct)}` : ''}.`;
  const evalOddsWords = (label, p) => !p ? null : `${label}: within 2 weeks ${pct(p.p2w)} pass / ${pct(p.f2w)} fail; within a month ${pct(p.p1m)} pass / ${pct(p.f1m)} fail${isNum(p.pass_med) ? `; median pass ${Math.round(p.pass_med)} sessions` : ''}${p.b2b ? `; back-to-back ${p.b2b[0]} passed / ${p.b2b[1]} failed` : ''}.`;
  const sizeWords = (s) => {
    if (!s) return 'I do not have the size filter from this build.';
    const cold = s.on === false;
    const head = cold ? `**Cold streak: ${sizeName(s.mult ?? s.cold_size)} size.**` : '**Full size.**';
    const why = isNum(s.sum_r) ? ` The last ${s.n ?? s.lookback ?? 15} finished signals add up to ${fR(s.sum_r)}${cold ? ' (0R or less = cold)' : ' (above 0R)'}.` : (s.reason ? ` ${s.reason}.` : '');
    const rule = ` Rule: ${usd(s.risk_usd ?? 800)} of risk up to a ${s.ref_stop ?? 20}-pt stop, less on wider stops; cold streak ×${s.cold_size ?? 0.25}${isNum(s.late_mult) ? `, late entry ×${s.late_mult}` : ''}.`;
    return head + why + rule;
  };
  const sizeName = (m) => !isNum(m) ? 'reduced' : m >= 1 ? 'full' : m === 0.5 ? 'half' : m === 0.25 ? 'quarter' : m === 0 ? 'no' : `${m}×`;
  const timingWords = (t) => {
    if (!t) return 'I do not have the eval-timing read from this build.';
    const v = t.verdict === 'go' ? (t.best ? 'GO, best window' : t.state === 'stale' || (isNum(t.since_flip) && t.since_flip > 20) ? 'GO, but a late start' : 'GO') : 'WAIT';
    return lines(`**${v}.** ${t.reason || ''}`.trim(),
      `Odds for a start like this (2021-25): within 2 weeks ${frac(t.pass_2w)} pass / ${frac(t.fail_2w)} fail; within a month ${frac(t.pass_1m)} pass / ${frac(t.fail_1m)} fail${isNum(t.median_pass) ? `; median pass ${t.median_pass} sessions` : ''}.`,
      'Owner rule: WAIT in a cold streak; the best starts are within 5 sessions of the switch back to full size; after 20+ sessions it is a late start.');
  };
  const evalWords = (e) => !e ? 'I do not have the eval tracker from this build.' : `Balance **${usd(e.balance)}**, profit **${money(e.profit)}**, ${usd(Math.max(0, e.to_target ?? 0))} to the ${usd(e.target ?? 3000)} target. Max-loss floor ${usd(e.trailing_mll)}, cushion **${usd(e.cushion)}**${isNum(e.trailing_mll) && e.trailing_mll >= 50100 ? ' (floor locked at $50,100)' : ''}. Paper trades scored with the MFFU Builder 50K rules.`;
  const newsNext = (N) => {
    if (!N) return 'I do not have the news feed from this build.';
    const x = N.next;
    if (!x) return 'No USD event ahead in the calendar I have.';
    const when = isNum(x.in_min) ? (x.in_min < 0 ? `${mins(-x.in_min)} ago` : `in ${mins(x.in_min)}`) : (x.t || '');
    return `Next: **${x.title}** ${when}${x.impact ? ` (${x.impact} impact)` : ''}${x.blackout ? ', with a bot blackout around it' : ''}.`;
  };
  const light = (N) => N?.bot_now ? `${N.bot_now.light === 'red' ? 'RED' : N.bot_now.light === 'amber' ? 'AMBER' : 'GREEN'}: ${N.bot_now.text || ''}`.trim() : null;

  // ---- replies
  const cardStatus = (f) => {
    const kv = [];
    if (f.bot?.model_state) kv.push(['State', f.bot.model_state]);
    if (isNum(f.bot?.price)) kv.push(['NQ', px(f.bot.price)]);
    if (f.clock?.et) kv.push(['ET', `${f.clock.et} ${f.clock.weekday || ''}`.trim()]);
    if (isNum(f.age_min)) kv.push(['State age', mins(f.age_min)]);
    if (f.size) kv.push(['Size', f.size.on === false ? sizeName(f.size.mult ?? f.size.cold_size) : 'full']);
    if (f.eval_timing) kv.push(['Eval timing', f.eval_timing.verdict === 'go' ? 'GO' : 'WAIT']);
    return { title: 'Right now', kv, route: route('engine'), label: 'Open the engine' };
  };
  const R = {
    status(f) {
      const fr = freshness(f), b = f.bot || {};
      const t = lines(`${fr.text}: **${stateWords(b.model_state) || 'no state yet'}**.`, sessionWords(f.clock), isNum(b.price) ? `NQ ${px(b.price)}.` : 'No price in this build.', posWords(b.position),
        b.setups?.length ? `Armed setups: ${b.setups.join(', ')}.` : null, b.pc?.present ? `PC bot: ${b.pc.silent ? 'SILENT' : b.pc.running === false ? 'stopped' : 'alive'}${isNum(b.pc.age_min) ? `, last seen ${mins(b.pc.age_min)} ago` : ''}.` : null, fr.warn);
      const ev = (b.last_events || []).slice(-3);
      const cards = [cardStatus(f)]; if (ev.length) cards.push({ title: 'Latest events', lines: ev.map((e) => `${e.time || ''} ${e.type ? e.type.toUpperCase() + ' · ' : ''}${e.text || ''}`.trim()), route: route('engine') });
      return { text: t, speak: `${stateWords(b.model_state) || 'No state yet'}. ${strip(sessionWords(f.clock))} ${b.position ? 'I am in a trade.' : 'Flat.'}${isNum(b.price) ? ` NQ ${Math.round(b.price).toLocaleString('en-US')}.` : ''}`, cards, chips: ['What size?', 'Should I buy the eval?', 'Next news?', 'This week'] };
    },
    position(f) {
      const p = f.bot?.position, t = posWords(p);
      const extra = !p ? ` ${stateWords(f.bot?.model_state) ? 'The bot is ' + stateWords(f.bot?.model_state) + '.' : ''} When it enters, the stop goes beyond the sweep extreme and the target is the nearest major pool at least 1.5R away.` : '';
      return { text: t + extra, speak: strip(t), cards: p ? [{ title: 'Open position (paper)', kv: [['Side', p.side], ['Entry', px(p.entry)], ['Stop', px(p.stop)], ['Target', px(p.target)], ['Micros', String(p.qty ?? '—')]], route: route('chart'), label: 'Open the chart' }] : undefined, chips: ['What are you doing?', 'Where do you put the stop?', 'Open the chart'] };
    },
    price(f) {
      const b = f.bot || {}, fr = freshness(f);
      const t = isNum(b.price) ? `NQ **${px(b.price)}** (${fr.text}${f.bot?.adapter ? `, ${f.bot.adapter}` : ''}).${fr.warn ? ' ' + fr.warn : ''}` : 'I do not have a price from this build.';
      return { text: t, speak: isNum(b.price) ? `NQ ${Math.round(b.price).toLocaleString('en-US')}.` : t, chips: ['Open the chart', 'Are you in a trade?', 'Status'] };
    },
    size(f) {
      const s = f.size, t = sizeWords(s);
      const cards = s ? [{ title: 'Size filter', kv: [['Mode', s.on === false ? `${sizeName(s.mult ?? s.cold_size)} size` : 'full size'], ['Last signals', isNum(s.sum_r) ? `${fR(s.sum_r)} over ${s.n ?? s.lookback ?? 15}` : '—'], ['Cold size', `×${s.cold_size ?? 0.25}`], ['Late entry', isNum(s.late_mult) ? `×${s.late_mult}` : '—'], ['Risk', `${usd(s.risk_usd ?? 800)} to ${s.ref_stop ?? 20} pts`]], route: route('cold'), label: 'Cold-streak page' }] : undefined;
      return { text: t, speak: strip(t).split(' Rule:')[0], cards, chips: ['Size for a 44 point stop', 'Should I buy the eval?', 'What is a cold streak?'] };
    },
    eval_timing(f) {
      const t = f.eval_timing, txt = timingWords(t);
      const cards = t ? [{ title: 'Eval timing', kv: [['Verdict', t.verdict === 'go' ? 'GO' : 'WAIT'], ['State', t.state || '—'], ['Since flip', isNum(t.since_flip) ? plural(t.since_flip, 'session') : '—'], ['Pass / fail 1 month', `${frac(t.pass_1m)} / ${frac(t.fail_1m)}`], ['Median pass', isNum(t.median_pass) ? `${t.median_pass} sessions` : '—']], route: route('today'), label: 'Today page' }] : undefined;
      return { text: txt, speak: strip(txt.split('\n')[0]), cards, chips: ['How is the eval?', 'Eval odds', 'Fast eval mode'] };
    },
    eval(f) {
      const e = f.eval, t = evalWords(e);
      return { text: t, speak: strip(t).split(' Paper')[0], cards: e ? [{ title: 'MFFU Builder 50K (paper)', kv: [['Balance', usd(e.balance)], ['Profit', money(e.profit)], ['To target', usd(Math.max(0, e.to_target ?? 0))], ['Floor', usd(e.trailing_mll)], ['Cushion', usd(e.cushion)]], route: route('eval'), label: 'Eval tracker' }] : undefined, chips: ['Should I buy the eval?', 'Eval odds', 'Today'] };
    },
    today(f) {
      const d = f.today, tr = d?.trades || [];
      const t = !d ? 'I do not have today\'s ledger from this build.' : !tr.length ? `No trades today${d.day ? ` (${d.day})` : ''} so far. ${stateWords(f.bot?.model_state) ? 'The bot is ' + stateWords(f.bot.model_state) + '.' : ''} ${strip(sessionWords(f.clock))}`.replace(/\s+/g, ' ').trim()
        : lines(`**Today ${d.day || ''}: ${plural(tr.length, 'trade')}, ${money(d.pnl)}.**`, ...tr.map((x) => '• ' + strip(tradeWords(x, false))));
      return { text: t, speak: strip(t.split('\n')[0]), cards: tr.length ? [{ title: 'Today', lines: tr.map((x) => strip(tradeWords(x, false))), route: route('trades'), label: 'All trades' }] : undefined, chips: ['This week', 'Explain the last trade', 'Status'] };
    },
    week(f) {
      const w = f.week, tr = w?.trades || [], n = w?.n ?? tr.length, [lo, hi] = w?.target || [2, 4];
      const pace = n >= lo && n <= hi ? 'on target for 2-4 a week' : n > hi ? 'above the usual 2-4' : `${lo - n} more for the 2-a-week floor`;
      const t = !w ? 'I do not have this week\'s ledger from this build.' : `**Week ${w.label || ''}: ${plural(n, 'trade')}, ${money(w.pnl ?? 0)}** (${pace}).` + (tr.length ? '\n' + tr.map((x) => '• ' + strip(tradeWords(x, false))).join('\n') : ' The paper ledger only counts trades since the cloud monitor started.');
      return { text: t, speak: strip(t.split('\n')[0]), cards: w ? [{ title: 'This week', kv: [['Trades', String(n)], ['P&L', money(w.pnl ?? 0)], ['Target', `${lo}-${hi} a week`]], route: route('today'), label: 'Today page' }] : undefined, chips: ['Today', 'How much does it make?', 'Explain the last trade'] };
    },
    last_trade(f) {
      const t = f.last_trade;
      if (!t) return { text: 'No finished trade in the paper ledger yet, and no replay trade in this build.', speak: 'No finished trade yet.', chips: ['Status', 'How do you trade?'] };
      const txt = lines(t.replay ? 'No paper trade yet, so this is the latest **replay** trade (the backtest of the live settings):' : 'Last paper trade:', tradeWords(t));
      const kv = [['Side', t.side || '—'], ['Trigger', t.trigger || '—'], ['R', fR(t.R)], ['$', money(t.usd)], ['Exit', t.exit_reason || '—']];
      return { text: txt, speak: strip(tradeWords(t, false)), cards: [{ title: `${t.day || ''} ${t.side || ''}`.trim(), kv, lines: t.reasons?.length ? t.reasons : undefined, route: route('trades'), label: 'All trades' }], chips: ['Why did you lose?', 'This week', 'Lessons'] };
    },
    results(f, q) {
      const P = f.results || {}, y = P['2026'], o = P['2021-25'], a = P.all;
      if (!y && !o && !a) return { text: 'I do not have the backtest results from this build.', speak: 'No results in this build.' };
      const wantOdds = /\b(odds|pass|back to back|back-to-back|b2b|evals?)\b/.test(q), wantDD = /\bdrawdown\b/.test(q), wantMonth = /\b(per month|a month|monthly)\b/.test(q), wantPF = /\b(profit factor|pf)\b/.test(q), wantWin = /\b(win rate|how often do you win|win %)\b/.test(q);
      let t;
      if (wantOdds) t = lines('MFFU eval odds from the replay (every possible start day):', evalOddsWords('2026', y), evalOddsWords('2021-25', o), a ? evalOddsWords('5 years', a) : null, 'The owner wants evals decided within 2 weeks; the live strategy decides few that fast, which is why the press exists (and is off).');
      else if (wantDD) t = lines(`Max drawdown: **${money(y?.max_dd)}** in 2026, **${money(o?.max_dd)}** in 2021-25${a ? `, ${money(a.max_dd)} over 5 years` : ''}.`, 'Against a $2,000 trailing max loss that is the real risk: a 2021-25 style drawdown fails an eval.');
      else if (wantPF) t = lines(`Profit factor **${pf(y?.pf)}** in 2026 (${money(y?.net)}), **${pf(o?.pf)}** in 2021-25 (${money(o?.net)})${a ? `, ${pf(a.pf)} over 5 years (${money(a.net)})` : ''}.`, 'PF = $ won ÷ $ lost. Above 1 makes money; 2026 was an unusually good year.');
      else if (wantWin) t = lines(`Win rate **${pct(y?.win_pct)}** in 2026 and **${pct(o?.win_pct)}** in 2021-25. It wins 1 trade in 4-5, and the winners are big (average ${n1(y?.avg_win_r ?? 2.5)}R or so), so long runs without a winner are normal.`);
      else if (wantMonth) t = lines(`Per month: **${money(y?.per_month)}** in 2026, **${money(o?.per_month)}** in 2021-25${a ? `, ${money(a.per_month)} over 5 years` : ''}.`, 'Most months lose a little and a few big trades make the year, so judge it on quarters, not weeks.');
      else t = lines(periodWords('2026', y), periodWords('2021-25', o), a ? periodWords('5 years', a) : null);
      const note = f.strategy?.lock_note && /\$\d+k.*\$\d+k/.test(f.strategy.lock_note) ? f.strategy.lock_note : FIVE_YEAR_NOTE;
      t = lines(t, note);
      const card = (label, p) => !p ? null : { title: label, kv: [['Net', money(p.net)], ['Per month', money(p.per_month)], ['PF', pf(p.pf)], ['Trades/wk', n1(p.per_week)], ['Max DD', money(p.max_dd)], ['Pass 1 month', pct(p.p1m)]], route: route('results'), label: 'Results page' };
      return { text: t, speak: strip(t.split('\n').slice(0, 2).join(' ')), cards: [card('2026', y), card('2021-25', o)].filter(Boolean), chips: ['Eval odds', 'Drawdown', 'Per month', 'What did you learn?'] };
    },
    strategy(f, q) {
      for (const k of Object.keys(GLOSS_RX)) {
        if (GLOSS_RX[k].test(q) && /\b(what is|what are|define|meaning|explain|tell me about|what does)\b/.test(q)) {
          const [, def] = GLOSSARY[k];
          return { text: def, speak: strip(def), cards: [{ title: 'Strategy page', lines: ['The locked rules in plain words, with their numbers'], route: route('strategy'), label: 'Open' }], chips: ['How do you trade?', 'What is a killzone?', 'What is a cold streak?'] };
        }
      }
      const S = f.strategy || {}, steps = S.steps || [];
      const wantStop = /\bstop\b/.test(q) && !/\bcold|size\b/.test(q), wantTarget = /\btarget\b/.test(q), wantEntry = /\b(enter|entry|trigger)\b/.test(q), wantSize = /\b(size|sizing|risk)\b/.test(q), wantManage = /\b(manage|exit|breakeven|time stop)\b/.test(q);
      let t;
      if (wantStop) t = 'The **stop goes beyond the sweep extreme**, the high or low made before the IFVG, never at a fixed distance (10 to 60 points in practice). A wider stop means a smaller size, so the $ risk stays the same or less.';
      else if (wantTarget) t = 'The **target is the nearest major liquidity pool at least 1.5R away**, banking 5R on the way when that pool is farther. No major pool, no trade.';
      else if (wantEntry) t = 'Entry: after a **sweep** of a liquidity pool (from 08:00 ET), the bot enters on an **IFVG or CISD** trigger, only inside the killzones 09:30–11:30 and 13:30–15:30 ET. One trade a day.';
      else if (wantSize) t = sizeWords(f.size) + ' Micros = budget ÷ (stop × $2), rounded down, at most 40.';
      else if (wantManage) t = 'Managing: stop to breakeven at +1R (+3R on trending days), out after 30 minutes if not yet +0.5R, out on a giveback (a +0.5R trade closing back through entry), flat by 15:55. One trade a day.';
      else if (steps.length) t = lines(`**${(S.label || 'Liquidity Engine').split(' (')[0]}**${S.locked ? ' (locked)' : ''}:`, ...steps.map((s) => `${s.n}. **${s.name}**: ${strip(s.text)}`));
      else t = lines('**Liquidity Engine, eval mode:**', '1. **Sweep** of a liquidity pool from 08:00 ET.', '2. **Trigger**: IFVG or CISD inside the killzones (09:30–11:30, 13:30–15:30 ET).', '3. **Stop** beyond the sweep extreme (10–60 pts), never fixed.', '4. **Target**: nearest major pool at least 1.5R away, banking 5R when the draw is farther; no major pool, no trade.', '5. **Manage**: breakeven at 1R (3R trending), 30-min time stop, giveback exit, one trade a day.', 'Size: $800 up to a 20-pt stop, less on wider stops; quarter size in a cold streak, half on late entries.');
      return { text: t, speak: strip(t).replace(/\n/g, ' ').slice(0, 400), cards: [{ title: 'Strategy page', lines: ['Every rule in plain words, with the numbers'], route: route('strategy'), label: 'Open' }], chips: ['Where do you put the stop?', 'How do you size?', 'What is an IFVG?', 'How good is this?'] };
    },
    calculator(f, q) {
      const s = f.size || {}, risk = s.risk_usd ?? 800, ref = s.ref_stop ?? 20, maxM = s.max_micros ?? 40, coldSize = s.cold_size ?? 0.25, lateMult = isNum(s.late_mult) ? s.late_mult : 0.5;
      const m = q.match(/(\d+(?:\.\d+)?)\s*(?:pt|point)?\s*(?:stop)?/), stop = m ? parseFloat(m[1]) : NaN;
      if (!isNum(stop) || stop <= 0) return { text: 'Give me the stop in points, e.g. "size for a 44 point stop" or "30 pts cold".', speak: 'Tell me the stop in points.' };
      const cold = /\bcold\b/.test(q), late = /\blate\b/.test(q), trend = /\btrend/.test(q);
      const budget = risk * Math.min(1, ref / stop), base = Math.min(maxM, Math.floor(budget / (stop * 2)));
      const mult = (cold ? coldSize : 1) * (late ? lateMult : 1) * (trend ? 0.5 : 1);
      const micros = base <= 0 ? 0 : mult >= 1 ? base : Math.max(1, Math.floor(base * mult));
      const atRisk = micros * stop * 2;
      const flags = [cold && `cold ×${coldSize}`, late && `late ×${lateMult}`, trend && 'trending ×0.5'].filter(Boolean).join(', ');
      const t = lines(`**${stop} pt stop${flags ? ` (${flags})` : ''}: ${micros ? plural(micros, 'micro') : 'no trade (0 micros)'}, ${usd(atRisk)} at risk.**`,
        `Budget ${usd(budget)} (${stop <= ref ? `full $${risk} up to ${ref} pts` : `$${risk} × ${ref} ÷ ${stop}`}) ÷ (${stop} × $2) = ${base} micros${mult < 1 ? `, × ${mult} rounded down once, never below 1` : ''}.`,
        micros ? `At 1.5R: **${money(atRisk * 1.5)}**. A 5R bank: **${money(atRisk * 5)}**. One R = ${usd(atRisk)}.` : 'The stop is too wide for even one micro inside the budget.');
      return { text: t, speak: `${stop} point stop: ${micros ? plural(micros, 'micro') : 'no trade'}, ${usd(atRisk)} at risk${micros ? `, ${money(atRisk * 1.5)} at one and a half R` : ''}.`,
        cards: [{ title: 'Size', kv: [['Stop', `${stop} pts`], ['Budget', usd(budget)], ['Micros', String(micros)], ['$ at risk', usd(atRisk)], ['1.5R', money(atRisk * 1.5)], ['5R', money(atRisk * 5)]], route: route('risk'), label: 'Size calculator' }],
        chips: [`${stop} pts cold`, `${stop} pts late`, 'How do you size?'] };
    },
    news(f, q) {
      const N = f.news;
      if (!N) return { text: 'I do not have the news feed from this build.', speak: 'No news feed in this build.' };
      const today = N.today || {}, up = (N.upcoming || []).slice(0, 5), hl = (N.headlines || []).slice(0, 5);
      const wantHead = /\b(headline|headlines|moving the dollar|the dollar|dxy|usd|what is moving)\b/.test(q), wantFomc = /\bfomc|fed day|fed\b/.test(q), wantClear = /\b(clear|blackout|blackouts|am i)\b/.test(q);
      let t;
      if (wantHead) t = hl.length ? lines('Top headlines:', ...hl.map((h) => `• ${h.title}${h.tone ? ` (${h.tone}${isNum(h.score) ? ` ${h.score > 0 ? '+' : ''}${h.score}` : ''})` : ''}${h.source ? ` — ${h.source}` : ''}`)) : 'No headlines in this build (the news hub was built offline or the feeds were down).';
      else if (wantFomc) t = lines(today.fomc ? '**Yes, FOMC day.** The bot skips the PM killzone and stays out around the statement.' : 'Not an FOMC day.', newsNext(N));
      else if (wantClear) t = lines(light(N) ? `Bot light **${light(N)}**` : null, today.blackouts?.length ? `Blackouts today: ${today.blackouts.join('; ')}.` : 'No blackout today.', today.killzone_pauses?.length ? `Killzone pauses: ${today.killzone_pauses.join('; ')}.` : null, newsNext(N));
      else t = lines(newsNext(N), light(N) ? `Bot light ${light(N)}.` : null, today.summary || null, up.length ? 'Coming up: ' + up.map((e) => `${e.title}${e.t ? ` (${e.t})` : ''}${e.blackout ? ' ⛔' : ''}`).join(' · ') : null);
      const cards = [{ title: 'News', kv: [N.next ? ['Next', N.next.title] : null, N.next && isNum(N.next.in_min) ? ['In', mins(Math.max(0, N.next.in_min))] : null, N.bot_now ? ['Bot light', N.bot_now.light] : null, ['Blackouts today', String(today.blackouts?.length || 0)]].filter(Boolean), route: route('news'), label: 'News page' }];
      return { text: t, speak: strip(t.split('\n').slice(0, 2).join(' ')), cards, chips: ['Am I clear to trade?', 'Headlines', 'Status'] };
    },
    pc(f) {
      const pc = f.bot?.pc;
      if (!pc || !pc.present) return { text: `The PC is **not reporting** (${pc?.reason || 'no heartbeat'}). Only the cloud paper bot is running: GitHub Actions every 15 minutes in the killzones.`, speak: 'The PC is not reporting. Only the cloud bot is running.', chips: ['Status', 'What are you doing?'] };
      const t = `PC bot **${pc.silent ? 'SILENT' : pc.running === false ? 'stopped' : 'alive'}**${pc.host ? ` on ${pc.host}` : ''}${pc.adapter ? ` (${pc.adapter})` : ''}${isNum(pc.age_min) ? `, last heartbeat ${mins(pc.age_min)} ago` : ''}${pc.model_state ? `, state ${pc.model_state}` : ''}.`;
      return { text: t, speak: strip(t), cards: [{ title: 'PC heartbeat', kv: [['Alive', pc.silent ? 'no' : 'yes'], ['Running', pc.running === false ? 'no' : 'yes'], ['Last seen', isNum(pc.age_min) ? mins(pc.age_min) + ' ago' : '—']], route: route('engine'), label: 'Engine page' }], chips: ['Status', 'Are you in a trade?'] };
    },
    research(f, q) {
      const L = f.lab || {}, runs = L.runs || [], W = L.writeups || [];
      if (/\b(what is rejected|what was rejected|rejected|tried and failed|what did not work|what failed)\b/.test(q)) {
        const rj = f.rejected?.length ? f.rejected : REJECTED_DEFAULT;
        return { text: lines('Tested and rejected (do not redo without a new idea):', ...rj.map((x) => '• ' + x)), speak: `${rj.length} ideas were tested and rejected, from fixed stops to the published ICT models.`, cards: [{ title: 'Experiments', lines: ['Every stored run with its verdict'], route: route('experiments') || route('lab'), label: 'Open' }], chips: ['What did you learn?', 'Lessons', 'What about EMAs?'] };
      }
      if (/\blessons?\b/.test(q) && !/\bwrite/.test(q)) {
        const ls = L.lessons || {};
        if (!ls.wins?.length && !ls.losses?.length) return { text: 'I do not have the lessons from this build.', speak: 'No lessons in this build.' };
        return { text: lines(ls.wins?.length ? '**Wins:** ' + ls.wins.join(' · ') : null, ls.losses?.length ? '**Losses:** ' + ls.losses.join(' · ') : null, 'Only a pattern that holds in both 2021-25 and 2026 counts as a lesson.'), speak: strip((ls.losses || ls.wins || []).slice(0, 2).join('. ')), cards: [{ title: 'Lessons', route: route('lab'), label: 'Open the Lab', lines: (ls.losses || []).slice(0, 3) }], chips: ['Why did you lose?', 'What did you test?'] };
      }
      const runQ = q.match(/\b(?:show|open|run|experiment)\s+(?:run\s+|experiment\s+)?([a-z0-9_.-]+)\b/);
      if (runQ && runs.length) {
        const key = runQ[1], r = runs.find((x) => x.id === key) || runs.find((x) => x.id?.includes(key)) || runs.find((x) => (x.title || '').toLowerCase().includes(key));
        if (r) {
          const sp = (s) => s ? `${money(s.net)} (PF ${pf(s.pf)}, ${n1(s.tpw)}/wk)` : '—';
          const t = lines(`**${r.title || r.id}** (${r.family || 'other'}, ${r.status || 'info'}): ${r.verdict || ''}`, `2026: ${sp(r.s2026)} · 5 years: ${sp(r.s5y)}`);
          return { text: t, speak: strip(t.split('\n')[0]), cards: [{ title: r.title || r.id, kv: [['2026 net', money(r.s2026?.net)], ['2026 PF', pf(r.s2026?.pf)], ['5y net', money(r.s5y?.net)], ['5y PF', pf(r.s5y?.pf)]], route: route('run', r.id), label: 'Open the run' }], chips: ['What did you learn?', 'What is rejected?'] };
        }
      }
      // keyword lookup in the write-ups
      const words = q.replace(/\b(what|did|you|learn|test|tested|about|the|a|an|is|are|do|does|would|help|work|have|has|research|idea|try|tried|show|me|of|on|for|in|to|and|or|with|any|your|there|something|stuff|anything)\b/g, ' ').split(/\s+/).filter((w) => w.length > 2);
      const SYN = { ema: ['moving', 'average', 'ema'], emas: ['moving', 'average', 'ema'], 'average': ['moving', 'ema'], vwap: ['vwap', 'volume', 'profile'], calendar: ['calendar', 'seasonal', 'weekday'], stress: ['stress', 'robust'], monte: ['monte', 'carlo', 'evals'], carlo: ['monte', 'carlo'],
        stops: ['stop', 'stops'], stop: ['stop', 'stops'], targets: ['target', 'targets'], target: ['target', 'targets'], bias: ['bias', 'filters'], inducement: ['inducement', 'construction', 'smc'], trailing: ['management', 'trail'], trail: ['management'], partials: ['management'],
        breakeven: ['management', 'breakeven'], regime: ['filters', 'robust'], vix: ['filters', 'bias'], drawdown: ['expect', 'streaks'], streaks: ['expect', 'streak'], losing: ['loss', 'anatomy'], losses: ['loss', 'anatomy'], hour: ['intraday'], weekday: ['calendar', 'intraday'], time: ['intraday'],
        risk: ['risk', 'sizing'], sizing: ['risk', 'sizing'], size: ['risk', 'sizing'], eval: ['eval'], leakage: ['leakage'], robustness: ['robust'], parameter: ['robust', 'parameter'], expect: ['expect'] };
      const terms = new Set(); words.forEach((w) => { terms.add(w); (SYN[w] || []).forEach((s) => terms.add(s)); });
      const score = (d) => { const hay = `${d.title || ''} ${d.summary || ''} ${d.family || ''} ${d.slug || ''}`.toLowerCase(); let s = 0; terms.forEach((t) => { if (hay.includes(t)) s += (d.title || '').toLowerCase().includes(t) || (d.slug || '').includes(t) ? 3 : 1; }); return s; };
      const hits = W.map((d) => [score(d), d]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 3).map((x) => x[1]);
      if (!hits.length) {
        if (!W.length) return { text: 'I do not have the write-ups from this build.', speak: 'No write-ups in this build.' };
        const latest = W.slice(0, 3);
        return { text: lines('Nothing in the write-ups matches that word. The latest findings:', ...latest.map((d) => `• **${d.title}** (${d.status || 'finding'})`)), speak: 'Nothing matches that in the research. Here are the latest write-ups.', cards: latest.map((d) => ({ title: d.title, lines: [d.summary ? d.summary.slice(0, 160) + (d.summary.length > 160 ? '…' : '') : ''], route: route('writeup', d.slug), label: 'Read' })), chips: ['What is rejected?', 'Lessons', 'What about VWAP?'] };
      }
      const t = lines(...hits.map((d) => `**${d.title}** (${d.family || 'other'} · ${d.status || 'finding'}): ${d.summary || ''}`));
      return { text: t, speak: strip(`${hits[0].title}. ${(hits[0].summary || '').split(/(?<=\.)\s/).slice(0, 2).join(' ')}`), cards: hits.map((d) => ({ title: d.title, lines: [d.summary ? d.summary.slice(0, 180) + (d.summary.length > 180 ? '…' : '') : ''], route: route('writeup', d.slug), label: 'Read the write-up' })), chips: ['What is rejected?', 'Lessons', 'How good is this?'] };
    },
    press(f) {
      const s = f.strategy?.sizing || {}, on = !!s.press, P = f.results || {}, o = P['2021-25'], y = P['2026'];
      const t = lines(`The fast-eval **press is ${on ? 'ON' : 'OFF'}**. The owner's rule: an eval should be decided within 2 weeks and never take more than 3 weeks to pass.`,
        y || o ? `Today the live strategy decides few evals that fast: within 2 weeks ${pct(y?.p2w)} pass / ${pct(y?.f2w)} fail in 2026 and ${pct(o?.p2w)} / ${pct(o?.f2w)} in 2021-25${isNum(o?.pass_med) ? `; median pass ${Math.round(o.pass_med)} sessions in 2021-25` : ''}.` : null,
        'The press (full $800 risk on any stop up to 60 pts while the eval is above its floor) roughly halves the time to pass but fails about twice as many evals. It stays off until the research proves it in both periods.');
      return { text: t, speak: `The press is ${on ? 'on' : 'off'}. It halves the time to pass but fails about twice as many evals.`, cards: [{ title: 'Simulated evals', lines: ['Odds and paths by week'], route: route('evals'), label: 'Open' }], chips: ['Eval odds', 'Should I buy the eval?', 'What is the press?'] };
    },
    navigation(f, q) {
      const r = f.routes || {};
      const map = [[/\bchart\b/, 'chart', 'the chart'], [/\btrade\b/, 'trades', 'the trades'], [/\bnews|calendar|headline\b/, 'news', 'news'], [/\bsettings?\b/, 'settings', 'settings'], [/\bstrategy|rules\b/, 'strategy', 'the strategy'], [/\bresults?\b/, 'results', 'results'],
        [/\bwrite-?ups?|docs?\b/, 'writeups', 'the write-ups'], [/\blab\b/, 'lab', 'the Lab'], [/\bevals?\b/, /\beval page|eval tracker|mffu\b/.test(q) ? 'eval' : 'evals', /\beval page|eval tracker|mffu\b/.test(q) ? 'the eval tracker' : 'the simulated evals'], [/\bintraday|heat\b/, 'intraday', 'intraday'],
        [/\bcold\b/, 'cold', 'the cold-streak page'], [/\brisk|sizing|calculator\b/, 'risk', 'risk & sizing'], [/\bengine|bot page\b/, 'engine', 'the engine'], [/\btoday|home|dashboard\b/, 'today', 'today']];
      const hit = map.find(([rx]) => rx.test(q));
      if (!hit || !r[hit[1]]) return { text: 'I can open: today, chart, trades, results, lab, write-ups, evals, intraday, news, strategy, cold-streak, risk, eval tracker, engine, settings.', speak: 'Which page? Chart, trades, news, strategy, results or settings.', chips: ['Open the chart', 'Show me the trades', 'Go to news'] };
      return { text: `Opening ${hit[2]}.`, speak: `Opening ${hit[2]}.`, route: r[hit[1]] };
    },
    control(f, q) {
      const c = /\b(mute|be quiet|quiet|shut up|silence|stop talking|stop speaking|hush|voice off|sound off)\b/.test(q) ? 'mute' : /\b(unmute|talk to me|speak|voice on|sound on|say it|read it out)\b/.test(q) ? 'unmute' : /\b(clear|reset|start over|new chat|wipe|forget)\b/.test(q) ? 'clear' : /\b(repeat|again|say that|what did you say|come again|one more)\b/.test(q) ? 'repeat' : 'help';
      const texts = { mute: 'Muted. I will keep answering in text.', unmute: 'Voice on. I will read my answers out loud.', clear: 'Chat cleared.', repeat: lastReply ? lastReply.text : 'Nothing to repeat yet.', help: lines('Ask me in plain words, for example:', '• what are you doing · are you in a trade · where is NQ', '• what size · should I buy the eval · how is the eval', '• today · this week · explain the last trade', '• how much does it make · eval odds · drawdown', '• how do you trade · where do you put the stop · what is an IFVG', '• size for a 44 point stop · 30 pts cold', '• next news · am I clear to trade · headlines', '• is the PC on · what did you learn · what about EMAs · what is rejected', '• open the chart · mute · clear the chat') };
      const speak = { mute: '', unmute: 'Voice on.', clear: 'Cleared.', repeat: lastReply ? lastReply.speak : 'Nothing to repeat yet.', help: 'Ask me what I am doing, what size, whether to buy the eval, or how much it makes.' };
      return { text: texts[c], speak: speak[c], control: c, cards: c === 'help' ? [{ title: 'Everything I can answer', lines: INTENTS.filter((i) => !['control', 'smalltalk'].includes(i.name)).map((i) => `${i.name.replace('_', ' ')}: “${i.examples[0]}”`) }] : (c === 'repeat' ? lastReply?.cards : undefined), chips: c === 'help' ? suggestions() : undefined };
    },
    smalltalk(f, q) {
      const c = f.clock || {}, h = c.et ? parseInt(c.et.slice(0, 2), 10) : NaN;
      let t;
      if (/\b(who are you|what are you|your name)\b/.test(q)) t = 'I am Jarvis, the voice of Zenith, your NQ futures bot app: paper only, MFFU Builder 50K eval. I answer from the bot\'s own data and never place real orders.';
      else if (/\b(thanks|thank you|thx|ty|cheers|good job|well done|nice work|good bot|good boy|love it)\b/.test(q)) t = 'Any time. Ask me what I am doing or what size we are at.';
      else if (/\b(how are you|you good|how are you doing)\b/.test(q)) t = `Running fine. ${strip(sessionWords(c)).split('.')[0]}. Ask me what I am doing.`;
      else if (/\b(bye|goodbye|see you|later|good night|gn)\b/.test(q)) t = 'Talk soon. I keep watching the killzones.';
      else t = `${isNum(h) ? (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') : 'Hello'}. ${f.bot?.model_state ? `The bot is ${stateWords(f.bot.model_state)}.` : ''} Ask me what I am doing.`;
      return { text: t, speak: t, chips: suggestions() };
    },
  };

  // ---- scoring
  function scoreAll(q) {
    const padded = ' ' + q + ' ';
    return INTENTS.map((it) => {
      let s = 0;
      for (const [w, rx] of it.pat) if (rx.test(it.name === 'control' || it.name === 'smalltalk' || it.name === 'navigation' ? q : padded) || rx.test(q)) s += w;
      if (it.name === 'smalltalk' && q.split(' ').length > 5) s -= 3;
      return { name: it.name, score: s };
    }).sort((a, b) => b.score - a.score);
  }
  function classify(q) {
    const ranked = scoreAll(q);
    const best = ranked[0];
    return { best: best.score >= MIN_SCORE ? best.name : null, ranked };
  }
  function builtin(text) {
    const q = normalize(text), f = F();
    const { best, ranked } = classify(q);
    let reply;
    if (!best) {
      const closest = ranked.filter((r) => r.score > 0).slice(0, 3).map((r) => INTENTS.find((i) => i.name === r.name).examples[0]);
      const chips = closest.length ? closest : suggestions().slice(0, 3);
      reply = { text: 'I did not catch that. I can tell you about what I am doing, size, the eval, today or this week, results, the rules, news, the PC and the research.', speak: 'I did not catch that. Try asking what I am doing, or what size.', chips, intent: 'fallback', score: ranked[0]?.score || 0 };
    } else {
      reply = R[best](f, q);
      reply.intent = best; reply.score = ranked[0].score;
      if (!reply.speak) reply.speak = reply.control === 'mute' ? '' : strip(reply.text).split('\n')[0].slice(0, 300);
      if (!reply.chips && !reply.control) reply.chips = suggestions().slice(0, 3);
    }
    return reply;
  }

  // ---- the now-briefing
  function briefing() {
    const f = F(), fr = freshness(f), b = f.bot || {}, s = f.size, t = f.eval_timing, d = f.today, w = f.week, N = f.news;
    const parts = [
      `${fr.text}: **${stateWords(b.model_state) || 'no state yet'}**. ${strip(sessionWords(f.clock))}`,
      posWords(b.position),
      s ? (s.on === false ? `Size: **${sizeName(s.mult ?? s.cold_size)}** (cold streak, last ${s.n ?? 15} signals ${fR(s.sum_r)}).` : `Size: **full** (last ${s.n ?? 15} signals ${fR(s.sum_r)}).`) : null,
      t ? `Eval timing: **${t.verdict === 'go' ? (t.best ? 'GO, best window' : 'GO' + (t.state === 'stale' ? ', late start' : '')) : 'WAIT'}**, ${frac(t.pass_1m)} pass / ${frac(t.fail_1m)} fail within a month for starts like this.` : null,
      d ? (d.trades?.length ? `Today: ${plural(d.trades.length, 'trade')}, ${money(d.pnl)}.` : 'Today: no trades yet.') : null,
      w ? `Week: ${plural(w.n ?? (w.trades || []).length, 'trade')}, ${money(w.pnl ?? 0)} (target 2-4).` : null,
      N?.next ? strip(newsNext(N)) : null,
      b.pc ? (b.pc.present ? `PC bot ${b.pc.silent ? 'SILENT' : 'alive'}.` : 'PC not reporting (cloud only).') : null,
      fr.warn,
    ];
    const text = lines(...parts);
    const speak = strip([parts[0], parts[1], parts[2], parts[3], parts[6]].filter(Boolean).join(' ')).replace(/\s+/g, ' ');
    return { text, speak, cards: [cardStatus(f)], chips: suggestions(), intent: 'briefing' };
  }

  // ---- context-aware starter chips
  function suggestions() {
    const f = F(), s = f.clock?.session, out = [];
    if (f.bot?.position) out.push('Where is your stop?', 'What is the target?');
    if (['am_killzone', 'pm_killzone'].includes(s)) out.push('What are you doing?', 'Am I clear to trade?');
    else if (s === 'weekend') out.push('How was the week?', 'Should I buy the eval?', 'How much does it make?');
    else if (s === 'closed' || s === 'after_pm') out.push('What happened today?', 'This week');
    else out.push('What are you doing?', 'Next news?');
    if (f.size?.on === false) out.push('Why quarter size?', 'Should I buy the eval?');
    else out.push('What size?');
    if (f.eval_timing?.verdict === 'go' && !out.includes('Should I buy the eval?')) out.push('Should I buy the eval?');
    out.push('Explain the last trade', 'How good is this?', 'What did you learn?');
    return [...new Set(out)].slice(0, 7);
  }

  // ---- optional smart mode (the owner's own key, browser -> Anthropic API; falls back to the built-in reply on any error)
  function compactFacts(f) {
    const c = JSON.parse(JSON.stringify(f || {}));
    if (c.lab) { c.lab.runs = (c.lab.runs || []).slice(0, 15); c.lab.writeups = (c.lab.writeups || []).slice(0, 12).map((w) => ({ ...w, summary: (w.summary || '').slice(0, 400) })); }
    if (c.news) { c.news.headlines = (c.news.headlines || []).slice(0, 10); c.news.upcoming = (c.news.upcoming || []).slice(0, 10); }
    if (c.strategy?.markdown) c.strategy.markdown = String(c.strategy.markdown).slice(0, 6000);
    if (c.bot?.last_events) c.bot.last_events = c.bot.last_events.slice(-10);
    if (c.week?.trades) c.week.trades = c.week.trades.slice(-10);
    delete c.routes;
    return c;
  }
  const SYSTEM = `You are Jarvis, the voice of the owner's NQ futures trading bot (Liquidity Engine, MFFU Builder 50K eval, PAPER ONLY: it never places real orders, say so if asked).
Rules: plain words, short, result-first, 1-4 sentences. Money in $ next to every R or profit factor. Answer ONLY from the FACTS JSON; never invent a number; if a field is missing say you do not have it from the cloud build. The owner is not a coder and reads on a phone. Judge every idea on 2026 AND 2021-25. 2-4 trades a week is the rule. Markdown-light only (**bold**). No emojis.`;
  async function smart(text, fallback) {
    const f = compactFacts(F());
    const hist = log.slice(-6).map((m) => ({ role: m.role === 'you' ? 'user' : 'assistant', content: m.text }));
    // the API needs alternating roles starting with user
    const msgs = []; for (const m of hist) { if (!msgs.length && m.role !== 'user') continue; if (msgs.length && msgs[msgs.length - 1].role === m.role) msgs[msgs.length - 1].content += '\n' + m.content; else msgs.push(m); }
    if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
    msgs.push({ role: 'user', content: text });
    const body = { model: llm.model || DEFAULT_MODEL, max_tokens: 500, system: [{ type: 'text', text: SYSTEM }, { type: 'text', text: 'FACTS (built ' + (f.built || '?') + '):\n' + JSON.stringify(f) }, { type: 'text', text: 'The built-in deterministic answer, for reference (you may improve the wording, never the numbers):\n' + strip(fallback.text) }], messages: msgs, output_config: { effort: 'low' } };
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const timer = ctl ? setTimeout(() => ctl.abort(), 20000) : null;
    try {
      const r = await fetch(API_URL, { method: 'POST', signal: ctl?.signal, headers: { 'x-api-key': llm.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { let msg = 'HTTP ' + r.status; try { const j = await r.json(); msg += ' ' + (j.error?.message || '').slice(0, 120); } catch { } throw new Error(msg); }
      const j = await r.json();
      if (j.stop_reason === 'refusal') throw new Error('refused');
      const out = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (!out) throw new Error('empty reply');
      return { ...fallback, text: out, speak: strip(out).slice(0, 400), smart: true };
    } catch (e) {
      const reason = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'error').replace(/^TypeError: /, '') || 'network';
      return { ...fallback, text: fallback.text + `\n(built-in answer; smart mode failed: ${reason})`, smartError: reason };
    } finally { if (timer) clearTimeout(timer); }
  }

  async function ask(text) {
    const t = String(text || '').trim();
    if (!t) return { text: 'Say something and I will answer from the bot\'s data.', speak: '', chips: suggestions(), intent: 'empty' };
    push('you', t);
    let reply = builtin(t);
    if (llm.on && llm.key && !reply.control && reply.intent !== 'navigation') reply = await smart(t, reply);
    if (reply.control !== 'repeat') lastReply = reply;
    if (reply.control === 'clear') { log = []; storage.set(LOG_KEY, log); return reply; }
    push('bot', reply.text);
    return reply;
  }

  return {
    ask, briefing, suggestions, normalize, classify: (text) => classify(normalize(text)), builtin,
    get intents() { return INTENTS.map((i) => ({ name: i.name, examples: i.examples.slice() })); },
    setLLM(o = {}) { llm = { ...llm, ...o }; if (!llm.model) llm.model = DEFAULT_MODEL; storage.set(LLM_KEY, { on: !!llm.on, key: llm.key || '', model: llm.model }); return this.llm; },
    forgetKey() { llm.key = ''; llm.on = false; storage.set(LLM_KEY, { on: false, key: '', model: llm.model }); },
    get llm() { return { on: !!(llm.on && llm.key), model: llm.model || DEFAULT_MODEL, hasKey: !!llm.key, keyMasked: llm.key ? llm.key.slice(0, 7) + '…' + llm.key.slice(-4) : '' }; },
    history: () => log.slice(), clear() { log = []; storage.set(LOG_KEY, log); lastReply = null; },
    note(role, text) { push(role, text); },
    glossary: GLOSSARY,
  };
}
export default createBrain;
