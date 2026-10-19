'use strict';

(() => {
  // =====================================================================
  // Config
  // =====================================================================
  const SAVE_KEY = 'imsaclicker.save.v2';
  const OLD_SAVE_KEY = 'imsaclicker.save.v1';
  const COST_GROWTH = 1.15;                 // team member price growth
  const MILESTONES = [25, 50, 100, 200, 400];
  const LP_DIVISOR = 1e8;                   // Legacy = floor(cbrt(lifetime earned / divisor))
  const LP_BONUS = 0.03;                    // +3% income per Legacy Point
  const WIN_BONUS = 0.02;                   // +2% income per race win this season (first 50)
  const WIN_BONUS_CAP = 50;
  const CAR_BONUS = 0.05;                   // +5% income per car in the garage
  const ACH_BONUS = 0.02;                   // +2% income per achievement
  const PUSH_COOLDOWN_MS = 120000;
  const PART_GROWTH = 5;                    // car part price growth per level
  const PART_STEP = 0.04;                   // +4% pace per part level
  const FIELD = 20;
  const POINTS = [350, 320, 300, 280, 260, 250, 240, 230, 220, 210, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110];
  const TITLE_LP = [2, 4, 8, 16];

  // =====================================================================
  // Team members (idle income)
  // =====================================================================
  const GENS = [
    { name: 'Mechanic',            icon: '🔧', desc: 'Turns wrenches through the night.',          base: 15,     ips: 0.1 },
    { name: 'Tire Specialist',     icon: '🛞', desc: 'Reads rubber like a book.',                  base: 100,    ips: 1 },
    { name: 'Pit Crew',            icon: '⛽', desc: 'Fuel, four tires and a driver change.',      base: 1100,   ips: 8 },
    { name: 'Race Engineer',       icon: '🎧', desc: 'Calls the strategy on the radio.',           base: 12000,  ips: 47 },
    { name: 'Data Analyst',        icon: '📊', desc: 'Finds tenths hidden in the telemetry.',      base: 1.3e5,  ips: 260 },
    { name: 'Simulator Rig',       icon: '🕹️', desc: 'Thousands of laps before the green flag.',   base: 1.4e6,  ips: 1400 },
    { name: 'Wind Tunnel',         icon: '🌬️', desc: 'Downforce for days.',                        base: 2e7,    ips: 7800 },
    { name: 'Title Sponsor',       icon: '💼', desc: 'Their logo on your livery.',                 base: 3.3e8,  ips: 44000 },
    { name: 'Hospitality Village', icon: '🎪', desc: 'VIP paddock guests fund the program.',       base: 5.1e9,  ips: 2.6e5 },
    { name: 'Factory Program',     icon: '🏭', desc: 'Full manufacturer backing.',                 base: 7.5e10, ips: 1.6e6 },
    { name: 'Hybrid R&D Center',   icon: '🔋', desc: 'Masters of the spec hybrid system.',         base: 1e12,   ips: 1e7 },
    { name: 'Endurance Dynasty',   icon: '👑', desc: 'Legends of the long race.',                  base: 1.4e13, ips: 6.5e7 },
  ];

  // =====================================================================
  // Classes, cars, parts, drivers
  // =====================================================================
  const CLASSES = [
    { name: 'GTD',     color: '#1fa84f', mult: 1,  req: 100,  prize: 100,   kind: 'gt3',  license: null,
      desc: 'GT3 cars with pro-am lineups. Every dynasty starts here.' },
    { name: 'GTD PRO', color: '#d7262e', mult: 2,  req: 165,  prize: 2e3,   kind: 'gt3',  license: { cost: 1e6, wins: 3 },
      desc: 'The same GT3 cars with all-pro lineups. x2 all income.' },
    { name: 'LMP2',    color: '#1f5fd1', mult: 6,  req: 360,  prize: 5e5,   kind: 'lmp2', license: { cost: 5e9, wins: 3 },
      desc: 'Spec prototypes with serious downforce. x3 more income.' },
    { name: 'GTP',     color: '#c9a227', mult: 30, req: 800,  prize: 2e8,   kind: 'gtp',  license: { cost: 5e12, wins: 3 },
      desc: 'Hybrid top-class prototypes fighting for overall wins. x5 more income.' },
  ];
  const KIND_LABEL = { gt3: 'GT3 · races GTD & GTD PRO', lmp2: 'LMP2 prototypes', gtp: 'GTP hybrid prototypes' };
  const KIND_CLASS = { gt3: 0, lmp2: 2, gtp: 3 };

  const PERK_TEXT = {
    partsDisc: (v) => `Car parts ${Math.round(v * 100)}% cheaper`,
    tap: (v) => `+${Math.round(v * 100)}% tap value`,
    offline: (v) => `+${Math.round(v * 100)}% offline earnings`,
    bonusVal: (v) => `Sponsor bonuses worth +${Math.round(v * 100)}%`,
    income: (v) => `+${Math.round(v * 100)}% all income`,
    pushDur: (v) => `PUSH lasts +${v}s`,
    prize: (v) => `+${Math.round(v * 100)}% race prize money`,
    pit: (v) => `Pit stop window +${Math.round(v * 100)}%`,
    pace: (v) => `+${Math.round(v * 100)}% race pace`,
    raceSpeed: (v) => `Races ${Math.round(v * 100)}% shorter`,
    bonusFreq: (v) => `Sponsor bonuses ${Math.round(v * 100)}% more often`,
  };

  const CARS = [
    // ---- GT3 ----
    { id: 'lexus',    kind: 'gt3', name: 'Lexus RC F GT3',            price: 0,      pace: 100, perk: ['partsDisc', 0.10], num: 14, },
    { id: 'nsx',      kind: 'gt3', name: 'Acura NSX GT3 Evo22',       price: 1e3,    pace: 103, perk: ['tap', 0.25],       num: 93, },
    { id: 'amg',      kind: 'gt3', name: 'Mercedes-AMG GT3 Evo',      price: 1e4,    pace: 106, perk: ['offline', 0.25],   num: 57, },
    { id: 'aston',    kind: 'gt3', name: 'Aston Martin Vantage GT3',  price: 5e4,    pace: 108, perk: ['bonusVal', 1],     num: 27, },
    { id: 'mustang',  kind: 'gt3', name: 'Ford Mustang GT3',          price: 2e5,  pace: 111, perk: ['income', 0.15],    num: 64, },
    { id: 'huracan',  kind: 'gt3', name: 'Lamborghini Huracán GT3 Evo2', price: 1e6, pace: 114, perk: ['pushDur', 10],     num: 9, },
    { id: 'mclaren',  kind: 'gt3', name: 'McLaren 720S GT3 Evo',      price: 4e6,    pace: 117, perk: ['prize', 0.30],     num: 70, },
    { id: 'bmwm4',    kind: 'gt3', name: 'BMW M4 GT3',                price: 1.5e7,    pace: 120, perk: ['income', 0.20],    num: 1, },
    { id: 'ferrari',  kind: 'gt3', name: 'Ferrari 296 GT3',           price: 6e7,    pace: 124, perk: ['pit', 0.40],       num: 62, },
    { id: 'corvette', kind: 'gt3', name: 'Corvette Z06 GT3.R',        price: 2.5e8,  pace: 128, perk: ['tap', 0.50],       num: 3, },
    { id: 'p911',     kind: 'gt3', name: 'Porsche 911 GT3 R',         price: 1e9,    pace: 132, perk: ['pace', 0.05],      num: 77, },
    // ---- LMP2 ----
    { id: 'riley',    kind: 'lmp2', name: 'Riley Mk. 30',             price: 1e10,    pace: 300, perk: ['bonusFreq', 0.5],  num: 52, },
    { id: 'ligier',   kind: 'lmp2', name: 'Ligier JS P217',           price: 5e10,    pace: 308, perk: ['income', 0.20],    num: 18, },
    { id: 'dallara',  kind: 'lmp2', name: 'Dallara P217',             price: 2.5e11,    pace: 316, perk: ['raceSpeed', 0.15], num: 81, },
    { id: 'oreca',    kind: 'lmp2', name: 'ORECA 07',                 price: 1e12,   pace: 326, perk: ['pace', 0.05],      num: 11, },
    // ---- GTP ----
    { id: 'arx06',    kind: 'gtp', name: 'Acura ARX-06',              price: 1e13,   pace: 640, perk: ['tap', 1],          num: 10, },
    { id: 'vseries',  kind: 'gtp', name: 'Cadillac V-Series.R',       price: 5e13,   pace: 655, perk: ['income', 0.25],    num: 31, },
    { id: 'bmwgtp',   kind: 'gtp', name: 'BMW M Hybrid V8',           price: 2.5e14, pace: 670, perk: ['prize', 0.50],     num: 24, },
    { id: 'sc63',     kind: 'gtp', name: 'Lamborghini SC63',          price: 1e15,   pace: 685, perk: ['pushDur', 20],     num: 63, },
    { id: 'valkyrie', kind: 'gtp', name: 'Aston Martin Valkyrie',     price: 5e15,   pace: 700, perk: ['raceSpeed', 0.20], num: 23, },
    { id: 'p963',     kind: 'gtp', name: 'Porsche 963',               price: 2.5e16, pace: 720, perk: ['pace', 0.08],      num: 7, },
  ];
  const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));

  const PARTS = [
    { id: 'tires',  name: 'Tires',        icon: '🛞', desc: 'Softer compounds, better warm-up.', base: 100 },
    { id: 'brakes', name: 'Brakes',       icon: '🛑', desc: 'Carbon discs, later braking.',      base: 150 },
    { id: 'susp',   name: 'Suspension',   icon: '🪛', desc: 'Dampers that love the curbs.',      base: 250 },
    { id: 'gear',   name: 'Gearbox',      icon: '⚙️', desc: 'Faster, smoother shifts.',          base: 400 },
    { id: 'aero',   name: 'Aerodynamics', icon: '🌬️', desc: 'More grip, less drag.',             base: 600 },
    { id: 'engine', name: 'Engine',       icon: '🔥', desc: 'More power out of every corner.',   base: 1000 },
  ];
  const PART_MAX = 60;
  const PART_KIND_COST = { gt3: 1, lmp2: 1e6, gtp: 1e9 };

  const TIERS = [
    { name: 'Bronze',   color: '#c98a52', pace: 0.02 },
    { name: 'Silver',   color: '#c7ced8', pace: 0.04 },
    { name: 'Gold',     color: '#f2c230', pace: 0.07 },
    { name: 'Platinum', color: '#9fe3ff', pace: 0.10 },
  ];
  const DRIVERS = [
    { name: 'Gary Holt',       tier: 0, cost: 2e3,  perk: ['tap', 0.10] },
    { name: 'Linda Marsh',     tier: 0, cost: 1e4,  perk: ['prize', 0.10] },
    { name: 'Kenji Arata',     tier: 1, cost: 1e5,  perk: ['income', 0.05] },
    { name: 'Sofia Lindqvist', tier: 1, cost: 5e5,  perk: ['pit', 0.15] },
    { name: 'Tomás Ribeiro',   tier: 1, cost: 2e6,  perk: ['tap', 0.20] },
    { name: 'Callum Price',    tier: 2, cost: 4e7,  perk: ['income', 0.10] },
    { name: 'Ava Brennan',     tier: 2, cost: 3e8,  perk: ['prize', 0.25] },
    { name: 'Marco Vellani',   tier: 2, cost: 2e9,  perk: ['pit', 0.25] },
    { name: 'Nina Kovač',      tier: 3, cost: 4e10, perk: ['income', 0.15] },
    { name: 'Dario Santoro',   tier: 3, cost: 5e11, perk: ['tap', 0.50] },
    { name: 'Ethan Wolfe',     tier: 3, cost: 5e12, perk: ['prize', 0.50] },
    { name: 'Mia Duval',       tier: 3, cost: 5e13, perk: ['income', 0.25] },
  ];
  const LINEUP_SIZE = 3;

  const TRACKS = [
    { name: 'Daytona 24',             place: 'Daytona Beach, FL', hours: 24 },
    { name: 'Sebring 12 Hours',       place: 'Sebring, FL',       hours: 12 },
    { name: 'Long Beach Street Race', place: 'Long Beach, CA',    hours: 1.7 },
    { name: 'Laguna Seca',            place: 'Monterey, CA',      hours: 2.7 },
    { name: 'Detroit Street Race',    place: 'Detroit, MI',       hours: 1.7 },
    { name: 'Watkins Glen 6 Hours',   place: 'Watkins Glen, NY',  hours: 6 },
    { name: 'Mosport',                place: 'Bowmanville, ON',   hours: 2.7 },
    { name: 'Road America',           place: 'Elkhart Lake, WI',  hours: 2.7 },
    { name: 'VIR',                    place: 'Alton, VA',         hours: 2.7 },
    { name: 'Indianapolis',           place: 'Indianapolis, IN',  hours: 6 },
    { name: 'Petit Le Mans',          place: 'Braselton, GA',     hours: 10 },
  ];
  const RIVALS = ['Apex Motorsport', 'Blue Ridge Racing', 'Sunset Performance', 'Northstar Autosport', 'Ironclad Racing', 'Velocity Works', 'Harbor Point Racing'];

  // =====================================================================
  // Upgrades (one-time purchases)
  // =====================================================================
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
  UPGRADES.push(
    { id: 'tap1', icon: '🧤', name: 'Racing Gloves',       desc: 'Tap value x2.',                     cost: 100,  type: 'tap',      val: 2 },
    { id: 'tap2', icon: '🎮', name: 'Paddle Shifters',     desc: 'Tap value x2.',                     cost: 1e4,  type: 'tap',      val: 2 },
    { id: 'tap3', icon: '💺', name: 'Carbon Seat Fitting', desc: 'Tap value x2.',                     cost: 1e6,  type: 'tap',      val: 2 },
    { id: 'tap4', icon: '🧑‍🏫', name: 'Driver Coaching',     desc: 'Taps also earn 1% of your $/sec.', cost: 5e4,  type: 'tapPct',   val: 0.01 },
    { id: 'tap5', icon: '📡', name: 'Telemetry Overlay',   desc: 'Taps earn another 2% of $/sec.',    cost: 5e6,  type: 'tapPct',   val: 0.02 },
    { id: 'tap6', icon: '🏎️', name: 'Pro Driver Lineup',   desc: 'Taps earn another 3% of $/sec.',    cost: 5e9,  type: 'tapPct',   val: 0.03 },
    { id: 'tap7', icon: '🥇', name: 'Endurance Ace',       desc: 'Taps earn another 4% of $/sec.',    cost: 5e12, type: 'tapPct',   val: 0.04 },
    { id: 'glb1', icon: '💡', name: 'Night Stint Lights',  desc: 'All income x1.25.',                 cost: 1e5,  type: 'global',   val: 1.25 },
    { id: 'glb2', icon: '🌧️', name: 'Weather Radar',       desc: 'All income x1.5.',                  cost: 1e7,  type: 'global',   val: 1.5 },
    { id: 'glb3', icon: '🧠', name: 'Strategy Software',   desc: 'All income x1.5.',                  cost: 1e9,  type: 'global',   val: 1.5 },
    { id: 'glb4', icon: '⏱️', name: 'Endurance Mindset',   desc: 'All income x2.',                    cost: 1e11, type: 'global',   val: 2 },
    { id: 'glb5', icon: '🌍', name: 'Global Fanbase',      desc: 'All income x2.',                    cost: 1e13, type: 'global',   val: 2 },
    { id: 'psh1', icon: '📻', name: 'Pit Wall Radio',      desc: 'PUSH lasts 45s instead of 30s.',    cost: 2e5,  type: 'pushDur',  val: 45 },
    { id: 'psh2', icon: '🗺️', name: 'Fuel Mapping',        desc: 'PUSH boost becomes x3.',            cost: 2e8,  type: 'pushMult', val: 3 },
    { id: 'psh3', icon: '🔥', name: 'Qualifying Mode',     desc: 'PUSH boost becomes x5.',            cost: 2e11, type: 'pushMult', val: 5 },
    { id: 'rac1', icon: '🏆', name: 'Podium Bonus Clause', desc: 'Race prize money x3.',              cost: 5e5,  type: 'prize',    val: 3 },
    { id: 'rac2', icon: '📜', name: 'Manufacturer Bonus',  desc: 'Race prize money x3.',              cost: 5e9,  type: 'prize',    val: 3 },
  );
  UPGRADES.forEach(u => { if (!u.req) u.req = () => S.seasonEarned >= u.cost * 0.3; });
  const UPG_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

  // =====================================================================
  // Legacy perks (bought with Legacy Points, kept forever)
  // =====================================================================
  const HERITAGE = [
    { id: 'seed',    icon: '💵', name: 'Seed Money',            costs: [3, 10, 30, 100],  desc: (l) => `Start each season with ${money([0, 1e4, 1e6, 1e8, 1e10][l] || 0)}.`, next: (l) => `Start with ${money([1e4, 1e6, 1e8, 1e10][l])}` },
    { id: 'tapper',  icon: '👆', name: "Racer's Instinct",      costs: [2, 8, 25],        desc: (l) => `Tap value x${Math.pow(3, l)}.`, next: (l) => `Tap value x${Math.pow(3, l + 1)}` },
    { id: 'autoPit', icon: '🧰', name: 'Crew Chief',            costs: [6],               desc: () => 'Pit stops you miss are handled as Good stops.', next: () => 'Missed pit stops count as Good' },
    { id: 'auto',    icon: '🤖', name: 'Team Manager',          costs: [10],              desc: () => 'Automatically enters the next round (toggle in Races).', next: () => 'Auto-enter the next race' },
    { id: 'speed',   icon: '🚚', name: 'Efficient Logistics',   costs: [8, 25],           desc: (l) => `Races ${l * 20}% shorter.`, next: (l) => `Races ${(l + 1) * 20}% shorter` },
    { id: 'pitPro',  icon: '⏱️', name: 'Legendary Pit Crew',    costs: [4, 12],           desc: (l) => `Pit stop green zone +${l * 50}%.`, next: (l) => `Green zone +${(l + 1) * 50}%` },
    { id: 'cars',    icon: '🤝', name: 'Manufacturer Relations', costs: [5, 15, 40],      desc: (l) => `Cars and licenses ${l * 15}% cheaper.`, next: (l) => `Cars & licenses ${(l + 1) * 15}% cheaper` },
    { id: 'eng',     icon: '📐', name: 'Engineering Legacy',    costs: [5, 15, 40],       desc: (l) => `Car parts ${l * 20}% cheaper.`, next: (l) => `Parts ${(l + 1) * 20}% cheaper` },
    { id: 'fans',    icon: '📣', name: 'Fan Favorite',          costs: [4, 12],           desc: (l) => `Sponsor bonuses ${l * 50}% more often.`, next: (l) => `Bonuses ${(l + 1) * 50}% more often` },
    { id: 'night',   icon: '🌙', name: 'Night Shift',           costs: [5, 20],           desc: (l) => `Offline earnings ${[50, 75, 100][l]}%, up to ${[8, 12, 24][l]}h.`, next: (l) => `Offline ${[75, 100][l]}%, up to ${[12, 24][l]}h` },
    { id: 'paddock', icon: '🎟️', name: 'Paddock Connections',   costs: [15, 60, 200],     desc: (l) => l ? `Start each season with the ${CLASSES[l].name} license.` : 'Start seasons with higher class licenses.', next: (l) => `Start with the ${CLASSES[l + 1].name} license` },
  ];
  const HER_BY_ID = Object.fromEntries(HERITAGE.map(h => [h.id, h]));

  // =====================================================================
  // Achievements (+2% income each, kept forever)
  // =====================================================================
  const ACHIEVEMENTS = [
    { id: 'tap100',   icon: '👆', name: 'Warm-up Lap',       desc: 'Tap 100 times',                    ok: () => S.stats.taps >= 100 },
    { id: 'tap1k',    icon: '👆', name: 'Stint Specialist',  desc: 'Tap 1,000 times',                  ok: () => S.stats.taps >= 1000 },
    { id: 'tap10k',   icon: '👆', name: 'Iron Thumb',        desc: 'Tap 10,000 times',                 ok: () => S.stats.taps >= 1e4 },
    { id: 'earn1k',   icon: '💵', name: 'First Paycheck',    desc: 'Earn $1K in total',                ok: () => S.totalEarned >= 1e3 },
    { id: 'earn1m',   icon: '💵', name: 'Millionaire',       desc: 'Earn $1M in total',                ok: () => S.totalEarned >= 1e6 },
    { id: 'earn1b',   icon: '💰', name: 'Billionaire',       desc: 'Earn $1B in total',                ok: () => S.totalEarned >= 1e9 },
    { id: 'earn1t',   icon: '💰', name: 'Trillionaire',      desc: 'Earn $1T in total',                ok: () => S.totalEarned >= 1e12 },
    { id: 'earn1qa',  icon: '🏦', name: 'Motorsport Empire', desc: 'Earn $1Qa in total',               ok: () => S.totalEarned >= 1e15 },
    { id: 'team10',   icon: '🔧', name: 'Small Shop',        desc: 'Have 10 team members',             ok: () => teamSize() >= 10 },
    { id: 'team100',  icon: '🔧', name: 'Full Paddock',      desc: 'Have 100 team members',            ok: () => teamSize() >= 100 },
    { id: 'team500',  icon: '🏭', name: 'Race Factory',      desc: 'Have 500 team members',            ok: () => teamSize() >= 500 },
    { id: 'team1k',   icon: '🏭', name: 'Industry Giant',    desc: 'Have 1,000 team members',          ok: () => teamSize() >= 1000 },
    { id: 'car3',     icon: '🚗', name: 'Growing Garage',    desc: 'Own 3 cars',                       ok: () => S.cars.length >= 3 },
    { id: 'gt3all',   icon: '🚗', name: 'GT3 Collector',     desc: 'Own every GT3 car',                ok: () => CARS.filter(c => c.kind === 'gt3').every(c => S.cars.includes(c.id)) },
    { id: 'carall',   icon: '🏎️', name: 'Complete Collection', desc: 'Own every car',                  ok: () => S.cars.length >= CARS.length },
    { id: 'win1',     icon: '🏁', name: 'Maiden Victory',    desc: 'Win a race',                       ok: () => S.stats.wins >= 1 },
    { id: 'win10',    icon: '🏁', name: 'Serial Winner',     desc: 'Win 10 races',                     ok: () => S.stats.wins >= 10 },
    { id: 'win50',    icon: '🏁', name: 'Endurance Icon',    desc: 'Win 50 races',                     ok: () => S.stats.wins >= 50 },
    { id: 'win100',   icon: '🏁', name: 'Centurion',         desc: 'Win 100 races',                    ok: () => S.stats.wins >= 100 },
    { id: 'lic1',     icon: '🎫', name: 'Going Pro',         desc: 'Earn the GTD PRO license',         ok: () => S.stats.maxLicense >= 1 },
    { id: 'lic2',     icon: '🎫', name: 'Prototype Pilot',   desc: 'Earn the LMP2 license',            ok: () => S.stats.maxLicense >= 2 },
    { id: 'lic3',     icon: '🎫', name: 'Top Class',         desc: 'Earn the GTP license',             ok: () => S.stats.maxLicense >= 3 },
    { id: 'title0',   icon: '🏆', name: 'GTD Champion',      desc: 'Win the GTD championship',         ok: () => S.stats.titles[0] >= 1 },
    { id: 'title1',   icon: '🏆', name: 'GTD PRO Champion',  desc: 'Win the GTD PRO championship',     ok: () => S.stats.titles[1] >= 1 },
    { id: 'title2',   icon: '🏆', name: 'LMP2 Champion',     desc: 'Win the LMP2 championship',        ok: () => S.stats.titles[2] >= 1 },
    { id: 'title3',   icon: '🏆', name: 'GTP Champion',      desc: 'Win the GTP championship',         ok: () => S.stats.titles[3] >= 1 },
    { id: 'pit1',     icon: '⏱️', name: 'Perfect Stop',      desc: 'Nail a perfect pit stop',          ok: () => S.stats.perfectPits >= 1 },
    { id: 'pit25',    icon: '⏱️', name: 'Pit Lane Royalty',  desc: 'Nail 25 perfect pit stops',        ok: () => S.stats.perfectPits >= 25 },
    { id: 'bonus1',   icon: '💰', name: 'Lucky Find',        desc: 'Catch a sponsor bonus',            ok: () => S.stats.bonuses >= 1 },
    { id: 'bonus25',  icon: '💰', name: 'Sponsor Magnet',    desc: 'Catch 25 sponsor bonuses',         ok: () => S.stats.bonuses >= 25 },
    { id: 'parts25',  icon: '🛠️', name: 'Development Driver', desc: 'Reach 25 total part levels',      ok: () => partLevels() >= 25 },
    { id: 'parts100', icon: '🛠️', name: 'Engineering Marvel', desc: 'Reach 100 total part levels',     ok: () => partLevels() >= 100 },
    { id: 'drv3',     icon: '🧑‍✈️', name: 'Full Lineup',      desc: 'Hire 3 drivers',                   ok: () => S.drivers.length >= 3 },
    { id: 'push10',   icon: '🔥', name: 'Flat Out',          desc: 'Use PUSH 10 times',                ok: () => S.stats.pushes >= 10 },
    { id: 'season1',  icon: '⭐', name: 'New Era',           desc: 'Start a new season',               ok: () => S.seasons >= 1 },
    { id: 'season5',  icon: '⭐', name: 'Dynasty',           desc: 'Start 5 new seasons',              ok: () => S.seasons >= 5 },
  ];

  // =====================================================================
  // State
  // =====================================================================
  const newChamp = () => ({ year: 0, round: 0, pts: 0, res: [], rivals: RIVALS.map(() => 0), str: RIVALS.map(() => 0.8 + Math.random() * 0.4) });
  const defaultStats = () => ({ taps: 0, races: 0, wins: 0, bonuses: 0, pushes: 0, perfectPits: 0, playTime: 0, maxLicense: 0, titles: [0, 0, 0, 0], started: Date.now() });
  const defaults = () => ({
    v: 2,
    teamName: 'Your Team',
    money: 0, seasonEarned: 0, totalEarned: 0,
    gens: GENS.map(() => 0),
    upgrades: [],
    license: 0,
    cars: ['lexus'],
    activeCar: 'lexus',
    parts: { gt3: PARTS.map(() => 0), lmp2: PARTS.map(() => 0), gtp: PARTS.map(() => 0) },
    drivers: [],
    champ: CLASSES.map(newChamp),
    raceClass: 0,
    seasonWins: 0,
    race: null,
    lp: 0, lpSpent: 0, lpFromMoney: 0,
    heritage: {},
    ach: [],
    seasons: 0,
    pushUntil: 0, pushReadyAt: 0,
    stats: defaultStats(),
    settings: { haptics: true, autoRace: true, photos: true },
    photos: {},
    lastSave: Date.now(),
  });

  let S = load();
  let owned = new Set(S.upgrades);
  let buyMode = '1';

  function sanitize(s) {
    const d = defaults();
    const out = Object.assign(d, s);
    out.gens = GENS.map((_, i) => (s.gens && s.gens[i]) || 0);
    out.parts = {};
    for (const k of ['gt3', 'lmp2', 'gtp']) out.parts[k] = PARTS.map((_, i) => (s.parts && s.parts[k] && s.parts[k][i]) || 0);
    out.upgrades = (s.upgrades || []).filter(id => UPG_BY_ID[id]);
    out.cars = (s.cars || ['lexus']).filter(id => CAR_BY_ID[id]);
    if (!out.cars.length) out.cars = ['lexus'];
    if (!CAR_BY_ID[out.activeCar] || !out.cars.includes(out.activeCar)) out.activeCar = out.cars[0];
    out.drivers = (s.drivers || []).filter(i => DRIVERS[i]);
    out.champ = CLASSES.map((_, i) => Object.assign(newChamp(), (s.champ && s.champ[i]) || {}));
    out.stats = Object.assign(defaultStats(), s.stats || {});
    out.stats.titles = [0, 1, 2, 3].map(i => (out.stats.titles && out.stats.titles[i]) || 0);
    out.settings = Object.assign(d.settings, s.settings || {});
    out.heritage = Object.assign({}, s.heritage || {});
    out.photos = Object.assign({}, s.photos || {});
    out.ach = (s.ach || []).filter(id => ACHIEVEMENTS.some(a => a.id === id));
    out.license = Math.max(0, Math.min(3, out.license | 0));
    out.raceClass = Math.max(0, Math.min(3, out.raceClass | 0));
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return sanitize(JSON.parse(raw));
      const old = localStorage.getItem(OLD_SAVE_KEY);
      if (old) return migrateV1(JSON.parse(old));
    } catch (e) { /* corrupt or unavailable storage: start fresh */ }
    return defaults();
  }

  function migrateV1(o) {
    const lic = Math.max(0, Math.min(3, o.classIdx | 0));
    const cars = ['lexus'];
    if (lic >= 2) cars.push('riley');
    if (lic >= 3) cars.push('arx06');
    return sanitize({
      money: o.money || 0, seasonEarned: o.seasonEarned || 0, totalEarned: o.totalEarned || 0,
      gens: o.gens, upgrades: o.upgrades, license: lic, cars, activeCar: cars[cars.length - 1],
      raceClass: KIND_CLASS[CAR_BY_ID[cars[cars.length - 1]].kind],
      lp: o.cp || 0, lpFromMoney: o.cp || 0, seasons: o.seasons || 0,
      stats: Object.assign({}, o.stats || {}, { maxLicense: lic }),
      settings: o.settings, lastSave: o.lastSave,
    });
  }

  function save() {
    S.upgrades = [...owned];
    S.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }

  // =====================================================================
  // Formatting
  // =====================================================================
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
  function money(n) { return '$' + fmt(n); }
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
  const esc = (t) => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pct = (v) => Math.round(v * 100) + '%';

  // =====================================================================
  // Derived values
  // =====================================================================
  const her = (id) => S.heritage[id] || 0;
  const activeCar = () => CAR_BY_ID[S.activeCar];
  const teamSize = () => S.gens.reduce((a, b) => a + b, 0);
  const kindParts = (kind = activeCar().kind) => S.parts[kind];
  const partLevels = (kind) => (kind ? S.parts[kind] : [...S.parts.gt3, ...S.parts.lmp2, ...S.parts.gtp]).reduce((a, b) => a + b, 0);

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
  function lineup() {
    return [...S.drivers].sort((a, b) => DRIVERS[b].tier - DRIVERS[a].tier || b - a).slice(0, LINEUP_SIZE);
  }
  // Sum of a perk type from the active car + driver lineup.
  function perk(type) {
    let v = 0;
    const c = activeCar();
    if (c.perk[0] === type) v += c.perk[1];
    for (const i of lineup()) if (DRIVERS[i].perk[0] === type) v += DRIVERS[i].perk[1];
    return v;
  }

  function pushActive(now = Date.now()) { return now < S.pushUntil; }
  function pushMult() { return upgradeMax('pushMult', 2); }
  function pushDur() { return upgradeMax('pushDur', 30) + perk('pushDur'); }

  function genMult(i) {
    let m = 1;
    const c = S.gens[i];
    for (const t of MILESTONES) if (c >= t) m *= 2;
    for (const id of owned) { const u = UPG_BY_ID[id]; if (u.type === 'gen' && u.gen === i) m *= u.val; }
    return m;
  }
  function permanentMult() {
    return CLASSES[S.license].mult
      * (1 + LP_BONUS * S.lp)
      * (1 + WIN_BONUS * Math.min(WIN_BONUS_CAP, S.seasonWins))
      * (1 + CAR_BONUS * (S.cars.length - 1))
      * (1 + ACH_BONUS * S.ach.length)
      * (1 + perk('income'))
      * upgradeProduct('global');
  }
  function globalMult(now) { return permanentMult() * (pushActive(now) ? pushMult() : 1); }
  function genIps(i, now) { return GENS[i].ips * genMult(i) * globalMult(now); }
  function totalIps(now = Date.now(), withPush = true) {
    let base = 0;
    for (let i = 0; i < GENS.length; i++) base += S.gens[i] * GENS[i].ips * genMult(i);
    return base * (withPush ? globalMult(now) : permanentMult());
  }
  function tapPctSum() {
    let s = 0;
    for (const id of owned) { const u = UPG_BY_ID[id]; if (u.type === 'tapPct') s += u.val; }
    return s;
  }
  function tapValue(now = Date.now()) {
    const flat = upgradeProduct('tap') * Math.pow(3, her('tapper')) * (1 + perk('tap')) * globalMult(now);
    return flat + totalIps(now) * tapPctSum();
  }

  // Racing
  const partsMult = (kind = activeCar().kind) => 1 + PART_STEP * partLevels(kind);
  const driversMult = () => 1 + lineup().reduce((a, i) => a + TIERS[DRIVERS[i].tier].pace, 0);
  function pace(car = activeCar()) { return car.pace * partsMult(car.kind) * driversMult() * (1 + perk('pace')); }
  // Rivals get 10% faster for every title you've won in that class.
  function trackReq(c, t, titles) { return CLASSES[c].req * (1 + 0.05 * t) * (1 + 0.1 * titles); }
  function expectedPos(r) { return 10 - 30 * (r - 1); }
  const clampPos = (p) => Math.max(1, Math.min(FIELD, Math.round(p)));
  function raceDuration(t) {
    const f = Math.max(0.3, 1 - 0.2 * her('speed') - perk('raceSpeed'));
    return Math.round((20 + TRACKS[t].hours * 1.5) * f);
  }
  function posMult(pos) { return pos === 1 ? 2 : pos === 2 ? 1.6 : pos === 3 ? 1.4 : Math.max(0.2, 1.2 - 0.05 * pos); }
  function prizeFor(c, t, pos, year) {
    const base = CLASSES[c].prize * (1 + 0.1 * t) * (1 + 0.25 * year) + totalIps(Date.now(), false) * 8;
    return base * posMult(pos) * upgradeProduct('prize') * (1 + perk('prize'));
  }
  function canRaceClass(c, car = activeCar()) {
    if (c > S.license) return false;
    return car.kind === CLASSES[c].kind;
  }
  function eligibleClasses(car = activeCar()) { return CLASSES.map((_, c) => c).filter(c => canRaceClass(c, car)); }

  // Prices
  const carDisc = () => 1 - 0.15 * her('cars');
  const carPrice = (car) => car.price * carDisc();
  const licensePrice = (c) => CLASSES[c].license.cost * carDisc();
  const partPrice = (i, kind = activeCar().kind) => PART_KIND_COST[kind] * PARTS[i].base * Math.pow(PART_GROWTH, S.parts[kind][i]) * (1 - 0.2 * her('eng')) * (1 - perk('partsDisc'));
  const heritageCost = (h) => h.costs[her(h.id)];

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
  function buyQty(i) { return buyMode === 'max' ? Math.max(1, maxAffordable(i)) : parseInt(buyMode, 10); }

  function earn(x) {
    S.money += x;
    S.seasonEarned += x;
    S.totalEarned += x;
  }

  const lpPotential = () => Math.floor(Math.cbrt(S.totalEarned / LP_DIVISOR));
  const lpGain = () => Math.max(0, lpPotential() - S.lpFromMoney);
  const lpFree = () => S.lp - S.lpSpent;
  const nextLpAt = () => Math.pow(Math.max(lpPotential(), S.lpFromMoney) + 1, 3) * LP_DIVISOR;

  // =====================================================================
  // Actions
  // =====================================================================
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
  }

  function buyUpgrade(id) {
    const u = UPG_BY_ID[id];
    if (!u || owned.has(id) || S.money < u.cost) return;
    S.money -= u.cost;
    owned.add(id);
    buzz(10);
  }

  function buyPart(i) {
    const lv = kindParts();
    if (lv[i] >= PART_MAX) return;
    const c = partPrice(i);
    if (S.money < c) return;
    S.money -= c;
    lv[i]++;
    buzz(8);
  }

  function hireDriver(i) {
    const d = DRIVERS[i];
    if (S.drivers.includes(i) || S.money < d.cost) return;
    S.money -= d.cost;
    S.drivers.push(i);
    buzz(12);
    const inLineup = lineup().includes(i);
    toast(`🧑‍✈️ ${d.name} signed${inLineup ? ' and joins the lineup' : ''}!`);
  }

  function buyCar(id) {
    const car = CAR_BY_ID[id];
    if (S.cars.includes(id) || KIND_CLASS[car.kind] > S.license) return;
    const price = carPrice(car);
    if (S.money < price) return;
    S.money -= price;
    S.cars.push(id);
    S.activeCar = id;
    const elig = eligibleClasses(car);
    if (!elig.includes(S.raceClass)) S.raceClass = elig[elig.length - 1];
    renderCar();
    buzz([20, 40, 20]);
    modal(`New car: ${car.name}`, `<div class="modal-car">${carVisual(car, 640)}</div><p>Pace <b>${car.pace}</b> · ${PERK_TEXT[car.perk[0]](car.perk[1])}</p><p>Every car in your garage adds <b>+${pct(CAR_BONUS)}</b> income.</p>`, [{ label: 'Take it out' }]);
  }

  function equipCar(id) {
    if (!S.cars.includes(id) || S.race) return;
    S.activeCar = id;
    const elig = eligibleClasses();
    if (!elig.includes(S.raceClass)) S.raceClass = elig[elig.length - 1];
    renderCar();
    buzz(10);
  }

  function buyLicense(c) {
    const cls = CLASSES[c];
    if (c !== S.license + 1) return;
    if (S.champ[c - 1] && winsInClass(c - 1) < cls.license.wins) return;
    const price = licensePrice(c);
    if (S.money < price) return;
    S.money -= price;
    S.license = c;
    S.stats.maxLicense = Math.max(S.stats.maxLicense, c);
    applyClassTheme();
    buzz([20, 40, 20]);
    const needsCar = cls.kind !== 'gt3' ? `<p>Buy a ${cls.name} car in the showroom to start racing.</p>` : '<p>Pick GTD PRO in the Races tab.</p>';
    modal(`🎫 ${cls.name} license!`, `<p>${cls.desc}</p>${needsCar}`, [{ label: 'Let’s go' }]);
  }

  function winsInClass(c) {
    return S.champ[c].wins || 0;
  }

  function activatePush() {
    const now = Date.now();
    if (now < S.pushReadyAt) return;
    S.pushUntil = now + pushDur() * 1000;
    S.pushReadyAt = now + PUSH_COOLDOWN_MS + pushDur() * 1000;
    S.stats.pushes++;
    buzz([15, 30, 15]);
    toast(`🔥 PUSH! Income x${pushMult()} for ${pushDur()}s`);
  }

  function buyHeritage(id) {
    const h = HER_BY_ID[id];
    const lvl = her(id);
    if (lvl >= h.costs.length) return;
    const cost = h.costs[lvl];
    if (lpFree() < cost) return;
    S.lpSpent += cost;
    S.heritage[id] = lvl + 1;
    if (id === 'paddock' && S.license < lvl + 1) {
      S.license = lvl + 1;
      S.stats.maxLicense = Math.max(S.stats.maxLicense, S.license);
      applyClassTheme();
    }
    buzz([15, 30, 15]);
    toast(`${h.icon} ${h.name} upgraded!`);
  }

  // ---------------- Races ----------------
  let autoStarted = false;
  function startRace(c, auto = false) {
    if (S.race || !canRaceClass(c)) return;
    const ch = S.champ[c];
    const t = ch.round;
    const now = Date.now();
    const r = pace() / trackReq(c, t, ch.titles || 0);
    const base = expectedPos(r) + (Math.random() * 3 - 1.5);
    const dur = raceDuration(t) * 1000;
    S.raceClass = c;
    S.race = { c, t, start: now, end: now + dur, dur, base, pit: null, grid: clampPos(base + 4 + Math.random() * 6) };
    autoStarted = auto;
    buzz(20);
    if (!auto) toast(`🟢 Green flag at ${TRACKS[t].name}!`);
  }

  function racePos(r) {
    const adj = { perfect: -2.5, good: -1.2, slow: 0.4, miss: 1, none: 0 }[r.pit || 'none'];
    return clampPos(r.base + adj);
  }

  function finishRace() {
    const r = S.race;
    S.race = null;
    closePit();
    if (!r.pit) r.pit = her('autoPit') ? 'good' : 'slow';
    const c = r.c, t = r.t;
    const ch = S.champ[c];
    const pos = racePos(r);
    const prize = prizeFor(c, t, pos, ch.year);
    earn(prize);
    S.stats.races++;
    if (pos === 1) { S.stats.wins++; S.seasonWins++; ch.wins = (ch.wins || 0) + 1; }

    // Championship points: rivals fill the other positions.
    ch.pts += POINTS[pos - 1] || 0;
    const order = RIVALS.map((_, j) => ({ j, s: ch.str[j] + Math.random() * 1.5 })).sort((a, b) => b.s - a.s);
    let p = 1;
    for (const o of order) {
      if (p === pos) p++;
      ch.rivals[o.j] += POINTS[p - 1] || 0;
      p++;
    }
    ch.res.push(pos);
    ch.round++;

    const lic = c + 1 < CLASSES.length ? CLASSES[c + 1].license : null;
    const unlockMsg = lic && S.license === c && ch.wins === lic.wins
      ? `<p>🎫 ${lic.wins} wins! You can now buy the <b>${CLASSES[c + 1].name}</b> license in the Garage.</p>` : '';

    buzz(pos <= 3 ? [30, 50, 30, 50, 60] : 25);
    const pitTxt = { perfect: '⚡ Perfect pit stop', good: '✅ Good pit stop', slow: '🐢 Slow pit stop', miss: '❌ Fumbled pit stop' }[r.pit];
    const champDone = ch.round >= TRACKS.length;

    if (autoStarted && !champDone && !unlockMsg) {
      toast(`🏁 ${TRACKS[t].name}: P${pos} · +${money(prize)}`);
    } else {
      const title = pos === 1 ? '🏆 VICTORY!' : pos <= 3 ? '🍾 Podium!' : '🏁 Checkered flag';
      const body = `<p>${CLASSES[c].name} · ${TRACKS[t].name}</p><div class="big-num pos-${Math.min(pos, 4)}">P${pos}</div>
        <p>Prize money <b>${money(prize)}</b> · +${POINTS[pos - 1] || 0} pts</p><p class="muted">${pitTxt}</p>
        ${pos === 1 ? `<p>Race wins add <b>+${pct(WIN_BONUS)}</b> income each this season.</p>` : ''}${unlockMsg}`;
      modal(title, body, [{ label: champDone ? 'Final standings' : 'Continue' }]);
    }
    if (champDone) endChampionship(c);
  }

  function standings(c) {
    const ch = S.champ[c];
    const rows = RIVALS.map((n, j) => ({ name: n, pts: ch.rivals[j], you: false }));
    rows.push({ name: S.teamName, pts: ch.pts, you: true });
    return rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));
  }

  function endChampionship(c) {
    const ch = S.champ[c];
    const table = standings(c);
    const place = table.findIndex(r => r.you) + 1;
    let body = `<p>${CLASSES[c].name} championship · Year ${ch.year + 1}</p>`;
    const titled = place === 1;
    if (titled) {
      const lp = TITLE_LP[c];
      S.lp += lp;
      S.stats.titles[c]++;
      body += `<div class="big-num">🏆 CHAMPIONS</div><p>Title bonus: <b>+${lp} ⭐ Legacy</b> (yours forever).</p>`;
    } else {
      body += `<div class="big-num">P${place}</div><p>Finish first in the standings to win the title and Legacy Points.</p>`;
    }
    body += standingsHTML(table.slice(0, 5));
    body += `<p class="muted">Year ${ch.year + 2} starts now: prizes are 25% bigger${titled ? ' and rivals are 10% faster to beat the champions' : ''}.</p>`;
    modal(titled ? 'Champions!' : 'Season complete', body, [{ label: 'Next year' }]);
    Object.assign(ch, newChamp(), { year: ch.year + 1, wins: ch.wins, titles: (ch.titles || 0) + (titled ? 1 : 0) });
    buzz(place === 1 ? [40, 60, 40, 60, 80] : 30);
  }

  function standingsHTML(rows) {
    return `<div class="standings">${rows.map((r, i) => `<div class="st-row${r.you ? ' you' : ''}"><span>${i + 1}</span><span>${esc(r.name)}</span><b>${r.pts}</b></div>`).join('')}</div>`;
  }

  // Pit stop mini-game
  const pitBox = document.getElementById('pitBox');
  const pitNeedle = document.getElementById('pitNeedle');
  const pitZone = document.getElementById('pitZone');
  const pitPerfect = document.getElementById('pitPerfect');
  let pitOpenAt = 0, pitZoneW = 0.2;
  function pitWidth() { return Math.min(0.6, 0.2 * (1 + 0.5 * her('pitPro')) * (1 + perk('pit'))); }
  function openPit() {
    pitOpenAt = performance.now();
    pitZoneW = pitWidth();
    pitZone.style.left = (50 - pitZoneW * 50) + '%';
    pitZone.style.width = (pitZoneW * 100) + '%';
    pitPerfect.style.left = (50 - pitZoneW * 15) + '%';
    pitPerfect.style.width = (pitZoneW * 30) + '%';
    pitBox.classList.remove('hidden');
    buzz([10, 20, 10]);
  }
  function closePit() { pitBox.classList.add('hidden'); pitOpenAt = 0; }
  function needlePos(t) { return (Math.sin((t - pitOpenAt) / 1000 * 3.6 - Math.PI / 2) + 1) / 2; }
  function resolvePit(result) {
    if (!S.race || S.race.pit) return;
    S.race.pit = result;
    closePit();
    if (result === 'perfect') S.stats.perfectPits++;
    const msg = { perfect: '⚡ PERFECT STOP! +2 places', good: '✅ Good stop! +1 place', miss: '❌ Wheel nut stuck… lost a place', slow: '🐢 Slow stop' }[result];
    toast(msg);
    buzz(result === 'perfect' ? [20, 30, 20, 30] : 15);
  }
  pitBox.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const d = Math.abs(needlePos(performance.now()) - 0.5);
    resolvePit(d <= pitZoneW * 0.15 ? 'perfect' : d <= pitZoneW * 0.5 ? 'good' : 'miss');
  });

  // ---------------- Seasons ----------------
  function newSeason() {
    const gain = lpGain();
    if (gain <= 0) return;
    modal('Start a new season?', `<p>Money, team, upgrades, cars, parts, drivers, licenses and championships reset.</p>
      <p>You keep Legacy Points, Legacy perks, achievements and stats, and earn</p><div class="big-num">+${gain} ⭐</div>
      <p>Each Legacy Point adds +${pct(LP_BONUS)} income forever and can be spent on Legacy perks.</p>`, [
      { label: 'Not yet', ghost: true },
      { label: 'New season', action: () => {
        const keep = {
          lp: S.lp + gain, lpSpent: S.lpSpent, lpFromMoney: S.lpFromMoney + gain, heritage: S.heritage, ach: S.ach,
          seasons: S.seasons + 1, totalEarned: S.totalEarned, stats: S.stats, settings: S.settings, teamName: S.teamName,
        };
        S = Object.assign(defaults(), keep);
        S.money = [0, 1e4, 1e6, 1e8, 1e10][her('seed')] || 0;
        S.license = her('paddock');
        owned = new Set();
        save();
        applyClassTheme();
        renderCar();
        toast(`⭐ Season ${S.seasons + 1} begins! +${gain} Legacy`);
        buzz([30, 40, 30]);
      } },
    ]);
  }

  // =====================================================================
  // Car artwork (see cars.js)
  // =====================================================================
  function carSVG(car) {
    return window.CarArt.svg(car.id, { num: car.num, cls: CLASSES[KIND_CLASS[car.kind]].color });
  }

  // Real photos (see photos.js); the drawing is the fallback.
  let photoVer = 0;
  const photoTried = {};
  const photoFailed = {};
  function photoOf(id) {
    if (!S.settings.photos || !window.CarPhotos) return null;
    const p = S.photos[id];
    return p && !photoFailed[p.url] ? p : null;
  }
  function ensurePhoto(id) {
    if (!S.settings.photos || !window.CarPhotos || S.photos[id] || photoTried[id]) return;
    photoTried[id] = true;
    CarPhotos.search(id).then(list => {
      const i = list.findIndex(p => !photoFailed[p.url]);
      if (i < 0) return;
      S.photos[id] = Object.assign({ i }, list[i]);
      photoChanged(id);
    });
  }
  function nextPhoto(id) {
    CarPhotos.search(id).then(list => {
      if (!list.length) { toast('📷 No photos found for this car right now'); return; }
      const cur = S.photos[id] ? S.photos[id].i : -1;
      for (let k = 1; k <= list.length; k++) {
        const i = (cur + k) % list.length;
        if (!photoFailed[list[i].url]) { S.photos[id] = Object.assign({ i }, list[i]); break; }
      }
      photoChanged(id);
      toast(`📷 Photo ${S.photos[id].i + 1} of ${list.length}`);
    });
  }
  function photoChanged(id) {
    photoVer++;
    if (id === S.activeCar) renderCar();
    renderPanel(activeTab, false);
  }
  const photoCredit = (p) => `📷 ${esc(p.artist || 'Wikimedia Commons')}${p.license ? ' · ' + esc(p.license) : ''}`;
  function carVisual(car, w) {
    const p = photoOf(car.id);
    if (!p) { ensurePhoto(car.id); return carSVG(car); }
    return `<img class="car-photo" data-car="${car.id}" src="${esc(CarPhotos.sized(p.url, w))}" alt="${esc(car.name)}" crossorigin="anonymous" referrerpolicy="no-referrer" decoding="async">`;
  }
  // A photo that won't load: retry once without CORS, then fall back to the drawing.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!img.classList || !img.classList.contains('car-photo')) return;
    if (img.hasAttribute('crossorigin')) { img.removeAttribute('crossorigin'); img.src = img.src; return; }
    const id = img.dataset.car;
    if (S.photos[id]) photoFailed[S.photos[id].url] = true;
    img.outerHTML = carSVG(CAR_BY_ID[id]);
    if (id === S.activeCar) renderCar();
  }, true);

  // =====================================================================
  // Tap & effects
  // =====================================================================
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const fx = $('fx');
  const carEl = $('car');
  const tapHint = $('tapHint');
  let floatCount = 0;
  let speedKick = 0;

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
    for (const el of [carEl, $('stagePhoto')]) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
    speedKick = Math.min(speedKick + 120, 900);
    if (S.stats.taps > 15) tapHint.classList.add('hidden');
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

  // Sponsor bonus pickups
  const bonusGap = () => (45000 + Math.random() * 75000) / (1 + 0.5 * her('fans') + perk('bonusFreq'));
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
    bonusEl.style.top = (24 + Math.random() * 36) + '%';
    bonusEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const now = Date.now();
      const reward = Math.max(totalIps(now) * 90, tapValue(now) * 40, 25) * (1 + perk('bonusVal'));
      earn(reward);
      S.stats.bonuses++;
      const rect = stage.getBoundingClientRect();
      spawnFloat(e.clientX - rect.left, e.clientY - rect.top, '+' + money(reward), 'gold');
      toast(`💰 Sponsor bonus! +${money(reward)}`);
      buzz([20, 30, 20]);
      removeBonus();
    });
    stage.appendChild(bonusEl);
    const mine = bonusEl;
    setTimeout(() => { if (bonusEl === mine) removeBonus(); }, 10000);
  }
  function removeBonus() {
    if (bonusEl) bonusEl.remove();
    bonusEl = null;
    nextBonusAt = Date.now() + bonusGap();
  }

  // =====================================================================
  // Stage car + road animation
  // =====================================================================
  let wheels = [];
  function renderCar() {
    const car = activeCar();
    const p = photoOf(car.id);
    stage.classList.toggle('photo', !!p);
    $('stagePhoto').innerHTML = p ? carVisual(car, 1200) + `<span class="credit">${photoCredit(p)}</span>` : '';
    carEl.innerHTML = p ? '' : carSVG(car);
    if (!p) ensurePhoto(car.id);
    wheels = [...carEl.querySelectorAll('.wheel')];
    $('carName').textContent = activeCar().name;
  }
  function applyClassTheme() {
    const c = CLASSES[S.license];
    document.documentElement.style.setProperty('--class', c.color);
    const badge = $('classBadge');
    badge.textContent = c.name;
    badge.style.background = c.color;
  }

  const laneEl = $('lane');
  const curbEl = $('curb');
  let roadOffset = 0, wheelAngle = 0, lastFrame = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - lastFrame) / 1000);
    lastFrame = t;
    let speed = 140 + 70 * Math.log10(cachedIps + 1) + speedKick + (S.race ? 300 : 0);
    if (pushActive()) speed *= 1.5;
    speed = Math.min(speed, 2400);
    speedKick = Math.max(0, speedKick - 900 * dt);
    roadOffset = (roadOffset + speed * dt) % 4800;
    laneEl.style.backgroundPositionX = -roadOffset + 'px';
    curbEl.style.backgroundPositionX = -roadOffset + 'px';
    wheelAngle = (wheelAngle + speed * dt * 4) % 360;
    for (const w of wheels) w.setAttribute('transform', `rotate(${wheelAngle} ${w.dataset.cx} ${w.dataset.cy})`);
    updateRaceHud();
    if (pitOpenAt) pitNeedle.style.left = (needlePos(t) * 100) + '%';
    requestAnimationFrame(frame);
  }

  // =====================================================================
  // UI
  // =====================================================================
  const moneyEl = $('money'), ipsEl = $('ips'), tapEl = $('tapVal'), lpEl = $('lpCount'), paceEl = $('paceVal');
  const pushBtn = $('pushBtn'), pushSub = $('pushSub');
  let cachedIps = 0;

  function renderHeader() {
    const now = Date.now();
    cachedIps = totalIps(now);
    moneyEl.textContent = money(S.money);
    ipsEl.textContent = money(cachedIps);
    tapEl.textContent = money(tapValue(now));
    paceEl.textContent = Math.round(pace());
    lpEl.textContent = S.lp;
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

  const raceHud = $('raceHud');
  function updateRaceHud() {
    const r = S.race;
    if (!r) { raceHud.classList.add('hidden'); return; }
    raceHud.classList.remove('hidden');
    const now = Date.now();
    const remaining = Math.max(0, r.end - now);
    const prog = Math.min(1, 1 - remaining / r.dur);
    const target = r.pit ? racePos(r) : clampPos(r.base);
    const pos = clampPos(r.grid + (target - r.grid) * Math.min(1, prog * 1.3));
    $('raceHudName').textContent = `${CLASSES[r.c].name} · ${TRACKS[r.t].name}`;
    $('raceHudPos').textContent = 'P' + pos;
    $('raceHudBar').style.width = (prog * 100) + '%';
    const hrs = TRACKS[r.t].hours;
    $('raceHudTime').textContent = hrs >= 3 ? `Hour ${Math.min(Math.floor(prog * hrs) + 1, Math.ceil(hrs))} of ${hrs}` : `${Math.round(prog * 100)}% complete`;
  }

  // ---------------- Panels (HTML rebuilt on state change; buttons auto-enable) ----------------
  const panels = {
    team: { el: $('teamList'), key: teamKey, html: teamHTML },
    upgrades: { el: $('upgBox'), key: upgKey, html: upgHTML },
    garage: { el: $('garageBox'), key: garageKey, html: garageHTML },
    races: { el: $('raceBox'), key: racesKey, html: racesHTML },
    legacy: { el: $('legacyBox'), key: legacyKey, html: legacyHTML },
    more: { el: $('moreBox'), key: moreKey, html: moreHTML },
  };
  const panelKeys = {};
  let activeTab = 'team';

  function econKey() {
    return [S.license, S.lp, S.seasonWins, S.cars.length, S.ach.length, owned.size, pushActive() ? 1 : 0, S.activeCar, S.drivers.length].join('|');
  }
  function teamKey() {
    return econKey() + S.gens.join(',') + buyMode + (buyMode === 'max' ? GENS.map((_, i) => maxAffordable(i)).join(',') : '');
  }
  function upgKey() { return econKey() + availableUpgrades().map(u => u.id).join(','); }
  function garageKey() { return econKey() + photoVer + S.settings.photos + kindParts().join(',') + S.cars.join(',') + her('eng') + her('cars') + (S.race ? 1 : 0) + S.champ.map(c => c.wins || 0).join(','); }
  function racesKey() {
    const ch = S.champ[S.raceClass];
    return econKey() + S.raceClass + '|' + ch.round + '|' + ch.year + '|' + (S.race ? 'r' : '') + '|' + Math.round(pace()) + S.settings.autoRace + her('auto');
  }
  function legacyKey() { return [S.lp, S.lpSpent, lpGain(), S.ach.length, JSON.stringify(S.heritage), Math.floor(Math.log10(S.totalEarned + 1) * 4)].join('|'); }
  function moreKey() { return photoVer + '|' + S.settings.photos + '|' + Math.floor(S.stats.playTime / 5) + '|' + S.stats.taps + '|' + S.settings.haptics + S.teamName; }

  function btn(act, arg, label, sub, cost, extraCls = '') {
    const costAttr = cost != null ? ` data-cost="${cost}"` : '';
    return `<button class="buy ${extraCls}" type="button" data-act="${act}" data-arg="${arg}"${costAttr}${cost != null && S.money < cost ? ' disabled' : ''}><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`;
  }
  const lockedBtn = (label, sub) => `<button class="buy" type="button" disabled><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`;

  // --- Team ---
  function teamHTML() {
    const now = Date.now();
    let html = '';
    let teaser = false;
    GENS.forEach((g, i) => {
      const visible = i === 0 || S.gens[i] > 0 || S.gens[i - 1] > 0;
      if (!visible) { teaser = true; return; }
      const k = buyQty(i);
      const cost = costFor(i, k);
      const each = genIps(i, now);
      const next = MILESTONES.find(t => S.gens[i] < t);
      const prev = [...MILESTONES].reverse().find(t => S.gens[i] >= t) || 0;
      const prog = next ? (S.gens[i] - prev) / (next - prev) * 100 : 100;
      html += `<div class="row">
        <div class="ico">${g.icon}${S.gens[i] ? `<span class="count">${S.gens[i]}</span>` : ''}</div>
        <div class="info"><div class="name">${g.name}</div><div class="desc">${g.desc}</div>
          <div class="stat">${S.gens[i] ? `${money(each * S.gens[i])}/s <em>· ${money(each)}/s each</em>` : `<em>+${money(each)}/s each</em>`}</div>
          <div class="mbar" title="${next ? `Next x2 at ${next}` : 'All milestones reached'}"><i style="width:${prog}%"></i></div></div>
        ${btn('gen', i, 'x' + k, money(cost), cost)}</div>`;
    });
    if (teaser) html += `<div class="row"><div class="ico">❔</div><div class="info"><div class="name">Locked</div><div class="desc">Hire the previous team member to reveal.</div></div></div>`;
    return html;
  }

  // --- Upgrades ---
  function availableUpgrades() { return UPGRADES.filter(u => !owned.has(u.id) && u.req()).sort((a, b) => a.cost - b.cost); }
  function upgHTML() {
    const list = availableUpgrades();
    let html = `<div class="section-title">Upgrades · ${owned.size} owned</div>`;
    if (!list.length) html += `<div class="empty">Keep growing your team to unlock more upgrades.</div>`;
    for (const u of list) {
      html += `<div class="row"><div class="ico">${u.icon}</div><div class="info"><div class="name">${esc(u.name)}</div><div class="desc">${esc(u.desc)}</div></div>${btn('upg', u.id, 'Buy', money(u.cost), u.cost)}</div>`;
    }
    return html;
  }

  // --- Garage ---
  function garageHTML() {
    const car = activeCar();
    const cls = KIND_CLASS[car.kind];
    const lu = lineup();
    let html = `<div class="hero" style="--cc:${CLASSES[cls].color}">
      <div class="hero-car">${carVisual(car, 800)}</div>
      <div class="hero-name">${esc(car.name)}</div>
      ${S.settings.photos ? `<div class="photo-row"><span>${photoOf(car.id) ? photoCredit(photoOf(car.id)) : 'Drawing (photo loading or unavailable)'}</span><button class="mini" type="button" data-act="photo" data-arg="${car.id}">📷 Next photo</button></div>` : ''}
      <div class="hero-tags"><span class="tag" style="background:${CLASSES[cls].color}">${car.kind === 'gt3' ? 'GT3' : CLASSES[cls].name}</span><span>${PERK_TEXT[car.perk[0]](car.perk[1])}</span></div>
      <div class="pace-line">
        <div><small>Car</small><b>${car.pace}</b></div><i>×</i>
        <div><small>Parts</small><b>${partsMult().toFixed(2)}</b></div><i>×</i>
        <div><small>Drivers</small><b>${driversMult().toFixed(2)}</b></div>${perk('pace') ? `<i>×</i><div><small>Perks</small><b>${(1 + perk('pace')).toFixed(2)}</b></div>` : ''}<i>=</i>
        <div class="pace-total"><small>Pace</small><b>${Math.round(pace())}</b></div>
      </div></div>`;

    html += `<div class="section-title">${car.kind === 'gt3' ? 'GT3' : CLASSES[cls].name} development · +${pct(PART_STEP)} pace per level</div>`;
    PARTS.forEach((p, i) => {
      const lvl = kindParts()[i];
      const c = partPrice(i);
      html += `<div class="row"><div class="ico">${p.icon}<span class="count">${lvl}</span></div>
        <div class="info"><div class="name">${p.name}</div><div class="desc">${p.desc}</div></div>
        ${lvl >= PART_MAX ? lockedBtn('MAX', '') : btn('part', i, 'Lv ' + (lvl + 1), money(c), c)}</div>`;
    });

    html += `<div class="section-title">Drivers · best ${LINEUP_SIZE} race (${lu.length}/${LINEUP_SIZE})</div>`;
    DRIVERS.forEach((d, i) => {
      const t = TIERS[d.tier];
      const hired = S.drivers.includes(i);
      const inLu = lu.includes(i);
      // Reveal the market gradually: the first two, then one past each signing.
      if (!hired && i > 1 && !S.drivers.includes(i - 1)) {
        if (S.drivers.includes(i - 2) || (i === 2 && !S.drivers.length)) html += `<div class="row dim"><div class="ico">❔</div><div class="info"><div class="name">Scouting…</div><div class="desc">Sign more drivers to find faster talent.</div></div></div>`;
        return;
      }
      html += `<div class="row driver${hired && !inLu ? ' dim' : ''}"><div class="ico helmet" style="--hc:${t.color}">🪖</div>
        <div class="info"><div class="name">${esc(d.name)} <span class="tier" style="color:${t.color}">${t.name}</span></div>
        <div class="desc">+${pct(t.pace)} pace · ${PERK_TEXT[d.perk[0]](d.perk[1])}${inLu ? ' · <b class="ok">In lineup</b>' : hired ? ' · Reserve' : ''}</div></div>
        ${hired ? lockedBtn('Signed', '') : btn('drv', i, 'Sign', money(d.cost), d.cost)}</div>`;
    });

    html += `<div class="section-title">Showroom · each car adds +${pct(CAR_BONUS)} income</div>`;
    for (const kind of ['gt3', 'lmp2', 'gtp']) {
      const c = KIND_CLASS[kind];
      html += `<div class="kind-title"><span class="dotc" style="background:${CLASSES[c].color}"></span>${KIND_LABEL[kind]}</div>`;
      // Licenses for this group
      const licClasses = kind === 'gt3' ? [1] : [c];
      for (const lc of licClasses) {
        const L = CLASSES[lc];
        if (S.license >= lc) continue;
        const wins = winsInClass(lc - 1);
        const ready = S.license === lc - 1 && wins >= L.license.wins;
        const price = licensePrice(lc);
        html += `<div class="row license"><div class="ico">🎫</div><div class="info"><div class="name">${L.name} license</div>
          <div class="desc">${L.desc}</div><div class="stat"><em>Needs ${L.license.wins} ${CLASSES[lc - 1].name} wins (${Math.min(wins, L.license.wins)}/${L.license.wins})</em></div></div>
          ${ready ? btn('lic', lc, 'Buy', money(price), price) : lockedBtn('🔒', S.license < lc - 1 ? `${CLASSES[lc - 1].name} first` : 'Win races')}</div>`;
      }
      for (const car2 of CARS.filter(x => x.kind === kind)) {
        const have = S.cars.includes(car2.id);
        const active = S.activeCar === car2.id;
        const licOk = c <= S.license;
        const price = carPrice(car2);
        let b;
        if (active) b = lockedBtn('Active', '✓');
        else if (have) b = S.race ? lockedBtn('Equip', 'after race') : btn('equip', car2.id, 'Equip', '', null);
        else if (!licOk) b = lockedBtn('🔒', CLASSES[c].name + ' license');
        else b = btn('car', car2.id, 'Buy', money(price), price);
        html += `<div class="row car-row${active ? ' active' : ''}"><div class="thumb">${carVisual(car2, 320)}</div>
          <div class="info"><div class="name">${esc(car2.name)}</div><div class="desc">Pace ${car2.pace} · ${PERK_TEXT[car2.perk[0]](car2.perk[1])}</div></div>${b}</div>`;
      }
    }
    return html;
  }

  // --- Races ---
  function racesHTML() {
    const car = activeCar();
    const elig = eligibleClasses(car);
    let html = `<div class="chips">${CLASSES.map((cl, c) => {
      const ok = elig.includes(c);
      const locked = c > S.license;
      return `<button class="chip${S.raceClass === c ? ' on' : ''}" type="button" data-act="rclass" data-arg="${c}" ${ok && !S.race ? '' : 'disabled'} style="--cc:${cl.color}">${locked ? '🔒 ' : ''}${cl.name}</button>`;
    }).join('')}</div>`;
    if (!elig.includes(S.raceClass)) S.raceClass = elig[elig.length - 1];
    const c = S.raceClass;
    const ch = S.champ[c];
    const t = Math.min(ch.round, TRACKS.length - 1);
    const req = trackReq(c, t, ch.titles || 0);
    const myPace = pace();
    const exp = clampPos(expectedPos(myPace / req));
    const label = exp === 1 ? 'Favorite to win' : exp <= 3 ? 'Podium contender' : exp <= 10 ? 'Midfield' : 'Backmarker';
    const running = S.race && S.race.c === c;
    const tr = TRACKS[t];
    html += `<div class="next-race" style="--cc:${CLASSES[c].color}">
      <div class="nr-top"><span>${CLASSES[c].name} · Year ${ch.year + 1} · Round ${t + 1}/${TRACKS.length}</span></div>
      <div class="nr-name">${tr.name}</div><div class="nr-place">${tr.place} · ${tr.hours >= 3 ? tr.hours + ' hours' : 'sprint'} · ${raceDuration(t)}s</div>
      <div class="nr-grid">
        <div><small>Your pace</small><b>${Math.round(myPace)}</b></div>
        <div><small>Field pace</small><b>${Math.round(req)}</b></div>
        <div><small>Expected</small><b class="pos-${Math.min(exp, 4)}">P${exp}</b></div>
      </div>
      <div class="nr-label">${label} · Win ≈ ${money(prizeFor(c, t, 1, ch.year))}</div>
      ${running ? `<button class="btn" type="button" disabled>Racing… tap the car to push!</button>`
        : S.race ? `<button class="btn" type="button" disabled>Already racing</button>`
        : `<button class="btn" type="button" data-act="race" data-arg="${c}">🏁 Start race</button>`}
      ${her('auto') ? `<div class="toggle"><span>🤖 Team Manager auto-race</span><button class="switch ${S.settings.autoRace ? 'on' : ''}" type="button" data-act="autorace" data-arg="0" aria-label="Toggle auto race"></button></div>` : ''}
    </div>`;
    if (exp > 3) html += `<p class="hint">💡 Upgrade parts or sign drivers in the Garage to raise your pace. Pace 30% above the field means a likely win.</p>`;

    html += `<div class="section-title">Championship standings</div>${standingsHTML(standings(c))}`;
    html += `<div class="section-title">Calendar · ${winsInClass(c)} ${CLASSES[c].name} wins all-time</div><div class="calendar">`;
    TRACKS.forEach((tk, i) => {
      const res = ch.res[i];
      const cur = i === ch.round;
      html += `<div class="cal${cur ? ' cur' : ''}"><span class="r">R${i + 1}</span><span class="n">${tk.name}</span><b class="${res ? 'pos-' + Math.min(res, 4) : ''}">${res ? 'P' + res : cur ? 'NEXT' : '—'}</b></div>`;
    });
    html += `</div>`;
    return html;
  }

  // --- Legacy ---
  function legacyHTML() {
    const gain = lpGain();
    let html = `<div class="card legacy-card">
      <div class="lp-row"><div><small>Legacy Points</small><div class="big-num">⭐ ${S.lp}</div></div>
      <div class="lp-side"><div>Unspent <b>${lpFree()}</b></div><div>Income <b>+${Math.round(S.lp * LP_BONUS * 100)}%</b></div></div></div>
      <p>Lifetime earnings and championship titles earn Legacy Points. Spending them on perks never lowers your income bonus.</p>
      <div class="kv"><span>New season would give</span><span>+${gain} ⭐</span></div>
      <div class="kv"><span>Next point at</span><span>${money(nextLpAt())} lifetime</span></div>
      <button class="btn" type="button" data-act="season" data-arg="0" ${gain > 0 ? '' : 'disabled'}>${gain > 0 ? `Start new season (+${gain} LP)` : 'Earn more to start a new season'}</button>
    </div>`;
    html += `<div class="section-title">Legacy perks</div>`;
    for (const h of HERITAGE) {
      const lvl = her(h.id);
      const max = lvl >= h.costs.length;
      const cost = h.costs[lvl];
      const can = !max && lpFree() >= cost;
      html += `<div class="row"><div class="ico">${h.icon}${lvl ? `<span class="count">${lvl}</span>` : ''}</div>
        <div class="info"><div class="name">${h.name}</div><div class="desc">${lvl ? h.desc(lvl) : ''}${!max ? `${lvl ? ' Next: ' : ''}${h.next(lvl)}.` : ''}</div></div>
        ${max ? lockedBtn('MAX', '') : `<button class="buy gold" type="button" data-act="her" data-arg="${h.id}" ${can ? '' : 'disabled'}><span>${lvl ? 'Upgrade' : 'Unlock'}</span><small>${cost} LP</small></button>`}</div>`;
    }
    html += `<div class="section-title">Achievements · ${S.ach.length}/${ACHIEVEMENTS.length} · +${Math.round(S.ach.length * ACH_BONUS * 100)}% income</div><div class="ach-grid">`;
    for (const a of ACHIEVEMENTS) {
      const got = S.ach.includes(a.id);
      html += `<div class="ach${got ? ' got' : ''}"><span>${got ? a.icon : '🔒'}</span><b>${a.name}</b><small>${a.desc}</small></div>`;
    }
    html += `</div>`;
    return html;
  }

  // --- More ---
  function moreHTML() {
    const st = S.stats;
    return `
      <div class="card"><h3>Team</h3>
        <div class="kv"><span>Team name</span><span>${esc(S.teamName)}</span></div>
        <button class="btn ghost" type="button" data-act="rename" data-arg="0">Rename team</button></div>
      <div class="card"><h3>Stats</h3>
        <div class="kv"><span>Taps</span><span>${fmt(st.taps)}</span></div>
        <div class="kv"><span>Races entered</span><span>${st.races}</span></div>
        <div class="kv"><span>Race wins</span><span>${st.wins}</span></div>
        <div class="kv"><span>Titles</span><span>${st.titles.reduce((a, b) => a + b, 0)}</span></div>
        <div class="kv"><span>Perfect pit stops</span><span>${st.perfectPits}</span></div>
        <div class="kv"><span>Sponsor bonuses caught</span><span>${st.bonuses}</span></div>
        <div class="kv"><span>Team members</span><span>${fmt(teamSize())}</span></div>
        <div class="kv"><span>Seasons</span><span>${S.seasons + 1}</span></div>
        <div class="kv"><span>This season earned</span><span>${money(S.seasonEarned)}</span></div>
        <div class="kv"><span>Time played</span><span>${fmtTime(st.playTime)}</span></div></div>
      <div class="card"><h3>Settings</h3>
        <div class="toggle"><span>Real car photos</span><button class="switch ${S.settings.photos ? 'on' : ''}" type="button" data-act="photos" data-arg="0" aria-label="Toggle car photos"></button></div>
        <div class="toggle"><span>Vibration</span><button class="switch ${S.settings.haptics ? 'on' : ''}" type="button" data-act="haptics" data-arg="0" aria-label="Toggle vibration"></button></div>
        <button class="btn ghost" type="button" data-act="export" data-arg="0">Copy save code</button>
        <button class="btn ghost" type="button" data-act="import" data-arg="0">Import save code</button>
        <button class="btn danger" type="button" data-act="reset" data-arg="0">Reset all progress</button></div>
      <div class="card"><h3>How to play</h3>
        <p>👆 <b>Tap the car</b> for prize money. 🔧 <b>Hire your team</b> for income every second. Every 25/50/100… of one kind doubles its output.</p>
        <p>🏎️ <b>Garage:</b> upgrade parts and sign drivers to raise your <b>pace</b>, then buy new cars. Each car has a perk and adds income.</p>
        <p>🏁 <b>Races:</b> pace decides where you finish. Nail the <b>pit stop</b> (tap in the green) to gain places. Win the championship for Legacy Points.</p>
        <p>🎫 <b>Move up:</b> win 3 races in a class to unlock the next license: GTD → GTD PRO → LMP2 → GTP.</p>
        <p>⭐ <b>Legacy:</b> start a new season to cash in lifetime earnings for permanent bonuses and perks.</p>
        <p>💤 Your team keeps earning while you're away.</p></div>
      ${photoCreditsHTML()}
      <p class="small-print">IMSA Clicker is an unofficial fan-made game. It is not affiliated with, endorsed by or sponsored by IMSA or any team, manufacturer, driver or circuit. Car and circuit names belong to their owners. Drivers and teams in the game are fictional.</p>`;
  }

  function photoCreditsHTML() {
    const used = CARS.filter(c => photoOf(c.id));
    if (!used.length) return '';
    return `<div class="card"><h3>Photo credits</h3><p class="muted">Car photos from Wikimedia Commons, used under their licenses.</p>
      ${used.map(c => { const p = photoOf(c.id); return `<div class="kv"><span>${esc(c.name)}</span><span><a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.artist || 'Author')}</a> · ${esc(p.license || 'see page')}</span></div>`; }).join('')}</div>`;
  }

  function renderPanel(name, force) {
    const p = panels[name];
    const key = p.key();
    if (force || key !== panelKeys[name]) {
      panelKeys[name] = key;
      p.el.innerHTML = p.html();
    } else {
      p.el.querySelectorAll('[data-cost]').forEach(b => { b.disabled = S.money < +b.dataset.cost; });
    }
  }

  function renderDots() {
    const upg = availableUpgrades().some(u => S.money >= u.cost);
    $('upgDot').classList.toggle('hidden', !upg);
    const garage = PARTS.some((_, i) => kindParts()[i] < PART_MAX && S.money >= partPrice(i))
      || CARS.some(c => !S.cars.includes(c.id) && KIND_CLASS[c.kind] <= S.license && S.money >= carPrice(c))
      || (S.license < 3 && winsInClass(S.license) >= CLASSES[S.license + 1].license.wins && S.money >= licensePrice(S.license + 1));
    $('garageDot').classList.toggle('hidden', !garage);
    $('raceDot').classList.toggle('hidden', !!S.race);
    $('legacyDot').classList.toggle('hidden', !(lpGain() > 0 || HERITAGE.some(h => her(h.id) < h.costs.length && lpFree() >= h.costs[her(h.id)])));
  }

  // Event delegation for all panel buttons
  document.getElementById('panels').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act, arg = b.dataset.arg;
    switch (a) {
      case 'gen': buyGen(+arg); break;
      case 'upg': buyUpgrade(arg); break;
      case 'part': buyPart(+arg); break;
      case 'drv': hireDriver(+arg); break;
      case 'car': buyCar(arg); break;
      case 'equip': equipCar(arg); break;
      case 'lic': buyLicense(+arg); break;
      case 'race': startRace(+arg); break;
      case 'rclass': S.raceClass = +arg; break;
      case 'autorace': S.settings.autoRace = !S.settings.autoRace; break;
      case 'her': buyHeritage(arg); break;
      case 'season': newSeason(); break;
      case 'haptics': S.settings.haptics = !S.settings.haptics; buzz(15); break;
      case 'photos': S.settings.photos = !S.settings.photos; renderCar(); break;
      case 'photo': nextPhoto(arg); break;
      case 'export': exportSave(); break;
      case 'import': importSave(); break;
      case 'rename': renameTeam(); break;
      case 'reset': confirmReset(); break;
    }
    renderHeader();
    renderPanel(activeTab, true);
    renderDots();
  });

  function renameTeam() {
    modal('Team name', `<input id="nameInput" class="text-input" maxlength="24" value="${esc(S.teamName)}" />`, [
      { label: 'Cancel', ghost: true },
      { label: 'Save', action: () => {
        const v = $('nameInput').value.trim().slice(0, 24);
        if (v) S.teamName = v;
        renderPanel(activeTab, true);
      } },
    ]);
    setTimeout(() => { const i = $('nameInput'); if (i) i.focus(); }, 50);
  }
  function confirmReset() {
    modal('Reset everything?', '<p>This wipes all progress, including Legacy Points and achievements. This cannot be undone.</p>', [
      { label: 'Cancel', ghost: true },
      { label: 'Reset', danger: true, action: () => {
        S = defaults(); owned = new Set(); save();
        applyClassTheme(); renderCar(); renderAll();
        tapHint.classList.remove('hidden');
        toast('Progress reset. Back to the garage!');
      } },
    ]);
  }
  function exportSave() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const done = () => toast('📋 Save code copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => showCode(code));
    else showCode(code);
  }
  function showCode(code) {
    modal('Your save code', `<textarea readonly class="text-input code">${code}</textarea>`, [{ label: 'Done' }]);
  }
  function importSave() {
    modal('Import save', `<textarea id="importArea" class="text-input code" placeholder="Paste save code"></textarea>`, [
      { label: 'Cancel', ghost: true },
      { label: 'Import', action: () => {
        try {
          const obj = JSON.parse(decodeURIComponent(escape(atob($('importArea').value.trim()))));
          S = obj.v === 2 ? sanitize(obj) : migrateV1(obj);
          owned = new Set(S.upgrades);
          save();
          applyClassTheme(); renderCar(); renderAll();
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
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
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
        if (b.action) b.action();
        modalQueue.shift();
        showModal();
        renderAll();
      });
      btns.appendChild(el);
    });
    modalEl.classList.remove('hidden');
  }

  // --- Tabs ---
  function switchTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    renderPanel(name, true);
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
    buyMode = b.dataset.buy;
    document.querySelectorAll('[data-buy]').forEach(x => x.classList.toggle('active', x === b));
    renderPanel('team', true);
  }));
  pushBtn.addEventListener('click', activatePush);

  function renderAll() {
    renderHeader();
    renderPanel(activeTab, true);
    renderDots();
  }

  // =====================================================================
  // Main loop
  // =====================================================================
  let lastTick = Date.now();
  let uiTimer = 0, slowTimer = 0, saveTimer = 0, autoTimer = 0;

  function checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!S.ach.includes(a.id) && a.ok()) {
        S.ach.push(a.id);
        toast(`${a.icon} Achievement: ${a.name} (+${pct(ACH_BONUS)} income)`);
      }
    }
  }

  function tick() {
    const now = Date.now();
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    if (dt < 0) dt = 0;
    if (dt > 60) grantOffline(dt);
    else {
      earn(totalIps(now) * dt);
      S.stats.playTime += dt;
    }

    const r = S.race;
    if (r) {
      const prog = 1 - (r.end - now) / r.dur;
      if (!r.pit && !pitOpenAt && prog >= 0.45) {
        if (document.hidden) r.pit = her('autoPit') ? 'good' : 'slow';
        else openPit();
      }
      if (pitOpenAt && performance.now() - pitOpenAt > 5000) resolvePit(her('autoPit') ? 'good' : 'slow');
      if (now >= r.end) finishRace();
    } else if (her('auto') && S.settings.autoRace && !modalQueue.length && canRaceClass(S.raceClass)) {
      autoTimer += dt;
      if (autoTimer >= 3) { autoTimer = 0; startRace(S.raceClass, true); }
    }
    if (!bonusEl && now >= nextBonusAt && !document.hidden) spawnBonus();

    uiTimer += dt; slowTimer += dt; saveTimer += dt;
    if (uiTimer >= 0.2) {
      uiTimer = 0;
      renderHeader();
      renderPanel(activeTab, false);
    }
    if (slowTimer >= 1) {
      slowTimer = 0;
      checkAchievements();
      renderDots();
    }
    if (saveTimer >= 5) { saveTimer = 0; save(); }
  }

  function grantOffline(seconds) {
    const n = her('night');
    const cap = [8, 12, 24][n] * 3600;
    const rate = Math.min(1, [0.5, 0.75, 1][n] + perk('offline'));
    const s = Math.min(seconds, cap);
    const gain = totalIps(Date.now(), false) * s * rate;
    if (gain <= 0) return;
    earn(gain);
    modal('Welcome back!', `<p>While you were away for ${fmtTime(seconds)}, your team earned</p><div class="big-num">${money(gain)}</div><p class="small-print">Offline earnings: ${Math.round(rate * 100)}% rate, up to ${cap / 3600} hours.</p>`, [{ label: 'Collect' }]);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else tick();
  });
  window.addEventListener('pagehide', save);

  // =====================================================================
  // Boot
  // =====================================================================
  applyClassTheme();
  renderCar();
  if (S.stats.taps > 15) tapHint.classList.add('hidden');
  const away = (Date.now() - (S.lastSave || Date.now())) / 1000;
  if (away > 60 && S.totalEarned > 0) grantOffline(away);
  else if (S.totalEarned === 0) {
    modal('🏁 IMSA Clicker', `<div class="modal-car">${carSVG(activeCar())}</div><p>You run a brand-new endurance team with one GT3 car and big dreams.</p>
      <p><b>Tap the car</b> for prize money, hire your crew, develop your car and win races to climb from <b>GTD</b> all the way to <b>GTP</b>.</p>`, [{ label: 'Green flag!' }]);
  }
  lastTick = Date.now();
  renderAll();
  setInterval(tick, 100);
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Debug hook for testing in the console.
  window.__imsa = { get state() { return S; }, fmt, totalIps, tapValue, pace, carSVG, CARS, trackReq, CLASSES };
})();
