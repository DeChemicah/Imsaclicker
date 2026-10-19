'use strict';

// Side-profile car artwork. Every car faces right, drawn in a 480x160 box with
// the ground at y=150. Silhouettes are point lists smoothed with Catmull-Rom
// splines; a third value of 1 marks a sharp corner.
window.CarArt = (() => {
  const GROUND = 150;
  const SILL = 138;
  let uid = 0;

  // ---------------------------------------------------------------- helpers
  function spline(pts, closed = false) {
    const P = pts.map(p => ({ x: p[0], y: p[1], c: !!p[2] }));
    const n = P.length;
    const at = (i) => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    let d = `M${P[0].x} ${P[0].y}`;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p1 = at(i), p2 = at(i + 1);
      const p0 = p1.c ? p1 : at(i - 1);
      const p3 = p2.c ? p2 : at(i + 2);
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y}`;
    }
    return closed ? d + ' Z' : d;
  }
  const poly = (pts, fill, extra = '') => `<path d="M${pts.map(p => p.join(' ')).join(' L')} Z" fill="${fill}" ${extra}/>`;
  const sm = (pts, fill, extra = '') => `<path d="${spline(pts, true)}" fill="${fill}" ${extra}/>`;

  // Bottom edge from the front of the car back to the rear, with wheel wells.
  function underside(rw, fw, r) {
    const cy = GROUND - r, R = r + 5;
    const hw = Math.sqrt(R * R - (SILL - cy) * (SILL - cy));
    return ` L${(fw + hw).toFixed(1)} ${SILL} A${R} ${R} 0 1 0 ${(fw - hw).toFixed(1)} ${SILL}` +
      ` L${(rw + hw).toFixed(1)} ${SILL} A${R} ${R} 0 1 0 ${(rw - hw).toFixed(1)} ${SILL} Z`;
  }

  function wheel(cx, r, o) {
    const cy = GROUND - r;
    const rim = o.rim || '#2c2f36', cal = o.caliper || '#d71920';
    const spokes = o.spokes || 10;
    let s = '';
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * r * 0.2, y1 = cy + Math.sin(a) * r * 0.2;
      const x2 = cx + Math.cos(a) * r * 0.64, y2 = cy + Math.sin(a) * r * 0.64;
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    return `<g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0c0c0e"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.93}" fill="none" stroke="#26272b" stroke-width="1.4"/>
      <text x="${cx}" y="${cy - r * 0.78}" font-size="${(r * 0.17).toFixed(1)}" font-family="Arial, sans-serif" font-weight="700" fill="#f2c230" text-anchor="middle" letter-spacing="1">MICHELIN</text>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="#111"/>
      <path d="M${cx - r * 0.45} ${cy - r * 0.38} A${r * 0.58} ${r * 0.58} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.55} L${cx + r * 0.15} ${cy - r * 0.38} A${r * 0.4} ${r * 0.4} 0 0 0 ${cx - r * 0.32} ${cy - r * 0.26} Z" fill="${cal}"/>
      <g class="wheel" data-cx="${cx}" data-cy="${cy}">
        <circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="none" stroke="${rim}" stroke-width="${r * 0.08}"/>
        <g stroke="${rim}" stroke-width="${(r * 0.09).toFixed(1)}" stroke-linecap="round">${s}</g>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="${rim}"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="${o.nut || '#d71920'}"/>
      </g>
    </g>`;
  }

  function numberBoard(x, y, num, cls, w = 34, h = 26) {
    return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="4" fill="#fff"/>
      <rect x="${x - w / 2}" y="${y + h / 2 - 5}" width="${w}" height="5" fill="${cls}"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="17" font-weight="900" font-style="italic" font-family="Arial Black, Arial, sans-serif" fill="#111">${num}</text></g>`;
  }

  function word(t, x, y, size, fill, o = {}) {
    const ls = o.ls != null ? o.ls : 1;
    const fam = o.font || 'Arial Black, Arial, Helvetica, sans-serif';
    const tf = o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : '';
    const stroke = o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 0.8}" paint-order="stroke"` : '';
    return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${o.weight || 900}" font-style="${o.italic === false ? 'normal' : 'italic'}" font-family="${fam}" fill="${fill}" letter-spacing="${ls}" text-anchor="${o.anchor || 'middle'}"${tf}${stroke}>${t}</text>`;
  }

  function decal(x, y, t, bg, fg, w) {
    const ww = w || t.length * 4.6 + 6;
    return `<rect x="${x - ww / 2}" y="${y - 5}" width="${ww}" height="10" rx="1.5" fill="${bg}"/>${word(t, x, y + 3.4, 7.5, fg, { ls: 0.4, italic: false })}`;
  }

  // ---------------------------------------------------------------- badges
  const BADGE = {
    bmw: (x, y, r = 7) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#111"/><circle cx="${x}" cy="${y}" r="${r * 0.68}" fill="#fff"/>
      <path d="M${x} ${y} L${x} ${y - r * 0.68} A${r * 0.68} ${r * 0.68} 0 0 1 ${x + r * 0.68} ${y} Z M${x} ${y} L${x} ${y + r * 0.68} A${r * 0.68} ${r * 0.68} 0 0 1 ${x - r * 0.68} ${y} Z" fill="#1c69d4"/>
      <circle cx="${x}" cy="${y}" r="${r * 0.68}" fill="none" stroke="#bbb" stroke-width=".6"/></g>`,
    merc: (x, y, r = 7) => {
      const pts = [0, 120, 240].map(a => { const t = (a - 90) * Math.PI / 180; return [x + Math.cos(t) * r * 0.85, y + Math.sin(t) * r * 0.85]; });
      return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#d9dde3" stroke-width="1.4"/>${pts.map(p => `<path d="M${x} ${y} L${p[0].toFixed(1)} ${p[1].toFixed(1)}" stroke="#d9dde3" stroke-width="1.8" stroke-linecap="round"/>`).join('')}</g>`;
    },
    porsche: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 -7 L6 -7 L6 1 Q6 6 0 8 Q-6 6 -6 1 Z" fill="#c9a227" stroke="#111" stroke-width=".7"/>
      <rect x="-5" y="-4" width="4.6" height="4" fill="#111"/><rect x=".4" y="0" width="4.6" height="4" fill="#111"/><rect x=".4" y="-4" width="4.6" height="4" fill="#c8102e"/><rect x="-5" y="0" width="4.6" height="4" fill="#c8102e"/>
      <rect x="-2.2" y="-3" width="4.4" height="5" rx="1" fill="#e5c158" stroke="#111" stroke-width=".4"/></g>`,
    ford: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="10" ry="5.2" fill="#0a2a6b" stroke="#cfd6e0" stroke-width="1"/>${word('Ford', 0, 2.6, 7, '#fff', { font: 'Georgia, serif', ls: 0, weight: 700 })}</g>`,
    chevy: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-9 -2 L-3 -2 L-2 -5 L2 -5 L3 -2 L9 -2 L8 2 L3 2 L2 5 L-2 5 L-3 2 L-9 2 Z" fill="#d9a400" stroke="#888" stroke-width=".6"/></g>`,
    vette: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 5 L5 -6 M7 5 L-5 -6" stroke="#ccc" stroke-width="1.4"/><rect x="2" y="-9" width="6" height="4" fill="#111"/><rect x="-8" y="-9" width="6" height="4" fill="#c8102e"/></g>`,
    lexus: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="8" ry="5.4" fill="none" stroke="#e1e4e8" stroke-width="1.1"/><path d="M-3 -4 L-5 3 L4 3" fill="none" stroke="#e1e4e8" stroke-width="1.3"/></g>`,
    acura: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 6 L-1.5 -6 L1.5 -6 L6 6 M-3 1 L3 1" fill="none" stroke="#d9dde3" stroke-width="1.8"/></g>`,
    cadillac: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 -7 L6 -7 L5 4 L0 8 L-5 4 Z" fill="#14213d" stroke="#d4af37" stroke-width="1"/><path d="M-5 -6 L0 -1 L5 -6 M-4 1 L4 1" stroke="#d4af37" stroke-width=".8" fill="none"/></g>`,
    lambo: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 -7 L6 -7 L6 0 Q6 6 0 8 Q-6 6 -6 0 Z" fill="#111" stroke="#c9a227" stroke-width="1"/><path d="M-3 2 Q0 -6 3 2" stroke="#c9a227" stroke-width="1.2" fill="none"/></g>`,
    ferrari: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 -8 L6 -8 L6 1 Q6 6 0 9 Q-6 6 -6 1 Z" fill="#ffd400"/><rect x="-6" y="-8" width="4" height="2" fill="#009246"/><rect x="-2" y="-8" width="4" height="2" fill="#fff"/><rect x="2" y="-8" width="4" height="2" fill="#ce2b37"/><path d="M-2 4 L-1 -3 L2 -4 L1 0 L3 4" stroke="#111" stroke-width="1.3" fill="none"/></g>`,
    aston: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12 -2 Q-6 -4 0 -1 Q6 -4 12 -2 L9 0 Q5 -1 0 2 Q-5 -1 -9 0 Z" fill="#d9dde3"/><rect x="-4" y="-3" width="8" height="3" fill="#0b4d33" stroke="#d9dde3" stroke-width=".5"/></g>`,
    mclaren: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 3 Q0 -7 9 -3 Q2 -4 -8 3 Z" fill="#ff8000"/></g>`,
  };

  // ---------------------------------------------------------------- liveries
  // Plaid pattern (Pfaff-style tartan)
  const plaid = (id) => `<pattern id="${id}pl" width="28" height="28" patternUnits="userSpaceOnUse">
      <rect width="28" height="28" fill="#c8102e"/><rect x="0" y="10" width="28" height="7" fill="#111" opacity=".75"/><rect x="10" y="0" width="7" height="28" fill="#111" opacity=".75"/>
      <rect x="0" y="22" width="28" height="1.5" fill="#f2c230" opacity=".7"/><rect x="22" y="0" width="1.5" height="28" fill="#f2c230" opacity=".7"/></pattern>`;
  const mStripes = (x, skew = 26) => [['#5bb4e5', 0], ['#2b2a6e', 9], ['#e22718', 18]]
    .map(([c, o]) => poly([[x + o + skew, 0], [x + o + skew + 8, 0], [x + o + 8, 160], [x + o, 160]], c)).join('');

  // ---------------------------------------------------------------- GT3 cars
  // GT swan-neck wing: plane from x1..x2 at height y, posts rising from the deck.
  function gtWing(w) {
    const { x1, x2, y, posts, deck } = w;
    return `<g fill="#17181b" stroke="none">
      ${posts.map(px => `<path d="M${px} ${deck} L${px + 3} ${deck} Q${px + 6} ${y + 10} ${px + 14} ${y + 5} L${px + 12} ${y + 2} Q${px + 2} ${y + 6} ${px} ${deck} Z"/>`).join('')}
      <path d="M${x1} ${y + 2} Q${(x1 + x2) / 2} ${y - 3} ${x2} ${y - 1} L${x2} ${y + 4} Q${(x1 + x2) / 2} ${y + 6} ${x1} ${y + 9} Z"/>
      <path d="M${x1 + 4} ${y - 1} L${x2 - 4} ${y - 5} L${x2 - 4} ${y - 3} L${x1 + 4} ${y + 1} Z" opacity=".9"/>
      <rect x="${x1 - 3}" y="${y - 10}" width="5" height="24" rx="1.5"/>
    </g>`;
  }

  const GT = {
    p911: {
      rw: 112, fw: 362, r: 34,
      top: [[12, 138, 1], [6, 118], [9, 96], [20, 80], [52, 70], [100, 56], [150, 38], [200, 26], [248, 22], [282, 28], [330, 66], [356, 72], [392, 74], [432, 80], [458, 92], [470, 110], [470, 130], [465, 138, 1]],
      glass: [[176, 42], [204, 31], [246, 27], [276, 32], [316, 66], [188, 66, 1]],
      pillar: 262, wing: { x1: 14, x2: 104, y: 22, posts: [50, 80], deck: 64 },
      lights: [[440, 82], [462, 90], [458, 100], [436, 92]], tail: [[8, 92], [22, 82], [24, 90], [10, 100]],
      vents: [[[380, 76], [420, 78], [418, 82], [382, 80]]], badge: ['porsche', 446, 108, 0.9], caliper: '#d71920',
      brand: ['PORSCHE', '#4b1f7a', null, '#c6f432'],
      liv: (id) => `<rect width="480" height="160" fill="#c6f432"/>
        ${poly([[0, 122], [480, 112], [480, 160], [0, 160]], '#4b1f7a')}
        ${poly([[0, 118], [480, 108], [480, 113], [0, 123]], '#ff7a00')}
        <path d="M420 112 L468 104 L470 124 L424 128 Z" fill="#111"/>
        <path d="M426 112 l6 6 l6 -7 l6 7 l6 -7 l6 7 l6 -8 L470 104 Z" fill="#fff"/>`,
      textNum: [212, 86], name: 'Porsche 911 GT3 R',
    },
    corvette: {
      rw: 110, fw: 382, r: 34,
      top: [[12, 138, 1], [8, 110], [10, 84, 1], [30, 74], [100, 68], [150, 60], [180, 42], [214, 30], [252, 30], [286, 40], [322, 70], [384, 78], [432, 86], [462, 96], [471, 112], [468, 138, 1]],
      glass: [[188, 46], [214, 35], [250, 35], [278, 43], [308, 70], [196, 70, 1]],
      pillar: 246, wing: { x1: 12, x2: 104, y: 34, posts: [44, 76], deck: 68 },
      lights: [[436, 88], [466, 98], [462, 104], [438, 96]], tail: [[9, 86], [24, 80], [24, 88], [9, 94]],
      vents: [[[140, 84], [176, 82], [174, 100], [150, 102]]], badge: ['vette', 446, 112, 0.9], caliper: '#f2c230',
      brand: ['CORVETTE', '#1b1b1d', null, '#f6c700'],
      liv: () => `<rect width="480" height="160" fill="#f6c700"/>
        ${poly([[0, 122], [200, 118], [300, 124], [480, 116], [480, 160], [0, 160]], '#1b1b1d')}
        ${poly([[200, 118], [300, 124], [300, 127], [200, 121]], '#8a8d93')}`,
      textNum: [252, 82],
    },
    ferrari: {
      rw: 112, fw: 378, r: 34,
      top: [[12, 138, 1], [7, 112], [13, 88], [38, 76], [108, 68], [158, 56], [194, 36], [234, 28], [270, 32], [302, 50], [332, 72], [386, 80], [436, 90], [464, 104], [470, 124], [466, 138, 1]],
      glass: [[198, 42], [232, 33], [264, 36], [290, 52], [314, 72], [204, 72, 1]],
      pillar: 250, wing: { x1: 12, x2: 100, y: 34, posts: [42, 74], deck: 70 },
      lights: [[432, 90], [462, 100], [460, 106], [434, 96]], tail: [[8, 92], [20, 84], [22, 94], [9, 100]],
      vents: [[[150, 80], [186, 78], [176, 98], [152, 100]]], badge: ['ferrari', 450, 112, 0.9], caliper: '#f2c230',
      brand: ['FERRARI', '#ffd400', null, '#8a0000'],
      liv: () => `<rect width="480" height="160" fill="#d40000"/>
        ${poly([[150, 0], [176, 0], [116, 160], [90, 160]], '#ffd400')}
        ${poly([[180, 0], [186, 0], [126, 160], [120, 160]], '#fff')}
        ${poly([[0, 120], [480, 116], [480, 160], [0, 160]], '#111')}`,
      textNum: [244, 86],
    },
    huracan: {
      rw: 110, fw: 372, r: 34,
      top: [[12, 138, 1], [10, 104, 1], [18, 82, 1], [110, 70], [168, 58], [204, 36, 1], [250, 29], [290, 40], [338, 74, 1], [382, 80], [440, 92], [471, 108, 1], [468, 138, 1]],
      glass: [[212, 40, 1], [250, 33], [284, 44], [318, 73, 1], [216, 73, 1]],
      pillar: 262, wing: { x1: 12, x2: 100, y: 36, posts: [42, 72], deck: 74 },
      lights: [[436, 92, 1], [468, 104, 1], [462, 108, 1], [440, 100, 1]], tail: [[12, 86], [26, 80], [26, 86], [12, 92]],
      vents: [[[150, 84], [196, 80], [190, 104], [158, 106]], [[400, 86], [426, 90], [424, 94], [402, 90]]], badge: ['lambo', 448, 114, 0.9], caliper: '#c9a227',
      brand: ['LAMBORGHINI', '#fff', null, '#111'],
      liv: (id) => `<rect width="480" height="160" fill="url(#${id}pl)"/>
        ${poly([[0, 118], [480, 112], [480, 160], [0, 160]], '#111')}`,
      defs: (id) => plaid(id), textNum: [246, 86],
    },
    mclaren: {
      rw: 110, fw: 372, r: 34,
      top: [[12, 138, 1], [7, 108], [15, 84], [60, 74], [128, 66], [174, 50], [210, 32], [250, 26], [286, 34], [316, 56], [340, 74], [390, 82], [440, 92], [467, 106], [470, 126], [466, 138, 1]],
      glass: [[206, 40], [246, 30], [280, 37], [306, 58], [312, 72], [222, 72], [200, 58]],
      pillar: 0, wing: { x1: 12, x2: 100, y: 34, posts: [42, 74], deck: 72 },
      lights: [[436, 94], [464, 102], [452, 106], [434, 98]], tail: [[8, 90], [22, 84], [24, 92], [10, 98]],
      vents: [[[156, 82], [196, 80], [186, 102], [162, 104]]], badge: ['mclaren', 450, 112, 1], caliper: '#d71920',
      brand: ['McLAREN', '#1d1d1f'],
      liv: () => `<rect width="480" height="160" fill="#ff8000"/>
        ${poly([[0, 0], [130, 0], [190, 160], [0, 160]], '#1d1d1f')}
        ${poly([[130, 0], [138, 0], [198, 160], [190, 160]], '#47c7fc')}`,
      textNum: [248, 86],
    },
    nsx: {
      rw: 110, fw: 376, r: 34,
      top: [[12, 138, 1], [9, 110], [14, 84], [40, 74], [120, 66], [174, 52], [204, 34], [244, 28], [280, 34], [310, 56], [338, 74], [390, 82], [440, 90], [467, 104], [470, 122], [466, 138, 1]],
      glass: [[206, 40], [244, 32], [276, 37], [302, 58], [322, 73], [212, 73, 1]],
      pillar: 256, wing: { x1: 12, x2: 100, y: 34, posts: [42, 74], deck: 72 },
      lights: [[432, 92, 1], [466, 102, 1], [462, 106, 1], [436, 98, 1]], tail: [[9, 90], [22, 84], [24, 92], [10, 98]],
      vents: [[[148, 82], [192, 80], [184, 100], [154, 102]]], badge: ['acura', 448, 114, 1], caliper: '#d71920',
      brand: ['ACURA', '#fff', null, '#111'],
      liv: () => `<rect width="480" height="160" fill="#f2f3f5"/>
        ${poly([[300, 0], [480, 0], [480, 160], [250, 160]], '#d0103a')}
        ${poly([[288, 0], [296, 0], [246, 160], [238, 160]], '#111')}
        ${poly([[0, 120], [480, 116], [480, 160], [0, 160]], '#111')}`,
      textNum: [244, 86],
    },
    bmwm4: {
      rw: 96, fw: 388, r: 34,
      top: [[12, 138, 1], [7, 104], [12, 80, 1], [60, 72], [108, 66], [140, 52], [170, 32], [205, 24], [255, 24], [290, 32], [330, 62], [352, 70], [420, 75], [455, 81], [471, 96, 1], [471, 128], [465, 138, 1]],
      glass: [[152, 52], [178, 34], [206, 28], [254, 28], [282, 35], [318, 64], [152, 66, 1]],
      pillar: 236, wing: { x1: 10, x2: 94, y: 32, posts: [36, 66], deck: 70 },
      lights: [[438, 84, 1], [466, 92, 1], [462, 98, 1], [440, 92, 1]], tail: [[9, 84], [26, 78], [26, 86], [9, 92]],
      vents: [[[400, 86], [428, 88], [426, 92], [402, 90]]], badge: ['bmw', 452, 104, 6], caliper: '#1c69d4',
      kidney: [[456, 100, 1], [471, 102, 1], [471, 124, 1], [458, 122, 1]],
      brand: ['BMW M', '#111', null, '#fff'],
      liv: () => `<rect width="480" height="160" fill="#f5f5f5"/>${mStripes(270)}
        ${poly([[0, 118], [480, 114], [480, 160], [0, 160]], '#111')}`,
      textNum: [212, 84],
    },
    amg: {
      rw: 100, fw: 376, r: 34,
      top: [[12, 138, 1], [7, 106], [13, 84], [40, 76], [80, 70], [130, 58], [170, 40], [205, 28], [240, 26], [268, 34], [300, 62], [330, 72], [400, 76], [446, 84], [468, 98], [470, 126], [466, 138, 1]],
      glass: [[140, 58], [172, 42], [206, 32], [240, 30], [264, 37], [292, 63], [148, 66, 1]],
      pillar: 226, wing: { x1: 10, x2: 94, y: 34, posts: [36, 66], deck: 72 },
      lights: [[432, 86], [464, 94], [460, 100], [436, 94]], tail: [[9, 90], [24, 82], [26, 88], [10, 96]],
      vents: [[[392, 84], [424, 86], [422, 90], [394, 88]], [[392, 92], [420, 94], [418, 97], [394, 96]]], badge: ['merc', 452, 106, 6.5], caliper: '#d71920',
      brand: ['AMG', '#18191c', null, '#c3c8cf'],
      liv: () => `<rect width="480" height="160" fill="#c3c8cf"/>
        ${poly([[0, 0], [110, 0], [180, 160], [0, 160]], '#18191c')}
        <path d="M0 116 Q240 98 480 104 L480 108 Q240 102 0 120 Z" fill="#00a19b"/>
        ${poly([[0, 124], [480, 116], [480, 160], [0, 160]], '#18191c')}`,
      textNum: [206, 84],
    },
    aston: {
      rw: 100, fw: 370, r: 34,
      top: [[12, 138, 1], [7, 108], [11, 86], [34, 76], [90, 70], [134, 56], [170, 36], [205, 28], [240, 28], [270, 36], [305, 64], [335, 72], [400, 76], [448, 86], [468, 100], [470, 124], [466, 138, 1]],
      glass: [[146, 58], [174, 40], [206, 33], [238, 33], [264, 40], [296, 64], [152, 66, 1]],
      pillar: 228, wing: { x1: 10, x2: 94, y: 34, posts: [36, 66], deck: 72 },
      lights: [[430, 88], [462, 96], [458, 102], [432, 96]], tail: [[9, 90], [26, 82], [26, 88], [10, 96]],
      vents: [[[150, 88], [170, 86], [168, 100], [152, 102]]], badge: ['aston', 444, 108, 0.9], caliper: '#c6f432',
      brand: ['ASTON MARTIN', '#c6f432', null, '#00563b'],
      liv: () => `<rect width="480" height="160" fill="#00563b"/>
        ${poly([[0, 124], [480, 116], [480, 160], [0, 160]], '#c6f432')}
        ${poly([[0, 116], [480, 106], [480, 110], [0, 120]], '#fff')}
        <path d="M300 50 q10 -6 20 0 q-10 14 -20 0 Z" fill="#c8102e"/>`,
      textNum: [214, 84],
    },
    mustang: {
      rw: 96, fw: 372, r: 34,
      top: [[12, 138, 1], [7, 100, 1], [13, 80, 1], [50, 74], [110, 68], [150, 50], [185, 30], [230, 26], [262, 30], [300, 60], [330, 68, 1], [420, 72], [455, 78], [471, 92, 1], [471, 126], [464, 138, 1]],
      glass: [[158, 50], [188, 34], [230, 30], [258, 34], [292, 62], [162, 66, 1]],
      pillar: 0, wing: { x1: 10, x2: 94, y: 30, posts: [36, 66], deck: 72 },
      lights: [[436, 80, 1], [468, 86, 1], [466, 92, 1], [440, 88, 1]], tail: [[8, 82], [14, 82], [14, 96], [8, 96]],
      vents: [[[396, 76], [420, 76], [416, 80], [400, 80]], [[150, 90], [168, 90], [166, 104], [152, 104]]], badge: ['ford', 448, 104, 0.9], caliper: '#1c69d4',
      brand: ['MUSTANG', '#fff'],
      liv: () => `<rect width="480" height="160" fill="#0b2a63"/>
        ${poly([[0, 82], [480, 76], [480, 80], [0, 86]], '#fff')}${poly([[0, 89], [480, 83], [480, 87], [0, 93]], '#fff')}
        ${poly([[0, 120], [480, 114], [480, 160], [0, 160]], '#111')}`,
      textNum: [220, 98],
    },
    lexus: {
      rw: 96, fw: 372, r: 34,
      top: [[12, 138, 1], [7, 104], [11, 82], [40, 74], [100, 68], [140, 54], [172, 34], [210, 26], [250, 27], [280, 36], [312, 64], [340, 72], [410, 76], [450, 84], [469, 98], [470, 126], [464, 138, 1]],
      glass: [[150, 54], [176, 38], [210, 31], [248, 32], [274, 40], [302, 64], [154, 66, 1]],
      pillar: 232, wing: { x1: 10, x2: 94, y: 32, posts: [36, 66], deck: 72 },
      lights: [[434, 86, 1], [466, 94, 1], [458, 100, 1], [450, 96, 1], [436, 94, 1]], tail: [[9, 86], [26, 80], [26, 86], [9, 92]],
      vents: [[[392, 82], [424, 84], [422, 88], [394, 86]]], badge: ['lexus', 452, 108, 0.8], caliper: '#d71920',
      brand: ['LEXUS', '#111', null, '#fff'],
      liv: () => `<rect width="480" height="160" fill="#f3f3f3"/>
        <path d="M0 160 L0 96 Q140 88 230 118 Q320 150 480 96 L480 160 Z" fill="#e2231a"/>
        <path d="M0 92 Q140 84 230 114 Q320 146 480 92 L480 96 Q320 150 230 118 Q140 88 0 96 Z" fill="#111"/>`,
      textNum: [216, 84],
    },
  };

  // ---------------------------------------------------------------- prototypes
  // Shared rear section: engine cover, fin and wing
  const PROTO_REAR = [[10, 138, 1], [7, 112], [9, 88, 1], [30, 82], [70, 78], [100, 76], [130, 80], [160, 90], [200, 96]];
  function protoWing(w) {
    const { x1, x2, y, ep } = w;
    return `<g fill="#17181b">
      <path d="M${x1} ${y + 2} Q${(x1 + x2) / 2} ${y - 3} ${x2} ${y} L${x2} ${y + 6} Q${(x1 + x2) / 2} ${y + 4} ${x1} ${y + 9} Z"/>
      <path d="M${x1 + 2} ${y - 6} L${x2 - 2} ${y - 8} L${x2 - 2} ${y - 5} L${x1 + 2} ${y - 3} Z"/>
      ${ep ? `<path d="M${x1 - 2} ${y - 12} L${x1 + 14} ${y - 12} L${x1 + 16} ${y + 10} L${x1 + 8} ${ep} L${x1 + 1} ${ep} L${x1 - 2} ${y + 12} Z" opacity=".95"/>` : `<rect x="${x1 - 3}" y="${y - 10}" width="6" height="22" rx="2"/>`}
      ${ep ? '' : `<path d="M${(x1 + x2) / 2 - 4} ${y + 6} L${(x1 + x2) / 2 + 4} ${y + 6} L${(x1 + x2) / 2 + 10} ${y + 40} L${(x1 + x2) / 2 + 2} ${y + 40} Z"/>`}
    </g>`;
  }

  const PROTO = {
    p963: {
      top: [...PROTO_REAR, [350, 96], [366, 88], [384, 78], [410, 77], [436, 84], [458, 98], [470, 114], [471, 130], [466, 138, 1]],
      canopy: [[212, 97], [224, 76], [248, 62], [296, 58], [322, 62], [340, 76], [354, 97]],
      glass: [[252, 66], [296, 62], [318, 66], [334, 80], [258, 80, 1]],
      fin: [[242, 64, 1], [44, 50, 1], [44, 80, 1], [120, 80, 1], [220, 90, 1]],
      wing: { x1: 6, x2: 90, y: 44, ep: 84 },
      lights: `<rect x="430" y="92" width="34" height="3" rx="1.5" fill="#fff4c8"/><circle cx="452" cy="100" r="2.2" fill="#fff4c8"/><circle cx="460" cy="102" r="2.2" fill="#fff4c8"/>`,
      badge: ['porsche', 410, 98, 0.9], caliper: '#d71920',
      brand: ['PORSCHE', '#fff', null, '#111'],
      sub: ['Penske', '#111', 'Georgia, serif', '#fff'],
      liv: () => `<rect width="480" height="160" fill="#f7f7f7"/>
        ${poly([[0, 0], [190, 0], [130, 160], [0, 160]], '#d5001c')}
        ${poly([[190, 0], [214, 0], [154, 160], [130, 160]], '#111')}
        ${poly([[0, 124], [480, 120], [480, 160], [0, 160]], '#111')}`,
      num: [370, 108],
    },
    vseries: {
      top: [...PROTO_REAR.slice(0, 5), [100, 72], [130, 78], [160, 90], [200, 96], [348, 96], [362, 86], [378, 72], [408, 69], [436, 76], [460, 92], [471, 112], [471, 130], [466, 138, 1]],
      canopy: [[214, 97], [224, 74], [246, 61], [294, 57], [320, 61], [338, 76], [352, 97]],
      glass: [[252, 65], [294, 61], [316, 65], [332, 79], [258, 79, 1]],
      fin: [[240, 63, 1], [44, 48, 1], [44, 78, 1], [120, 78, 1], [220, 90, 1]],
      wing: { x1: 6, x2: 90, y: 42, ep: 84 },
      lights: `<rect x="450" y="82" width="3.5" height="22" rx="1.5" fill="#fff4c8"/><rect x="459" y="90" width="3.5" height="22" rx="1.5" fill="#fff4c8"/>`,
      badge: ['cadillac', 412, 92, 0.9], caliper: '#d71920',
      brand: ['CADILLAC', '#fff', null, '#111'],
      sub: ['Whelen', '#fff', null, '#c8102e'],
      liv: () => `<rect width="480" height="160" fill="#f7f7f7"/>
        ${poly([[0, 0], [150, 0], [230, 160], [0, 160]], '#c8102e')}
        ${poly([[150, 0], [160, 0], [240, 160], [230, 160]], '#111')}
        ${poly([[300, 160], [480, 60], [480, 160]], '#111')}`,
      num: [380, 108],
    },
    bmwgtp: {
      top: [...PROTO_REAR, [350, 96], [364, 84], [382, 72], [412, 71], [440, 80], [462, 96], [471, 116], [471, 130], [466, 138, 1]],
      canopy: [[214, 97], [226, 74], [248, 61], [296, 58], [322, 62], [340, 76], [354, 97]],
      glass: [[252, 65], [296, 62], [318, 66], [334, 80], [258, 80, 1]],
      fin: [[242, 64, 1], [44, 50, 1], [44, 80, 1], [120, 80, 1], [220, 90, 1]],
      wing: { x1: 6, x2: 90, y: 44, ep: 84 },
      lights: `<path d="M430 86 L462 94 L460 97 L430 90 Z" fill="#fff4c8"/>`,
      kidney: [[454, 102, 1], [470, 106, 1], [470, 130, 1], [456, 126, 1]],
      badge: ['bmw', 418, 88, 6], caliper: '#1c69d4',
      brand: ['BMW M', '#fff', null, '#111'],
      liv: () => `<rect width="480" height="160" fill="#f5f5f5"/>${mStripes(150, 40)}
        ${poly([[0, 0], [120, 0], [70, 160], [0, 160]], '#111')}
        ${poly([[0, 124], [480, 120], [480, 160], [0, 160]], '#111')}`,
      num: [374, 106],
    },
    arx06: {
      top: [...PROTO_REAR, [350, 96], [368, 86], [386, 76], [414, 76], [444, 86], [466, 104], [472, 120], [470, 132], [466, 138, 1]],
      canopy: [[216, 97], [228, 74], [250, 61], [296, 58], [322, 62], [340, 76], [354, 97]],
      glass: [[254, 65], [296, 62], [318, 66], [334, 80], [260, 80, 1]],
      fin: [[244, 64, 1], [44, 50, 1], [44, 80, 1], [120, 80, 1], [220, 90, 1]],
      wing: { x1: 6, x2: 90, y: 44, ep: 84 },
      lights: `<path d="M428 92 L466 104 L440 100 Z" fill="#fff4c8"/>`,
      badge: ['acura', 420, 96, 1], caliper: '#d71920',
      brand: ['ACURA', '#fff', null, '#0a3a8c'],
      sub: ['KONICA MINOLTA', '#0a3a8c', null, '#fff'],
      liv: () => `<rect width="480" height="160" fill="#0a3a8c"/>
        <path d="M0 160 L0 100 Q200 80 300 120 Q380 150 480 100 L480 160 Z" fill="#fff"/>
        <path d="M0 96 Q200 76 300 116 Q380 146 480 96 L480 100 Q380 150 300 120 Q200 80 0 100 Z" fill="#00a3e0"/>`,
      num: [376, 108],
    },
    sc63: {
      top: [[10, 138, 1], [8, 108, 1], [12, 84, 1], [100, 74, 1], [150, 84], [200, 96, 1], [352, 96, 1], [376, 74, 1], [414, 72, 1], [470, 108, 1], [471, 132], [466, 138, 1]],
      canopy: [[214, 97, 1], [230, 72, 1], [252, 60], [296, 58], [324, 64, 1], [352, 97, 1]],
      glass: [[256, 64, 1], [296, 62], [320, 67, 1], [336, 82, 1], [262, 82, 1]],
      fin: [[244, 64, 1], [44, 50, 1], [44, 80, 1], [120, 80, 1], [220, 90, 1]],
      wing: { x1: 6, x2: 90, y: 44, ep: 84 },
      lights: `<path d="M432 88 L448 96 L466 90 M448 96 L452 106" stroke="#fff4c8" stroke-width="3" fill="none"/>`,
      badge: ['lambo', 414, 92, 0.9], caliper: '#c9a227',
      brand: ['LAMBORGHINI', '#8ed100', null, '#111'],
      liv: () => `<rect width="480" height="160" fill="#202326"/>
        ${poly([[0, 108], [480, 92], [480, 98], [0, 114]], '#8ed100')}
        ${poly([[260, 0], [300, 0], [250, 160], [210, 160]], '#3fa535')}`,
      num: [380, 106],
    },
    valkyrie: {
      top: [[10, 138, 1], [7, 110], [10, 86], [40, 80], [100, 74], [150, 82], [190, 94], [350, 96], [366, 84], [386, 70], [414, 68], [442, 76], [462, 92], [471, 112], [470, 132], [466, 138, 1]],
      canopy: [[204, 97], [220, 72], [250, 55], [296, 51], [328, 57], [346, 76], [358, 97]],
      glass: [[248, 60], [296, 55], [324, 61], [340, 80], [250, 80, 1]],
      fin: [[236, 60, 1], [44, 50, 1], [44, 80, 1], [120, 80, 1], [214, 90, 1]],
      wing: { x1: 6, x2: 90, y: 44, ep: 84 },
      lights: `<circle cx="448" cy="90" r="3" fill="#fff4c8"/><circle cx="456" cy="94" r="2.4" fill="#fff4c8"/><circle cx="440" cy="87" r="2.4" fill="#fff4c8"/>`,
      badge: ['aston', 412, 90, 0.9], caliper: '#c6f432',
      brand: ['ASTON MARTIN', '#c6f432', null, '#00402c'],
      sub: ['HEART OF RACING', '#fff', null, '#00402c'],
      liv: () => `<rect width="480" height="160" fill="#00563b"/>
        ${poly([[0, 116], [480, 104], [480, 110], [0, 122]], '#c6f432')}
        ${poly([[0, 126], [480, 116], [480, 160], [0, 160]], '#0c0d0e')}`,
      num: [380, 106],
    },
    // ---- LMP2
    oreca: {
      top: [[10, 138, 1], [8, 112], [10, 84, 1], [28, 78], [100, 72], [132, 76], [170, 90], [205, 96], [345, 96], [362, 86], [382, 76], [410, 76], [440, 84], [462, 98], [471, 114], [470, 132], [466, 138, 1]],
      canopy: [[216, 97], [228, 74], [250, 62], [292, 58], [318, 62], [336, 76], [350, 97]],
      glass: [[254, 66], [292, 62], [314, 66], [330, 80], [260, 80, 1]],
      fin: [[244, 64, 1], [40, 42, 1], [40, 78, 1], [120, 76, 1], [222, 90, 1]],
      wing: { x1: 6, x2: 84, y: 36, ep: 0 },
      lights: `<path d="M432 88 L462 98 L458 101 L432 93 Z" fill="#fff4c8"/>`,
      badge: null, caliper: '#d71920',
      brand: ['ORECA', '#fff', null, '#0057b8'],
      liv: () => `<rect width="480" height="160" fill="#0057b8"/>
        ${poly([[160, 0], [210, 0], [160, 160], [110, 160]], '#fff')}${poly([[214, 0], [222, 0], [172, 160], [164, 160]], '#e4002b')}
        ${poly([[0, 124], [480, 120], [480, 160], [0, 160]], '#111')}`,
      num: [380, 108],
    },
    ligier: {
      top: [[10, 138, 1], [8, 112], [10, 86, 1], [28, 80], [100, 74], [130, 78], [168, 90], [205, 96], [345, 96], [360, 84], [380, 72], [408, 71], [438, 80], [462, 96], [471, 114], [470, 132], [466, 138, 1]],
      canopy: [[214, 97], [224, 76], [244, 62], [288, 57], [316, 61], [336, 76], [350, 97]],
      glass: [[250, 66], [288, 61], [312, 65], [330, 80], [256, 80, 1]],
      fin: [[240, 64, 1], [40, 44, 1], [40, 80, 1], [120, 78, 1], [220, 90, 1]],
      wing: { x1: 6, x2: 84, y: 38, ep: 0 },
      lights: `<path d="M436 86 L462 96 L460 100 L436 91 Z" fill="#fff4c8"/>`,
      badge: null, caliper: '#d71920',
      brand: ['LIGIER', '#ff6a13', null, '#141414'],
      liv: () => `<rect width="480" height="160" fill="#ff6a13"/>
        ${poly([[300, 0], [480, 0], [480, 160], [260, 160]], '#141414')}
        ${poly([[0, 124], [480, 120], [480, 160], [0, 160]], '#141414')}`,
      num: [382, 108],
    },
    dallara: {
      top: [[10, 138, 1], [8, 112], [10, 86, 1], [30, 80], [100, 74], [134, 80], [170, 92], [205, 96], [344, 96], [362, 88], [384, 78], [412, 78], [440, 86], [462, 100], [471, 116], [470, 132], [466, 138, 1]],
      canopy: [[218, 97], [230, 76], [252, 63], [294, 59], [320, 63], [338, 77], [350, 97]],
      glass: [[256, 67], [294, 63], [316, 67], [332, 81], [262, 81, 1]],
      fin: [[246, 65, 1], [40, 44, 1], [40, 80, 1], [120, 78, 1], [222, 90, 1]],
      wing: { x1: 6, x2: 84, y: 38, ep: 0 },
      lights: `<path d="M434 90 L462 100 L458 103 L434 95 Z" fill="#fff4c8"/>`,
      badge: null, caliper: '#d71920',
      brand: ['DALLARA', '#1d1d1d', null, '#ffd100'],
      liv: () => `<rect width="480" height="160" fill="#ffd100"/>
        ${poly([[0, 112], [480, 104], [480, 160], [0, 160]], '#1d1d1d')}
        ${poly([[0, 108], [480, 100], [480, 104], [0, 112]], '#e4002b')}`,
      num: [380, 112],
    },
    riley: {
      top: [[10, 138, 1], [8, 110], [10, 84, 1], [30, 78], [100, 72], [136, 78], [172, 90], [205, 94], [342, 94], [358, 84], [378, 74], [406, 74], [436, 82], [460, 96], [471, 112], [470, 132], [466, 138, 1]],
      canopy: [[218, 95], [230, 74], [252, 62], [292, 58], [316, 62], [334, 76], [346, 95]],
      glass: [[256, 66], [292, 62], [312, 66], [328, 79], [262, 79, 1]],
      fin: [[246, 64, 1], [40, 44, 1], [40, 78, 1], [120, 76, 1], [222, 88, 1]],
      wing: { x1: 6, x2: 84, y: 38, ep: 0 },
      lights: `<path d="M432 86 L460 96 L456 99 L432 91 Z" fill="#fff4c8"/>`,
      badge: null, caliper: '#d71920',
      brand: ['RILEY', '#f0c419', null, '#2d1145'],
      liv: () => `<rect width="480" height="160" fill="#5b2c83"/>
        ${poly([[200, 0], [260, 0], [200, 160], [140, 160]], '#f0c419')}${poly([[264, 0], [270, 0], [210, 160], [204, 160]], '#fff')}
        ${poly([[0, 124], [480, 120], [480, 160], [0, 160]], '#111')}`,
      num: [378, 106],
    },
  };

  // ---------------------------------------------------------------- render
  function svg(id, o) {
    const u = 'k' + (++uid);
    const cls = o.cls || '#1fa84f';
    const num = o.num || '';
    const g = GT[id];
    if (g) return renderGT(g, u, cls, num);
    const p = PROTO[id];
    if (p) return renderProto(p, u, cls, num);
    return '';
  }

  const shade = (u) => `<linearGradient id="${u}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
    <linearGradient id="${u}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b6b80"/><stop offset=".5" stop-color="#1a2230"/><stop offset="1" stop-color="#0d1118"/></linearGradient>`;

  // Brand wordmark squeezed to fit the space between the wheels.
  function brandText(b, x, y, size, maxW) {
    if (!b) return '';
    const [t, fill, font, stroke] = b;
    const est = t.length * size * 0.78;
    const fit = est > maxW ? ` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"` : '';
    const fam = font || 'Arial Black, Arial, Helvetica, sans-serif';
    return `<text x="${x}" y="${y}" font-size="${size}" font-weight="900" font-style="italic" font-family="${fam}" fill="${fill}" letter-spacing="1" text-anchor="middle"${fit}${stroke ? ` stroke="${stroke}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"` : ''}>${t}</text>`;
  }

  function renderGT(g, u, cls, num) {
    const { rw, fw, r } = g;
    const body = spline(g.top) + underside(rw, fw, r);
    const glass = spline(g.glass, true);
    const arch = (x) => `<path d="M${x - r - 9} ${SILL} A${r + 9} ${r + 9} 0 0 1 ${x + r + 9} ${SILL}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`;
    const mid = (rw + fw) / 2;
    const door = (fw - r) - (rw + r) - 24;
    const front = g.glass.reduce((m, q) => (q[0] > m[0] ? q : m), g.glass[0]);
    const gTop = Math.min(...g.glass.map(q => q[1]));
    return `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>${shade(u)}<clipPath id="${u}c"><path d="${body}"/></clipPath><clipPath id="${u}g"><path d="${glass}"/></clipPath>${g.defs ? g.defs(u) : ''}</defs>
      <ellipse cx="240" cy="${GROUND + 2}" rx="226" ry="6" fill="#000" opacity=".45"/>
      ${gtWing(g.wing)}
      <path d="${body}" fill="#888"/>
      <g clip-path="url(#${u}c)">${g.liv(u)}
        <rect x="0" y="${SILL - 9}" width="480" height="12" fill="#121214"/>
        <path d="M${fw + r + 10} ${SILL - 6} L476 ${SILL - 8} L476 ${SILL + 2} L${fw + r + 10} ${SILL + 2} Z" fill="#121214"/>
        <rect width="480" height="160" fill="url(#${u}sh)"/></g>
      ${arch(rw)}${arch(fw)}
      <path d="${glass}" fill="url(#${u}gl)"/>
      <g clip-path="url(#${u}g)">
        ${g.pillar ? `<path d="M${g.pillar} ${gTop - 4} L${g.pillar + 7} 80" stroke="#151517" stroke-width="6"/>` : ''}
        <path d="M${g.glass[0][0] + 10} ${gTop + 22} L${g.glass[2][0] + 10} ${gTop - 2}" stroke="rgba(255,255,255,.22)" stroke-width="7"/>
        <rect x="0" y="${gTop - 2}" width="480" height="7" fill="#0b0b0d" opacity=".85"/>
      </g>
      ${word('IMSA', (g.glass[1][0] + g.glass[3][0]) / 2, gTop + 3.8, 5, '#fff', { ls: 0.6, italic: false })}
      <g clip-path="url(#${u}c)">
        ${g.vents.map(v => poly(v, '#0f0f11', 'opacity=".85"')).join('')}
        ${g.kidney ? sm(g.kidney, '#0b0b0c', 'stroke="#9aa0a8" stroke-width="1.4"') : ''}
        ${sm(g.lights, '#fff6d0', 'stroke="#222" stroke-width=".8"')}
        ${poly(g.tail, '#ff2a2a')}
      </g>
      <path d="M${front[0] - 8} ${front[1] - 2} l4 -8 l14 -2 l0 7 Z" fill="#151517"/>
      <path d="M${mid - 46} 76 L${mid - 46} 128" stroke="rgba(0,0,0,.22)" stroke-width="1"/>
      <path d="M${mid + 52} 76 L${mid + 48} 128" stroke="rgba(0,0,0,.22)" stroke-width="1"/>
      ${numberBoard(mid + 4, 87, num, cls)}
      ${brandText(g.brand, mid, 118, 15, door)}
      ${decal(rw + r + 24, 125, 'IMSA', '#111', '#fff')}
      ${decal(fw - r - 32, 125, 'MICHELIN', '#fff', '#27509b')}
      ${g.badge ? BADGE[g.badge[0]](g.badge[1], g.badge[2], g.badge[3]) : ''}
      ${wheel(rw, r, { caliper: g.caliper })}${wheel(fw, r, { caliper: g.caliper })}
    </svg>`;
  }

  function renderProto(p, u, cls, num) {
    const rw = 95, fw = 382, r = 32;
    const body = spline(p.top) + underside(rw, fw, r);
    const canopy = spline(p.canopy, true);
    // Fin top runs level with the cockpit roof back to the wing.
    const cTop = Math.min(...p.canopy.map(q => q[1]));
    const finPts = p.fin.map((q, i) => (i === 1 ? [q[0], cTop + 4, 1] : q));
    const fin = spline(finPts, true);
    const wingSpec = Object.assign({}, p.wing, { y: cTop - 2 });
    const glass = spline(p.glass, true);
    const gTop = Math.min(...p.glass.map(q => q[1]));
    const finEdge = `M${finPts[0][0]} ${finPts[0][1]} L${finPts[1][0]} ${finPts[1][1]}`;
    return `<svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>${shade(u)}<clipPath id="${u}c"><path d="${body}"/><path d="${canopy}"/><path d="${fin}"/></clipPath></defs>
      <ellipse cx="240" cy="${GROUND + 2}" rx="228" ry="6" fill="#000" opacity=".45"/>
      ${protoWing(wingSpec)}
      <path d="${body}" fill="#888"/><path d="${canopy}" fill="#888"/><path d="${fin}" fill="#888"/>
      <g clip-path="url(#${u}c)">${p.liv(u)}
        <rect x="0" y="${SILL - 8}" width="480" height="12" fill="#121214"/>
        <rect width="480" height="160" fill="url(#${u}sh)"/>
        <path d="${fin}" fill="#000" opacity=".3"/></g>
      <path d="${finEdge}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>
      <path d="${glass}" fill="url(#${u}gl)"/>
      <rect x="${p.glass[0][0] + 4}" y="${gTop - 1}" width="${(p.glass[2][0] - p.glass[0][0]) * 0.8}" height="5" fill="#111" opacity=".85"/>
      ${word('IMSA', p.glass[0][0] + 4 + (p.glass[2][0] - p.glass[0][0]) * 0.4, gTop + 3.2, 4.5, '#fff', { ls: 0.5, italic: false })}
      <path d="M${fw - 30} ${SILL - 2} L478 ${SILL - 4} L478 ${SILL + 2} L${fw - 30} ${SILL + 2} Z" fill="#121214"/>
      <path d="M2 ${SILL - 14} L30 ${SILL - 14} L26 ${SILL + 2} L4 ${SILL + 2} Z" fill="#121214"/>
      <path d="M${fw + 6} 78 l14 -7 l6 1 l-3 7 Z" fill="#151517"/>
      <path d="M${fw + 36} 112 l18 -2 l-2 6 l-16 1 Z" fill="#111" opacity=".6"/>
      <g clip-path="url(#${u}c)">
        ${p.kidney ? sm(p.kidney, '#0b0b0c', 'stroke="#9aa0a8" stroke-width="1.4"') : ''}
        <g transform="translate(0 4)">${p.lights}</g>
        <rect x="6" y="94" width="5" height="16" rx="1.5" fill="#ff2a2a"/>
      </g>
      <rect x="276" y="102" width="12" height="16" rx="2" fill="#111"/><rect x="278" y="104" width="8" height="12" rx="1" fill="${cls}"/>
      ${numberBoard(310, 110, num, cls, 32, 24)}
      ${brandText(p.brand, 206, 124, 14, 120)}
      ${p.sub ? brandText([p.sub[0], p.sub[1], p.sub[2]], 206, 108, 8.5, 110) : ''}
      ${decal(44, 102, 'IMSA', '#111', '#fff')}
      ${decal(436, 126, 'MICHELIN', '#fff', '#27509b')}
      ${p.badge ? BADGE[p.badge[0]](p.badge[1], p.badge[2], p.badge[3]) : ''}
      ${wheel(rw, r, { caliper: p.caliper, rim: '#b9bec6', nut: '#d71920' })}${wheel(fw, r, { caliper: p.caliper, rim: '#b9bec6', nut: '#d71920' })}
    </svg>`;
  }

  return { svg, ids: [...Object.keys(GT), ...Object.keys(PROTO)] };
})();
