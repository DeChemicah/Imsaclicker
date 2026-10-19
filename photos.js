'use strict';

// Real car photos from Wikimedia Commons, looked up at runtime through the
// public Commons API (CORS-enabled with origin=*). Each car gets a list of
// landscape JPEG results; the game remembers which one the player picked.
window.CarPhotos = (() => {
  const API = 'https://commons.wikimedia.org/w/api.php';
  const QUERIES = {
    lexus: 'Lexus RC F GT3',
    nsx: 'Acura NSX GT3',
    amg: 'Mercedes-AMG GT3',
    aston: 'Aston Martin Vantage AMR GT3',
    mustang: 'Ford Mustang GT3',
    huracan: 'Lamborghini Huracan GT3 Evo',
    mclaren: 'McLaren 720S GT3',
    bmwm4: 'BMW M4 GT3',
    ferrari: 'Ferrari 296 GT3',
    corvette: 'Corvette Z06 GT3.R',
    p911: 'Porsche 911 GT3 R 992',
    riley: 'Riley Mk. 30',
    ligier: 'Ligier JS P217',
    dallara: 'Dallara P217',
    oreca: 'Oreca 07',
    arx06: 'Acura ARX-06',
    vseries: 'Cadillac V-Series.R',
    bmwgtp: 'BMW M Hybrid V8',
    sc63: 'Lamborghini SC63',
    valkyrie: 'Aston Martin Valkyrie AMR-LMH',
    p963: 'Porsche 963',
  };

  const results = {};
  const pending = {};
  const queue = [];
  let active = 0;
  const MAX_ACTIVE = 2;

  const stripTags = (html) => {
    if (!html) return '';
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  };

  function parse(json) {
    const pages = Object.values((json.query && json.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    const out = [];
    for (const p of pages) {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii || !/jpeg/i.test(ii.mime || '')) continue;
      if (!ii.width || ii.width < ii.height * 1.25 || ii.width < 800) continue;
      const md = ii.extmetadata || {};
      out.push({
        url: ii.thumburl || ii.url,
        page: ii.descriptionurl || '',
        title: (p.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
        artist: stripTags(md.Artist && md.Artist.value).slice(0, 60),
        license: (md.LicenseShortName && md.LicenseShortName.value) || '',
      });
    }
    return out;
  }

  function run(id) {
    active++;
    const params = new URLSearchParams({
      action: 'query', format: 'json', origin: '*',
      generator: 'search', gsrsearch: `filetype:bitmap ${QUERIES[id]}`, gsrnamespace: '6', gsrlimit: '30',
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
      iiextmetadatafilter: 'Artist|LicenseShortName',
    });
    return fetch(`${API}?${params}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => (results[id] = parse(j)))
      .catch(() => { delete pending[id]; return []; })
      .finally(() => { active--; next(); });
  }

  function next() {
    while (active < MAX_ACTIVE && queue.length) {
      const { id, resolve } = queue.shift();
      run(id).then(resolve);
    }
  }

  // Resolves to a (possibly empty) list of photos for a car id.
  function search(id) {
    if (results[id]) return Promise.resolve(results[id]);
    if (!QUERIES[id]) return Promise.resolve([]);
    if (!pending[id]) {
      pending[id] = new Promise(resolve => { queue.push({ id, resolve }); next(); });
    }
    return pending[id];
  }

  // Commons thumbnail URLs embed the width ("/1200px-"); swap it for smaller sizes.
  const sized = (url, w) => url.replace(/\/\d+px-/, `/${w}px-`);

  return { search, sized, queries: QUERIES };
})();
