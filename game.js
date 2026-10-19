'use strict';

(() => {
  // ================= Config =================
  const SAVE_KEY = 'imsaclicker.save.v1';
  const OFFLINE_CAP_S = 8 * 3600;
  const OFFLINE_RATE = 0.5;
  const COST_GROWTH = 1.15;
  const MILESTONES = [25, 50, 100, 150, 200, 300, 400, 500];
  const CP_DIVISOR = 1e6;      // CP = floor(sqrt(lifetime earned / divisor))
  const CP_BONUS = 0.05;       // +5% income per Championship Point
  const TROPHY_BONUS = 0.10;   // +10% income per race win this season
  const PUSH_COOLDOWN_MS = 120000;

  const GENS = [
    { name: 'Mechanic',            icon: '🔧', desc: 'Turns wrenches through the night.',            base: 15,     ips: 0.1 },
    { name: 'Tire Specialist',     icon: '🛞', desc: 'Reads rubber like a book.',                    base: 100,    ips: 1 },
    { name: 'Pit Crew',            icon: '⛽', desc: 'Fuel, four tires and a driver change.',        base: 1100,   ips: 8 },
    { name: 'Race Engineer',       icon: '🎧', desc: 'Calls the strategy on the radio.',             base: 12000,  ips: 47 },
    { name: 'Data Analyst',        icon: '📊', desc: 'Finds tenths hidden in the telemetry.',        base: 1.3e5,  ips: 260 },
    { name: 'Simulator Rig',       icon: '🕹️', desc: 'Thousands of laps before the green flag.',     base: 1.4e6,  ips: 1400 },
    { name: 'Wind Tunnel',         icon: '🌬️', desc: 'Downforce for days.',                          base: 2e7,    ips: 7800 },
    { name: 'Title Sponsor',       icon: '💼', desc: 'Their logo on your livery.',                   base: 3.3e8,  ips: 44000 },
    { name: 'Hospitality Village', icon: '🎪', desc: 'VIP paddock guests fund the program.',         base: 5.1e9,  ips: 2.6e5 },
    { name: 'Factory Program',     icon: '🏭', desc: 'Full manufacturer backing.',                   base: 7.5e10, ips: 1.6e6 },
    { name: 'Hybrid R&D Center',   icon: '🔋', desc: 'Masters of the spec hybrid system.',           base: 1e12,   ips: 1e7 },
    { name: 'Endurance Dynasty',   icon: '👑', desc: 'Legends of the long race.',                    base: 1.4e13, ips: 6.5e7 },
  ];

  const CLASSES = [
    { name: 'GTD',     color: '#1fa84f', trim: '#0d5c2a', accent: '#ffffff', mult: 1,  cost: 0,    shape: 'gt',    num: 23, desc: 'Customer GT3 machinery. Every dynasty starts somewhere.' },
    { name: 'GTD PRO', color: '#d7262e', trim: '#7d1015', accent: '#ffffff', mult: 2,  cost: 5e4,  shape: 'gt',    num: 3,  desc: 'Factory GT3 with pro drivers. x2 all income.' },
    { name: 'LMP2',    color: '#1f5fd1', trim: '#0e2f72', accent: '#ffffff', mult: 6,  cost: 5e7,  shape: 'proto', num: 52, desc: 'Spec prototype, pure downforce. x3 more income.' },
    { name: 'GTP',     color: '#16181d', trim: '#f2c230', accent: '#f2c230', mult: 30, cost: 5e10, shape: 'proto', num: 7,  desc: 'Hybrid top class, fighting for the overall win. x5 more income.' },
  ];

  const TRACKS = [
    { name: 'Daytona 24',              place: 'Daytona Beach, FL',  hours: 24,  req: 3 },
    { name: 'Sebring 12 Hours',        place: 'Sebring, FL',        hours: 12,  req: 60 },
    { name: 'Long Beach Street Race',  place: 'Long Beach, CA',     hours: 1.7, req: 1200 },
    { name: 'Laguna Seca',             place: 'Monterey, CA',       hours: 2.7, req: 2.5e4 },
    { name: 'Detroit Street Race',     place: 'Detroit, MI',        hours: 1.7, req: 4e5 },
    { name: 'Watkins Glen 6 Hours',    place: 'Watkins Glen, NY',   hours: 6,   req: 8e6 },
    { name: 'Mosport',                 place: 'Bowmanville, ON',    hours: 2.7, req: 1.5e8 },
    { name: 'Road America',            place: 'Elkhart Lake, WI',   hours: 2.7, req: 3e9 },
    { name: 'VIR',                     place: 'Alton, VA',          hours: 2.7, req: 6e10 },
    { name: 'Indianapolis',            place: 'Indianapolis, IN',   hours: 6,   req: 1.2e12 },
    { name: 'Petit Le Mans',           place: 'Braselton, GA',      hours: 10,  req: 2.5e13 },
  ];
  const FIELD = 20;

  // Upgrades: generated per team member + hand-made ones.
  const TIER_REQ = [1, 10, 25, 50, 100, 150, 200];
  const TIER_COST = [10, 100, 1e3, 1e5, 1e7, 1e9, 1e11];
  const TIER_NAMES = ['Fresh Gear', 'Pro Training', 'Carbon Fiber', 'Factory Support', 'Championship DNA', 'Hall of Fame', 'Living Legends'];
  const UPGRADES = [];
  GENS.forEach((g, i) => {
    TIER_REQ.forEach((req, t) => {
      UPGRADES.push({
        id: `g${i}t${t}`, icon: g.icon, name: `${g.name}: ${TIER_NAMES[t]}`,
        desc: `${g.name} output x2.`, cost: g.base * TIER_COST[t],
        type: 'gen', gen: i, val: 2, req: () => S.gens[i] >= req,
      });
    });
  });
  const seen = (c) => () => S.seasonEarned >= c * 0.3;
  UPGRADES.push(
    { id: 'tap1', icon: '🧤', name: 'Racing Gloves',        desc: 'Tap value x2.',                       cost: 100,   type: 'tap',      val: 2 },
    { id: 'tap2', icon: '🎮', name: 'Paddle Shifters',      desc: 'Tap value x2.',                       cost: 1e4,   type: 'tap',      val: 2 },
    { id: 'tap3', icon: '💺', name: 'Carbon Seat Fitting',  desc: 'Tap value x2.',                       cost: 1e6,   type: 'tap',      val: 2 },
    { id: 'tap4', icon: '🧑‍🏫', name: 'Driver Coaching',      desc: 'Taps also earn 1% of your $/sec.',   cost: 5e4,   type: 'tapPct',   val: 0.01 },
    { id: 'tap5', icon: '📡', name: 'Telemetry Overlay',    desc: 'Taps earn another 2% of $/sec.',      cost: 5e6,   type: 'tapPct',   val: 0.02 },
    { id: 'tap6', icon: '🏎️', name: 'Pro Driver Lineup',    desc: 'Taps earn another 3% of $/sec.',      cost: 5e9,   type: 'tapPct',   val: 0.03 },
    { id: 'tap7', icon: '🥇', name: 'Endurance Ace',        desc: 'Taps earn another 4% of $/sec.',      cost: 5e12,  type: 'tapPct',   val: 0.04 },
    { id: 'glb1', icon: '💡', name: 'Night Stint Lights',   desc: 'All income x1.25.',                   cost: 1e5,   type: 'global',   val: 1.25 },
    { id: 'glb2', icon: '🌧️', name: 'Weather Radar',        desc: 'All income x1.5.',                    cost: 1e7,   type: 'global',   val: 1.5 },
    { id: 'glb3', icon: '🧠', name: 'Strategy Software',    desc: 'All income x1.5.',                    cost: 1e9,   type: 'global',   val: 1.5 },
    { id: 'glb4', icon: '⏱️', name: 'Endurance Mindset',    desc: 'All income x2.',                      cost: 1e11,  type: 'global',   val: 2 },
    { id: 'glb5', icon: '🌍', name: 'Global Fanbase',       desc: 'All income x2.',                      cost: 1e13,  type: 'global',   val: 2 },
    { id: 'psh1', icon: '📻', name: 'Pit Wall Radio',       desc: 'PUSH lasts 45s instead of 30s.',      cost: 2e5,   type: 'pushDur',  val: 45 },
    { id: 'psh2', icon: '🗺️', name: 'Fuel Mapping',         desc: 'PUSH boost becomes x3.',              cost: 2e8,   type: 'pushMult', val: 3 },
    { id: 'psh3', icon: '🔥', name: 'Qualifying Mode',      desc: 'PUSH boost becomes x5.',              cost: 2e11,  type: 'pushMult', val: 5 },
    { id: 'rac1', icon: '🏆', name: 'Podium Bonus Clause',  desc: 'Race prize money x3.',                cost: 5e5,   type: 'prize',    val: 3 },
    { id: 'rac2', icon: '📜', name: 'Manufacturer Bonus',   desc: 'Race prize money x3.',                cost: 5e9,   type: 'prize',    val: 3 },
  );
  UPGRADES.forEach(u => { if (!u.req) u.req = seen(u.cost); });
  const UPG_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

  // ================= State =================
  const defaults = () => ({
    v: 1,
    money: 0,
    seasonEarned: 0,
    totalEarned: 0,
    gens: GENS.map(() => 0),
    upgrades: [],
    classIdx: 0,
    best: TRACKS.map(() => 0), // best finishing position this season (0 = never)
    race: null,
    cp: 0,
    seasons: 0,
    pushUntil: 0,
    pushReadyAt: 0,
    stats: { taps: 0, races: 0, wins: 0, bonuses: 0, playTime: 0, started: Date.now() },
    settings: { haptics: true },
    lastSave: Date.now(),
  });

  let S = load();
  let owned = new Set(S.upgrades);
  let buyMode = '1';

  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return d;
      const s = JSON.parse(raw);
      const out = Object.assign(d, s);
      out.gens = GENS.map((_, i) => (s.gens && s.gens[i]) || 0);
      out.best = TRACKS.map((_, i) => (s.best && s.best[i]) || 0);
      out.stats = Object.assign(defaults().stats, s.stats || {});
      out.settings = Object.assign(defaults().settings, s.settings || {});
      out.upgrades = (s.upgrades || []).filter(id => UPG_BY_ID[id]);
      return out;
    } catch (e) {
      return d;
    }
  }

  function save() {
    S.upgrades = [...owned];
    S.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }

  // ================= Formatting =================
  const UNITS = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) {
      if (n < 10 && n % 1 !== 0) return n.toFixed(1);
      return Math.floor(n).toString();
    }
    const e = Math.floor(Math.log10(n) / 3);
    if (e > UNITS.length) return n.toExponential(2);
    const v = n / Math.pow(10, e * 3);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString()) + UNITS[e - 1];
  }
  const money = (n) => '$' + fmt(n);
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
  const ordinal = (p) => 'P' + p;

  // ================= Economy =================
  function upgradeProduct(type) {
    let m = 1;
    for (const id of owned) { const u = UPG_BY_ID[id]; if (u.type === type) m *= u.val; }
    return m;
  }
  function upgradeMax(type, fallback) {
    let v = fallback;
    for (const id of owned) { const u = UPG_BY_ID[id]; if (u.type === type) v = Math.max(v, u.val); }
    return v;
  }
  function trophies() { return S.best.filter(p => p === 1).length; }
  function pushActive(now = Date.now()) { return now < S.pushUntil; }
  function pushMult() { return upgradeMax('pushMult', 2); }
  function pushDur() { return upgradeMax('pushDur', 30); }

  function genMult(i) {
    let m = 1;
    const c = S.gens[i];
    for (const t of MILESTONES) if (c >= t) m *= 2;
    for (const id of owned) { const u = UPG_BY_ID[id]; if (u.type === 'gen' && u.gen === i) m *= u.val; }
    return m;
  }
  function permanentMult() {
    return CLASSES[S.classIdx].mult * (1 + CP_BONUS * S.cp) * (1 + TROPHY_BONUS * trophies()) * upgradeProduct('global');
  }
  function globalMult(now) {
    return permanentMult() * (pushActive(now) ? pushMult() : 1);
  }
  function genIps(i, now) { return GENS[i].ips * genMult(i) * globalMult(now); }
  function totalIps(now = Date.now(), withPush = true) {
    let base = 0;
    for (let i = 0; i < GENS.length; i++) base += S.gens[i] * GENS[i].ips * genMult(i);
    return base * (withPush ? globalMult(now) : permanentMult());
  }
  function tapValue(now = Date.now()) {
    const flat = 1 * upgradeProduct('tap') * globalMult(now);
    return flat + totalIps(now) * tapPctSum();
  }
  function tapPctSum() {
    let s = 0;
    for (const id of owned) { const u = UPG_BY_ID[id]; if (u.type === 'tapPct') s += u.val; }
    return s;
  }

  function costFor(i, k) {
    const g = GENS[i], r = COST_GROWTH;
    return g.base * Math.pow(r, S.gens[i]) * (Math.pow(r, k) - 1) / (r - 1);
  }
  function maxAffordable(i) {
    const g = GENS[i], r = COST_GROWTH;
    const first = g.base * Math.pow(r, S.gens[i]);
    if (S.money < first) return 0;
    let k = Math.floor(Math.log(S.money * (r - 1) / first + 1) / Math.log(r));
    while (k > 0 && costFor(i, k) > S.money) k--;
    return k;
  }
  function buyQty(i) {
    if (buyMode === 'max') return Math.max(1, maxAffordable(i));
    return parseInt(buyMode, 10);
  }

  function earn(x) {
    S.money += x;
    S.seasonEarned += x;
    S.totalEarned += x;
  }

  function cpPotential() { return Math.floor(Math.sqrt(S.totalEarned / CP_DIVISOR)); }
  function cpGain() { return Math.max(0, cpPotential() - S.cp); }
  function nextCpAt() { return Math.pow(cpPotential() + 1, 2) * CP_DIVISOR; }

  // ================= Actions =================
  function buyGen(i) {
    const k = buyQty(i);
    const c = costFor(i, k);
    if (S.money < c) return;
    const before = S.gens[i];
    S.money -= c;
    S.gens[i] += k;
    const hit = MILESTONES.find(t => before < t && S.gens[i] >= t);
    if (hit) toast(`${GENS[i].icon} ${GENS[i].name} x${hit} milestone — output doubled!`);
    buzz(8);
    renderTeam(true);
  }

  function buyUpgrade(id) {
    const u = UPG_BY_ID[id];
    if (!u || owned.has(id) || S.money < u.cost) return;
    S.money -= u.cost;
    owned.add(id);
    buzz(10);
    renderUpgrades(true);
    renderTeam(true);
  }

  function buyClass() {
    const next = CLASSES[S.classIdx + 1];
    if (!next || S.money < next.cost) return;
    S.money -= next.cost;
    S.classIdx++;
    applyClassTheme();
    renderCar();
    renderUpgrades(true);
    buzz([20, 40, 20]);
    modal(`Welcome to ${next.name}!`, `<p>Your team has stepped up to <b>${next.name}</b>.</p><p>${next.desc}</p>`, [{ label: 'Let’s race' }]);
  }

  function activatePush() {
    const now = Date.now();
    if (now < S.pushReadyAt) return;
    S.pushUntil = now + pushDur() * 1000;
    S.pushReadyAt = now + PUSH_COOLDOWN_MS + pushDur() * 1000;
    buzz([15, 30, 15]);
    toast(`🔥 PUSH! Income x${pushMult()} for ${pushDur()}s`);
  }

  function trackUnlocked(t) { return t === 0 || (S.best[t - 1] > 0 && S.best[t - 1] <= 3); }
  function raceDuration(t) { return Math.round(20 + TRACKS[t].hours * 1.5); }
  function predictPos(t, ips) {
    const r = Math.max(1e-9, ips / TRACKS[t].req);
    return 10 - 4.5 * Math.log2(r);
  }

  function startRace(t) {
    if (S.race || !trackUnlocked(t)) return;
    const now = Date.now();
    const raw = predictPos(t, totalIps(now)) + (Math.random() * 3 - 1.5);
    const finalPos = Math.max(1, Math.min(FIELD, Math.round(raw)));
    const dur = raceDuration(t) * 1000;
    S.race = { t, start: now, end: now + dur, dur, finalPos, grid: Math.min(FIELD, finalPos + 3 + Math.floor(Math.random() * 6)) };
    buzz(20);
    toast(`🟢 Green flag at ${TRACKS[t].name}!`);
    renderRaces(true);
    switchTab('races');
  }

  function prizeFor(t, pos) {
    const mult = pos === 1 ? 6 : pos === 2 ? 4 : pos === 3 ? 3 : Math.max(0.2, 2.2 - 0.1 * pos);
    return TRACKS[t].req * 90 * mult * upgradeProduct('prize') * CLASSES[S.classIdx].mult;
  }

  function finishRace() {
    const r = S.race;
    S.race = null;
    const t = r.t, pos = r.finalPos;
    const prize = prizeFor(t, pos);
    earn(prize);
    S.stats.races++;
    const firstWin = pos === 1 && S.best[t] !== 1;
    if (pos === 1) S.stats.wins++;
    const prevBest = S.best[t];
    if (!prevBest || pos < prevBest) S.best[t] = pos;
    const unlockedNext = t + 1 < TRACKS.length && pos <= 3 && !(prevBest && prevBest <= 3);
    buzz(pos <= 3 ? [30, 50, 30, 50, 60] : 25);

    const title = pos === 1 ? '🏆 VICTORY!' : pos <= 3 ? '🍾 Podium!' : '🏁 Checkered flag';
    let body = `<p>${TRACKS[t].name}</p><div class="big-num pos-${Math.min(pos, 4)}">${ordinal(pos)}</div><p>Prize money: <b>${money(prize)}</b></p>`;
    if (firstWin) body += `<p>🏆 First win here: <b>+${TROPHY_BONUS * 100}% income</b> this season!</p>`;
    if (unlockedNext) body += `<p>🔓 Unlocked <b>${TRACKS[t + 1].name}</b>.</p>`;
    if (pos > 3) body += `<p>Finish on the podium to unlock the next round.</p>`;
    modal(title, body, [{ label: 'Continue' }]);
    renderRaces(true);
  }

  function newSeason() {
    const gain = cpGain();
    if (gain <= 0) return;
    modal('Start a new season?', `<p>Your team, cars, upgrades, money and race results reset.</p><p>You keep everything else and earn</p><div class="big-num">+${gain} 🏆</div><p>Each Championship Point permanently adds +${CP_BONUS * 100}% income.</p>`, [
      { label: 'Not yet', ghost: true },
      { label: 'New season', action: () => {
        const keep = { cp: S.cp + gain, seasons: S.seasons + 1, totalEarned: S.totalEarned, stats: S.stats, settings: S.settings };
        S = Object.assign(defaults(), keep);
        owned = new Set();
        save();
        applyClassTheme();
        renderCar();
        renderAll(true);
        toast(`🏆 Season ${S.seasons + 1} begins! +${gain} CP`);
        buzz([30, 40, 30]);
      } },
    ]);
  }

  // ================= Tap & effects =================
  const stage = document.getElementById('stage');
  const fx = document.getElementById('fx');
  const carEl = document.getElementById('car');
  const tapHint = document.getElementById('tapHint');
  let floatCount = 0;

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target.closest('.bonus')) return;
    e.preventDefault();
    const now = Date.now();
    const v = tapValue(now);
    earn(v);
    S.stats.taps++;
    if (S.race) S.race.end = Math.max(now, S.race.end - 150);
    const rect = stage.getBoundingClientRect();
    spawnFloat(e.clientX - rect.left, e.clientY - rect.top, '+' + money(v));
    carEl.classList.remove('bump');
    void carEl.offsetWidth;
    carEl.classList.add('bump');
    speedKick = Math.min(speedKick + 120, 900);
    if (tapHint && S.stats.taps > 15) tapHint.classList.add('hidden');
    buzz(4);
  });

  function spawnFloat(x, y, text, cls = '') {
    if (floatCount > 24) return;
    floatCount++;
    const d = document.createElement('div');
    d.className = 'float ' + cls;
    d.textContent = text;
    d.style.left = x + (Math.random() * 30 - 15) + 'px';
    d.style.top = y + 'px';
    fx.appendChild(d);
    setTimeout(() => { d.remove(); floatCount--; }, 900);
  }

  function buzz(p) {
    if (S.settings.haptics && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } }
  }

  // Random sponsor bonus that appears on track
  let nextBonusAt = Date.now() + 30000 + Math.random() * 30000;
  let bonusEl = null;
  const BONUS_ICONS = ['🏁', '🍾', '🏆', '💰'];
  function spawnBonus() {
    bonusEl = document.createElement('button');
    bonusEl.type = 'button';
    bonusEl.className = 'bonus';
    bonusEl.textContent = BONUS_ICONS[Math.floor(Math.random() * BONUS_ICONS.length)];
    bonusEl.setAttribute('aria-label', 'Sponsor bonus');
    bonusEl.style.left = (12 + Math.random() * 76) + '%';
    bonusEl.style.top = (22 + Math.random() * 40) + '%';
    bonusEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const now = Date.now();
      const reward = Math.max(totalIps(now) * 90, tapValue(now) * 40, 25);
      earn(reward);
      S.stats.bonuses++;
      const rect = stage.getBoundingClientRect();
      spawnFloat(e.clientX - rect.left, e.clientY - rect.top, '+' + money(reward), 'gold');
      toast(`💰 Sponsor bonus! +${money(reward)}`);
      buzz([20, 30, 20]);
      removeBonus();
    });
    fx.parentElement.appendChild(bonusEl);
    setTimeout(() => { if (bonusEl) removeBonus(); }, 10000);
  }
  function removeBonus() {
    if (bonusEl) bonusEl.remove();
    bonusEl = null;
    nextBonusAt = Date.now() + 45000 + Math.random() * 75000;
  }

  // ================= Car =================
  function carSVG(c) {
    const body = c.color, trim = c.trim, acc = c.accent;
    const wheel = (cx) => `
      <g class="wheel" data-cx="${cx}" data-cy="54">
        <circle cx="${cx}" cy="54" r="12" fill="#111"/>
        <circle cx="${cx}" cy="54" r="7.5" fill="#9aa3b2"/>
        <g stroke="#3b414c" stroke-width="2">
          <line x1="${cx - 7}" y1="54" x2="${cx + 7}" y2="54"/>
          <line x1="${cx}" y1="47" x2="${cx}" y2="61"/>
          <line x1="${cx - 5}" y1="49" x2="${cx + 5}" y2="59"/>
          <line x1="${cx - 5}" y1="59" x2="${cx + 5}" y2="49"/>
        </g>
        <circle cx="${cx}" cy="54" r="2.5" fill="#d33"/>
      </g>`;
    if (c.shape === 'gt') {
      return `<svg viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="18" width="26" height="4" rx="1.5" fill="${trim}"/>
        <rect x="14" y="21" width="3" height="12" fill="#222"/>
        <path d="M6 52 L9 37 Q30 32 58 30 L82 17 Q104 10 130 14 L160 28 Q188 31 195 43 L196 52 Z" fill="${body}"/>
        <path d="M86 19 Q104 13 127 16 L146 28 L84 29 Z" fill="#1c2633"/>
        <path d="M100 17 L104 28" stroke="${body}" stroke-width="3"/>
        <path d="M9 44 L196 44 L196 48 L8 48 Z" fill="${trim}"/>
        <path d="M150 34 Q172 34 192 40" stroke="${acc}" stroke-width="2" fill="none" opacity=".7"/>
        <circle cx="72" cy="38" r="8.5" fill="#fff"/>
        <text x="72" y="41.5" text-anchor="middle" font-size="10" font-weight="900" font-family="Arial, sans-serif" fill="#111">${c.num}</text>
        <rect x="186" y="38" width="9" height="4" rx="2" fill="#ffe9a8"/>
        <rect x="4" y="38" width="5" height="4" rx="1" fill="#ff3b3b"/>
        <rect x="0" y="50" width="200" height="3" fill="#111" opacity=".5"/>
        ${wheel(45)}${wheel(158)}
      </svg>`;
    }
    return `<svg viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="14" width="34" height="5" rx="2" fill="${trim}"/>
      <rect x="2" y="10" width="4" height="14" rx="1" fill="${trim}"/>
      <rect x="15" y="18" width="3" height="16" fill="#222"/>
      <path d="M4 50 L6 36 Q24 30 52 30 L70 24 Q88 22 98 24 L112 14 Q128 8 142 16 L150 27 Q178 31 197 45 L197 51 Z" fill="${body}"/>
      <path d="M50 30 L60 18 L92 17 L98 24" fill="${body}"/>
      <path d="M113 16 Q128 10 140 17 L146 27 L110 28 Z" fill="#1c2633"/>
      <path d="M6 44 Q100 40 197 46 L197 50 L5 50 Z" fill="${trim}"/>
      <path d="M150 32 Q175 36 193 44" stroke="${acc}" stroke-width="2.2" fill="none" opacity=".85"/>
      <circle cx="78" cy="37" r="8.5" fill="#fff"/>
      <text x="78" y="40.5" text-anchor="middle" font-size="10" font-weight="900" font-family="Arial, sans-serif" fill="#111">${c.num}</text>
      <path d="M182 40 L195 44 L194 46 L181 43 Z" fill="#ffe9a8"/>
      <rect x="3" y="36" width="4" height="7" rx="1" fill="#ff3b3b"/>
      <rect x="0" y="50" width="200" height="3" fill="#111" opacity=".5"/>
      ${wheel(42)}${wheel(162)}
    </svg>`;
  }
  let wheels = [];
  function renderCar() {
    carEl.innerHTML = carSVG(CLASSES[S.classIdx]);
    wheels = [...carEl.querySelectorAll('.wheel')];
  }
  function applyClassTheme() {
    const c = CLASSES[S.classIdx];
    const col = c.name === 'GTP' ? '#c79a12' : c.color;
    document.documentElement.style.setProperty('--class', col);
    const badge = document.getElementById('classBadge');
    badge.textContent = c.name;
    badge.style.background = col;
  }

  // Road animation
  const laneEl = document.getElementById('lane');
  const curbEl = document.getElementById('curb');
  let roadOffset = 0, wheelAngle = 0, speedKick = 0, lastFrame = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - lastFrame) / 1000);
    lastFrame = t;
    const ips = cachedIps;
    let speed = 140 + 70 * Math.log10(ips + 1) + speedKick;
    if (pushActive()) speed *= 1.5;
    speed = Math.min(speed, 2400);
    speedKick = Math.max(0, speedKick - 900 * dt);
    roadOffset = (roadOffset + speed * dt) % 4800;
    laneEl.style.backgroundPositionX = -roadOffset + 'px';
    curbEl.style.backgroundPositionX = -roadOffset + 'px';
    wheelAngle = (wheelAngle + speed * dt * 4) % 360;
    for (const w of wheels) w.setAttribute('transform', `rotate(${wheelAngle} ${w.dataset.cx} ${w.dataset.cy})`);
    updateRaceHud();
    requestAnimationFrame(frame);
  }

  // ================= UI =================
  const $ = (id) => document.getElementById(id);
  const moneyEl = $('money'), ipsEl = $('ips'), tapEl = $('tapVal'), cpEl = $('cpCount');
  const pushBtn = $('pushBtn'), pushSub = $('pushSub');
  let cachedIps = 0;

  function renderHeader() {
    const now = Date.now();
    cachedIps = totalIps(now);
    moneyEl.textContent = money(S.money);
    ipsEl.textContent = money(cachedIps);
    tapEl.textContent = money(tapValue(now));
    cpEl.textContent = S.cp;
    if (pushActive(now)) {
      pushBtn.disabled = false;
      pushBtn.classList.add('on');
      pushSub.textContent = `x${pushMult()} · ${Math.ceil((S.pushUntil - now) / 1000)}s`;
      carEl.classList.add('push-on');
    } else {
      pushBtn.classList.remove('on');
      carEl.classList.remove('push-on');
      if (now < S.pushReadyAt) {
        pushBtn.disabled = true;
        pushSub.textContent = 'ready in ' + fmtTime((S.pushReadyAt - now) / 1000);
      } else {
        pushBtn.disabled = false;
        pushSub.textContent = `x${pushMult()} · ${pushDur()}s`;
      }
    }
  }

  // --- Team ---
  const teamList = $('teamList');
  let teamRows = [];
  function buildTeam() {
    teamList.innerHTML = '';
    teamRows = GENS.map((g, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="ico">${g.icon}<span class="count">0</span></div>
        <div class="info">
          <div class="name">${g.name}</div>
          <div class="desc">${g.desc}</div>
          <div class="stat"></div>
          <div class="mbar"><i></i></div>
        </div>
        <button class="buy" type="button"><span class="q"></span><small class="c"></small></button>`;
      const btn = row.querySelector('.buy');
      btn.addEventListener('click', () => buyGen(i));
      teamList.appendChild(row);
      return { row, btn, count: row.querySelector('.count'), stat: row.querySelector('.stat'), q: row.querySelector('.q'), c: row.querySelector('.c'), bar: row.querySelector('.mbar i'), name: row.querySelector('.name'), desc: row.querySelector('.desc'), ico: row.querySelector('.ico') };
    });
    const teaser = document.createElement('div');
    teaser.className = 'row';
    teaser.id = 'teamTeaser';
    teaser.innerHTML = `<div class="ico">❔</div><div class="info"><div class="name">Locked</div><div class="desc">Hire the previous team member to reveal.</div></div>`;
    teamList.appendChild(teaser);
  }
  function renderTeam() {
    const now = Date.now();
    let firstHidden = -1;
    GENS.forEach((g, i) => {
      const r = teamRows[i];
      const visible = i === 0 || S.gens[i] > 0 || S.gens[i - 1] > 0;
      r.row.classList.toggle('hidden', !visible);
      if (!visible) { if (firstHidden < 0) firstHidden = i; return; }
      const k = buyQty(i);
      const cost = costFor(i, k);
      r.count.textContent = S.gens[i];
      r.count.classList.toggle('hidden', S.gens[i] === 0);
      const each = genIps(i, now);
      r.stat.innerHTML = S.gens[i] > 0
        ? `${money(each * S.gens[i])}/s <em>· ${money(each)}/s each</em>`
        : `<em>+${money(each)}/s each</em>`;
      r.q.textContent = 'x' + k;
      r.c.textContent = money(cost);
      r.btn.disabled = S.money < cost;
      const next = MILESTONES.find(t => S.gens[i] < t);
      const prev = [...MILESTONES].reverse().find(t => S.gens[i] >= t) || 0;
      r.bar.style.width = next ? ((S.gens[i] - prev) / (next - prev) * 100) + '%' : '100%';
      r.bar.parentElement.title = next ? `Next x2 at ${next}` : 'All milestones reached';
    });
    $('teamTeaser').classList.toggle('hidden', firstHidden < 0);
  }

  // --- Upgrades ---
  const upgList = $('upgList');
  let upgKey = '';
  let upgButtons = [];
  function availableUpgrades() {
    return UPGRADES.filter(u => !owned.has(u.id) && u.req()).sort((a, b) => a.cost - b.cost);
  }
  function renderUpgrades(force) {
    const list = availableUpgrades();
    const key = list.map(u => u.id).join(',') + '|' + S.classIdx;
    if (force || key !== upgKey) {
      upgKey = key;
      renderClassCard();
      upgList.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'section-title';
      title.textContent = `Upgrades · ${owned.size} owned`;
      upgList.appendChild(title);
      if (!list.length) {
        const e = document.createElement('div');
        e.className = 'empty';
        e.textContent = 'Keep growing your team to unlock more upgrades.';
        upgList.appendChild(e);
      }
      upgButtons = list.map(u => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<div class="ico">${u.icon}</div><div class="info"><div class="name"></div><div class="desc"></div></div><button class="buy" type="button"><span>Buy</span><small>${money(u.cost)}</small></button>`;
        row.querySelector('.name').textContent = u.name;
        row.querySelector('.desc').textContent = u.desc;
        const btn = row.querySelector('.buy');
        btn.addEventListener('click', () => buyUpgrade(u.id));
        upgList.appendChild(row);
        return { btn, u };
      });
    }
    let affordable = false;
    for (const { btn, u } of upgButtons) {
      btn.disabled = S.money < u.cost;
      if (!btn.disabled) affordable = true;
    }
    const cb = $('classBuy');
    const next = CLASSES[S.classIdx + 1];
    if (cb && next) { cb.disabled = S.money < next.cost; if (!cb.disabled) affordable = true; }
    $('upgDot').classList.toggle('hidden', !affordable);
  }
  function renderClassCard() {
    const box = $('classCard');
    const cur = CLASSES[S.classIdx];
    const next = CLASSES[S.classIdx + 1];
    if (!next) {
      box.innerHTML = `<div class="class-card" style="--cc:${cur.color === '#16181d' ? '#6b5410' : cur.color}"><div class="info"><div class="tag">CAR CLASS · MAX</div><div class="cname">${cur.name}</div><div class="desc">You're racing in the top class. Go win it all.</div></div></div>`;
      return;
    }
    box.innerHTML = `<div class="class-card" style="--cc:${next.color === '#16181d' ? '#6b5410' : next.color}">
      <div class="info"><div class="tag">STEP UP FROM ${cur.name} TO</div><div class="cname">${next.name}</div><div class="desc">${next.desc}</div></div>
      <button id="classBuy" class="buy" type="button"><span>Move up</span><small>${money(next.cost)}</small></button></div>`;
    $('classBuy').addEventListener('click', buyClass);
  }

  // --- Races ---
  const raceList = $('raceList');
  let raceKey = '';
  function renderRaces(force) {
    const key = S.best.join(',') + '|' + (S.race ? S.race.t : -1);
    const ips = cachedIps;
    if (force || key !== raceKey) {
      raceKey = key;
      raceList.innerHTML = `<div class="section-title">Season calendar · ${trophies()} wins (+${Math.round(trophies() * TROPHY_BONUS * 100)}% income)</div>`;
      TRACKS.forEach((tr, t) => {
        const unlocked = trackUnlocked(t);
        const row = document.createElement('div');
        row.className = 'row track' + (unlocked ? '' : ' locked');
        const best = S.best[t];
        const bestTxt = best ? `<span class="best pos-${Math.min(best, 4)}">Best ${ordinal(best)}${best === 1 ? ' 🏆' : ''}</span>` : '';
        row.innerHTML = `<div class="ico">${unlocked ? (best === 1 ? '🏆' : '🏁') : '🔒'}</div>
          <div class="info"><div class="name">${tr.name}</div>
          <div class="desc">${tr.place} · ${raceDuration(t)}s race</div>
          <div class="stat" data-pred="${t}"></div>${bestTxt}</div>
          <button class="buy race-btn" type="button" data-race="${t}"><span>${S.race && S.race.t === t ? 'Racing…' : 'Race'}</span><small>${unlocked ? 'P1: ' + money(prizeFor(t, 1)) : 'Podium prev.'}</small></button>`;
        const btn = row.querySelector('button');
        btn.disabled = !unlocked || !!S.race;
        btn.addEventListener('click', () => startRace(t));
        raceList.appendChild(row);
      });
    }
    // live predictions
    let canRace = false;
    raceList.querySelectorAll('[data-pred]').forEach(el => {
      const t = +el.dataset.pred;
      if (!trackUnlocked(t)) { el.innerHTML = `<em>Needs ~${money(TRACKS[t].req)}/s pace</em>`; return; }
      const p = Math.max(1, Math.min(FIELD, Math.round(predictPos(t, ips))));
      const label = p === 1 ? 'Favorite to win' : p <= 3 ? 'Podium contender' : p <= 10 ? 'Midfield' : 'Backmarker';
      el.innerHTML = `Expected ~${ordinal(p)} <em>· ${label}</em>`;
      if (!S.race && S.best[t] !== 1) canRace = true;
    });
    $('raceDot').classList.toggle('hidden', !canRace);
  }

  const raceHud = $('raceHud');
  function updateRaceHud() {
    const r = S.race;
    if (!r) { raceHud.classList.add('hidden'); return; }
    raceHud.classList.remove('hidden');
    const now = Date.now();
    const remaining = Math.max(0, r.end - now);
    const prog = Math.min(1, 1 - remaining / r.dur);
    $('raceHudName').textContent = TRACKS[r.t].name;
    const pos = Math.round(r.grid + (r.finalPos - r.grid) * Math.min(1, prog * 1.25));
    $('raceHudPos').textContent = ordinal(Math.max(1, pos));
    $('raceHudBar').style.width = (prog * 100) + '%';
    $('raceHudTime').textContent = fmtTime(remaining / 1000) + ' left';
  }

  // --- Season ---
  function renderSeason() {
    const gain = cpGain();
    const box = $('seasonBox');
    box.innerHTML = `
      <div class="card">
        <h3>Championship Points</h3>
        <div class="big-num">🏆 ${S.cp}</div>
        <p>Permanent bonus: <b>+${Math.round(S.cp * CP_BONUS * 100)}%</b> income. Season ${S.seasons + 1}.</p>
      </div>
      <div class="card">
        <h3>End the season</h3>
        <p>Lifetime prize money earns Championship Points. Starting a new season resets your team, class, upgrades and race results — but your points stay forever.</p>
        <div class="kv"><span>Points if you reset now</span><span>+${gain}</span></div>
        <div class="kv"><span>Next point at</span><span>${money(nextCpAt())} lifetime</span></div>
        <div class="kv"><span>Lifetime earned</span><span>${money(S.totalEarned)}</span></div>
        <button id="seasonBtn" class="btn" type="button" ${gain > 0 ? '' : 'disabled'}>${gain > 0 ? `New season (+${gain} 🏆)` : `Earn ${money(Math.pow(S.cp + 1, 2) * CP_DIVISOR)} lifetime to unlock`}</button>
      </div>
      <div class="card">
        <h3>Income breakdown</h3>
        <div class="kv"><span>Car class (${CLASSES[S.classIdx].name})</span><span>x${CLASSES[S.classIdx].mult}</span></div>
        <div class="kv"><span>Championship Points</span><span>x${(1 + CP_BONUS * S.cp).toFixed(2)}</span></div>
        <div class="kv"><span>Race wins this season</span><span>x${(1 + TROPHY_BONUS * trophies()).toFixed(2)}</span></div>
        <div class="kv"><span>Team upgrades</span><span>x${fmt(upgradeProduct('global'))}</span></div>
      </div>`;
    $('seasonBtn').addEventListener('click', newSeason);
  }

  // --- More ---
  function renderMore() {
    const st = S.stats;
    $('moreBox').innerHTML = `
      <div class="card">
        <h3>Stats</h3>
        <div class="kv"><span>Taps</span><span>${fmt(st.taps)}</span></div>
        <div class="kv"><span>Races entered</span><span>${st.races}</span></div>
        <div class="kv"><span>Race wins</span><span>${st.wins}</span></div>
        <div class="kv"><span>Sponsor bonuses caught</span><span>${st.bonuses}</span></div>
        <div class="kv"><span>Team members</span><span>${fmt(S.gens.reduce((a, b) => a + b, 0))}</span></div>
        <div class="kv"><span>This season earned</span><span>${money(S.seasonEarned)}</span></div>
        <div class="kv"><span>Time played</span><span>${fmtTime(st.playTime)}</span></div>
      </div>
      <div class="card">
        <h3>Settings</h3>
        <div class="toggle"><span>Vibration</span><button id="hapticsBtn" class="switch ${S.settings.haptics ? 'on' : ''}" type="button" aria-label="Toggle vibration"></button></div>
        <button id="exportBtn" class="btn ghost" type="button">Copy save code</button>
        <button id="importBtn" class="btn ghost" type="button">Import save code</button>
        <button id="resetBtn" class="btn danger" type="button">Reset all progress</button>
      </div>
      <div class="card">
        <h3>How to play</h3>
        <p>👆 Tap the car for prize money. 🔧 Hire team members for income every second — every 25/50/100… of one kind doubles its output.</p>
        <p>🔥 Hit <b>PUSH</b> for a short income boost. 💰 Catch sponsor bonuses that pop up on track.</p>
        <p>🏁 Enter races: a podium unlocks the next round, a win adds +10% income this season. 🏆 Start a new season for permanent Championship Points.</p>
        <p>Your team keeps earning while you're away (50%, up to 8 hours).</p>
      </div>
      <p class="small-print">IMSA Clicker is an unofficial fan-made game and is not affiliated with, endorsed by or sponsored by IMSA or any team, manufacturer or circuit.</p>`;
    $('hapticsBtn').addEventListener('click', (e) => {
      S.settings.haptics = !S.settings.haptics;
      e.currentTarget.classList.toggle('on', S.settings.haptics);
      buzz(15);
    });
    $('exportBtn').addEventListener('click', exportSave);
    $('importBtn').addEventListener('click', importSave);
    $('resetBtn').addEventListener('click', () => modal('Reset everything?', '<p>This wipes all progress, including Championship Points. This cannot be undone.</p>', [
      { label: 'Cancel', ghost: true },
      { label: 'Reset', danger: true, action: () => {
        S = defaults(); owned = new Set(); save();
        applyClassTheme(); renderCar(); renderAll(true);
        tapHint.classList.remove('hidden');
        toast('Progress reset. Back to the garage!');
      } },
    ]));
  }

  function exportSave() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const done = () => toast('📋 Save code copied');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, () => showCode(code));
    } else showCode(code);
  }
  function showCode(code) {
    modal('Your save code', `<textarea readonly style="width:100%;height:120px;border-radius:10px;background:#0f1218;color:#cfd5df;border:1px solid #2b3342;padding:8px;font-size:11px">${code}</textarea>`, [{ label: 'Done' }]);
  }
  function importSave() {
    modal('Import save', `<textarea id="importArea" placeholder="Paste save code" style="width:100%;height:120px;border-radius:10px;background:#0f1218;color:#cfd5df;border:1px solid #2b3342;padding:8px;font-size:11px;user-select:text;-webkit-user-select:text"></textarea>`, [
      { label: 'Cancel', ghost: true },
      { label: 'Import', action: () => {
        try {
          const json = decodeURIComponent(escape(atob($('importArea').value.trim())));
          JSON.parse(json);
          localStorage.setItem(SAVE_KEY, json);
          S = load(); owned = new Set(S.upgrades);
          applyClassTheme(); renderCar(); renderAll(true);
          toast('✅ Save imported');
        } catch (e) { toast('❌ That save code is not valid'); }
      } },
    ]);
  }

  // --- Toast / Modal ---
  const toastEl = $('toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }
  const modalEl = $('modal');
  const modalQueue = [];
  function modal(title, html, buttons) {
    modalQueue.push({ title, html, buttons });
    if (modalQueue.length === 1) showModal();
  }
  function showModal() {
    const m = modalQueue[0];
    if (!m) { modalEl.classList.add('hidden'); return; }
    $('modalTitle').textContent = m.title;
    $('modalBody').innerHTML = m.html;
    const btns = $('modalBtns');
    btns.innerHTML = '';
    m.buttons.forEach(b => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn' + (b.ghost ? ' ghost' : '') + (b.danger ? ' danger' : '');
      el.textContent = b.label;
      el.addEventListener('click', () => {
        modalQueue.shift();
        showModal();
        if (b.action) b.action();
      });
      btns.appendChild(el);
    });
    modalEl.classList.remove('hidden');
  }

  // --- Tabs ---
  let activeTab = 'team';
  function switchTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    renderActive(true);
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
    buyMode = b.dataset.buy;
    document.querySelectorAll('[data-buy]').forEach(x => x.classList.toggle('active', x === b));
    renderTeam();
  }));
  pushBtn.addEventListener('click', activatePush);

  function renderActive(force) {
    if (activeTab === 'team') renderTeam();
    if (activeTab === 'season' && force) renderSeason();
    if (activeTab === 'more' && force) renderMore();
  }
  function renderAll(force) {
    renderHeader();
    renderTeam();
    renderUpgrades(force);
    renderRaces(force);
    renderActive(true);
  }

  // ================= Loop =================
  let lastTick = Date.now();
  let uiTimer = 0, slowTimer = 0, saveTimer = 0;

  function tick() {
    const now = Date.now();
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    if (dt < 0) dt = 0;
    if (dt > 60) {
      grantOffline(dt);
    } else {
      earn(totalIps(now) * dt);
      S.stats.playTime += dt;
    }
    if (S.race && now >= S.race.end) finishRace();
    if (!bonusEl && now >= nextBonusAt && !document.hidden) spawnBonus();

    uiTimer += dt; slowTimer += dt; saveTimer += dt;
    if (uiTimer >= 0.2) {
      uiTimer = 0;
      renderHeader();
      renderActive(false);
      renderUpgrades(false);
    }
    if (slowTimer >= 1) {
      slowTimer = 0;
      renderRaces(false);
      if (activeTab === 'season') renderSeason();
    }
    if (saveTimer >= 5) { saveTimer = 0; save(); }
  }

  function grantOffline(seconds) {
    const s = Math.min(seconds, OFFLINE_CAP_S);
    const gain = totalIps(Date.now(), false) * s * OFFLINE_RATE;
    if (gain <= 0) return;
    earn(gain);
    modal('Welcome back!', `<p>While you were away for ${fmtTime(seconds)}, your team earned</p><div class="big-num">${money(gain)}</div><p class="small-print">Offline earnings: ${OFFLINE_RATE * 100}% rate, up to ${OFFLINE_CAP_S / 3600} hours.</p>`, [{ label: 'Collect' }]);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else tick();
  });
  window.addEventListener('pagehide', save);

  // ================= Boot =================
  applyClassTheme();
  renderCar();
  buildTeam();
  if (S.stats.taps > 15) tapHint.classList.add('hidden');
  const away = (Date.now() - (S.lastSave || Date.now())) / 1000;
  if (away > 60 && S.totalEarned > 0) grantOffline(away);
  else if (S.totalEarned === 0) {
    modal('🏁 IMSA Clicker', '<p>You run a brand-new endurance racing team with one GTD car and big dreams.</p><p><b>Tap the car</b> to earn prize money, hire your crew, win races and climb all the way to GTP.</p>', [{ label: 'Green flag!' }]);
  }
  lastTick = Date.now();
  renderAll(true);
  setInterval(tick, 100);
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Debug hook for testing in the console.
  window.__imsa = { get state() { return S; }, fmt, totalIps, tapValue };
})();
