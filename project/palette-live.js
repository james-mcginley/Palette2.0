/* Palette live data layer — keyless public APIs + Claude copy, with cache and fallback.
   Sources: Open Library (books), iTunes Search (albums, podcasts, previews),
   TVmaze (television), Wikipedia (films, synopsis enrichment). */
(function () {
  const TIMEOUT = 9000;
  const mem = new Map();

  function cacheGet(k) {
    if (mem.has(k)) return mem.get(k);
    try {
      const raw = sessionStorage.getItem('pl4:' + k);
      if (raw) { const v = JSON.parse(raw); mem.set(k, v); return v; }
    } catch (e) {}
    return undefined;
  }
  function cacheSet(k, v) {
    mem.set(k, v);
    try { sessionStorage.setItem('pl4:' + k, JSON.stringify(v)); } catch (e) {}
  }

  const THROTTLED = Symbol('throttled');

  async function getJSON(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) {
        /* 403/429 from iTunes means we are being throttled, not that the record
           is missing. Signal it so callers do not cache a false negative. */
        if (r.status === 403 || r.status === 429) return THROTTLED;
        return null;
      }
      return await r.json();
    } catch (e) { return null; } finally { clearTimeout(t); }
  }

  /* iTunes throttles bursts hard, so serialise its calls with a small gap and
     back off when it complains. */
  let itunesChain = Promise.resolve();
  let cooldownUntil = 0;
  function itunesFetch(url) {
    const run = async () => {
      const waitFor = cooldownUntil - Date.now();
      if (waitFor > 0) await new Promise(r => setTimeout(r, waitFor));
      for (let attempt = 0; attempt < 3; attempt++) {
        const d = await getJSON(url);
        if (d !== THROTTLED) { await new Promise(r => setTimeout(r, 90)); return d; }
        const backoff = 1200 * Math.pow(2, attempt);
        cooldownUntil = Date.now() + backoff;
        await new Promise(r => setTimeout(r, backoff));
      }
      return THROTTLED;
    };
    itunesChain = itunesChain.then(run, run);
    return itunesChain;
  }

  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const yearOf = (d) => (d ? String(d).slice(0, 4) : '');
  const strip = (h) => String(h || '').replace(/<[^>]*>/g, '').trim();
  const big = (u) => String(u || '').replace(/\/\d+x\d+bb\./, '/600x600bb.');

  /* Open Library returns the native-script author for many editions.
     Prefer a readable Latin form from the alternative names. */
  const LATIN = /^[\u0020-\u007E\u00C0-\u024F'’.\- ]+$/;
  function bestAuthor(names, alts) {
    const primary = (names || [])[0];
    if (primary && LATIN.test(primary)) return primary;
    const cands = (alts || []).filter(n => LATIN.test(n) && n.includes(' ') && !n.includes(','));
    const mixed = cands.find(n => !n.split(' ').some(w => w.length > 2 && w === w.toUpperCase()));
    return mixed || cands[0] || primary || 'Unknown';
  }

  /* ---- Open Library: books ---- */
  async function books(q, limit) {
    const d = await getJSON('https://openlibrary.org/search.json?q=' + encodeURIComponent(q) +
      '&limit=' + (limit || 8) +
      '&fields=key,title,author_name,author_alternative_name,first_publish_year,cover_i,subject');
    if (!d || !d.docs) return [];
    return d.docs.filter(b => b.cover_i).map(b => ({
      id: 'ol' + slug(b.key),
      badge: 'BOOK', tag: 'BOOK',
      title: b.title,
      creator: bestAuthor(b.author_name, b.author_alternative_name),
      year: b.first_publish_year ? String(b.first_publish_year) : '',
      cover: 'https://covers.openlibrary.org/b/id/' + b.cover_i + '-L.jpg',
      subjects: (b.subject || []).slice(0, 4),
      olKey: b.key,
      live: true,
    }));
  }

  /* ---- iTunes: albums and podcasts (its film catalogue returns nothing) ---- */
  const ENTITY = { MUSIC: { entity: 'album', badge: 'MUSIC' }, CAST: { entity: 'podcast', badge: 'CAST' } };
  async function itunes(q, kind, limit) {
    const cfg = ENTITY[kind];
    if (!cfg) return [];
    const d = await itunesFetch('https://itunes.apple.com/search?term=' + encodeURIComponent(q) +
      '&entity=' + cfg.entity + '&limit=' + (limit || 8));
    if (d === THROTTLED) return THROTTLED;
    if (!d || !d.results) return [];
    return d.results.map(r => ({
      id: 'it' + (r.collectionId || r.trackId || r.artistId),
      badge: cfg.badge, tag: cfg.badge,
      title: r.collectionName || r.trackName || r.artistName,
      creator: r.artistName || 'Unknown',
      year: yearOf(r.releaseDate),
      cover: big(r.artworkUrl100),
      collectionId: r.collectionId || null,
      trackCount: r.trackCount || null,
      genre: r.primaryGenreName || '',
      previewUrl: r.previewUrl || null,
      live: true,
    })).filter(x => x.cover && x.title);
  }

  /* A collection record carries no preview, so fetch its lead track on demand. */
  async function preview(item) {
    if (!item) return null;
    if (item.previewUrl) return item.previewUrl;
    if (!item.collectionId) return null;
    const key = 'prev:' + item.collectionId;
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const d = await itunesFetch('https://itunes.apple.com/lookup?id=' + item.collectionId + '&entity=song&limit=4');
    if (d === THROTTLED) return null;
    const track = d && d.results && d.results.filter(r => r.wrapperType === 'track' && r.previewUrl)[0];
    const url = track ? track.previewUrl : null;
    cacheSet(key, url);
    return url;
  }

  /* ---- TVmaze: television ---- */
  async function tv(q, limit) {
    const d = await getJSON('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q));
    if (!Array.isArray(d)) return [];
    return d.slice(0, limit || 6).map(({ show: s }) => ({
      id: 'tv' + s.id,
      badge: 'TV', tag: 'TV',
      title: s.name,
      creator: (s.network && s.network.name) || (s.webChannel && s.webChannel.name) || 'Television',
      year: yearOf(s.premiered) || 'Series',
      cover: (s.image && (s.image.original || s.image.medium)) || '',
      synopsis: strip(s.summary),
      genre: (s.genres || []).join(', '),
      live: true,
    })).filter(x => x.cover);
  }

  /* ---- Wikipedia summary ---- */
  async function wikiSummary(term) {
    const s = await getJSON('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
      encodeURIComponent(term) + '&srlimit=1&format=json&origin=*');
    const hit = s && s.query && s.query.search && s.query.search[0];
    if (!hit) return null;
    const d = await getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' +
      encodeURIComponent(hit.title.replace(/ /g, '_')));
    if (!d || d.type === 'disambiguation' || !d.extract) return null;
    return d;
  }

  /* An API can hand back a URL that 404s. Only commit artwork that actually loads. */
  function loadable(url) {
    if (!url) return Promise.resolve(false);
    return new Promise(res => {
      const img = new Image();
      const done = (ok) => { img.onload = img.onerror = null; res(ok); };
      img.onload = () => done(img.naturalWidth > 0);
      img.onerror = () => done(false);
      setTimeout(() => done(false), 7000);
      img.src = url;
    });
  }

  /* ---- landscape backdrop for the media sheet header ----
     Cover art is portrait and blurs to a flat wash, so the banner gets its own
     wide, openly-licensed photograph chosen from the work's subject matter. */
  const BACKDROP_TERM = {
    FILM: 'cinema screen film projector', TV: 'television studio lights',
    BOOK: 'library bookshelves reading', MUSIC: 'vinyl records turntable',
    CAST: 'radio microphone studio', EVENT: 'concert crowd stage lights',
  };
  async function backdrop(item) {
    if (!item || !item.title) return null;
    const key = 'backdrop:' + slug(item.title) + '|' + slug(item.creator || '');
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;

    const kind = item.badge || item.tag;
    /* Prefer something specific to the work, then fall back to its medium. */
    const queries = [item.title, (item.title + ' ' + String(item.creator || '').replace(/^Dir\.\s*/i, '')).trim(), BACKDROP_TERM[kind] || 'culture'];
    let url = null;
    for (const q of queries) {
      const d = await getJSON('https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) +
        '&page_size=8&license_type=commercial&aspect_ratio=wide&size=large');
      const hits = (d && d.results) || [];
      const pick = hits.find(r => r.url && (!r.width || !r.height || r.width >= r.height));
      if (pick && await loadable(pick.url)) { url = pick.url; break; }
    }
    cacheSet(key, url);
    return url;
  }

  /* ---- creator page: bio, portrait and other work ----
     A director, author or musician gets one page assembled from whichever
     source actually knows about them. Roles differ, so the works query does
     too: books by author, albums by artist, films by director. */
  async function creator(name, kind, knownTitle) {
    if (!name) return null;
    const clean = String(name).replace(/^(Dir\.|Directed by|By)\s*/i, '').trim();
    const key = 'creator4:' + slug(clean) + ':' + (kind || 'any');
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;

    const HINT = { FILM:'film director', TV:'television', BOOK:'author', MUSIC:'musician', CAST:'broadcaster' };
    const [pageA, pageB] = await Promise.all([
      getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(clean.replace(/ /g, '_'))),
      wikiSummary(clean + ' ' + (HINT[kind] || '')),
    ]);
    const page = (pageA && pageA.extract && pageA.type !== 'disambiguation') ? pageA
      : (pageB && pageB.extract ? pageB : null);

    let works = [];
    if (kind === 'BOOK') {
      /* Two real authors can share a name (Douglas Stuart the novelist and
         Douglas Stuart the biblical scholar both exist), so resolve to one
         Open Library author key first and query that, not the name. */
      const ak = await getJSON('https://openlibrary.org/search/authors.json?q=' + encodeURIComponent(clean));
      const cand = ((ak && ak.docs) || []).filter(a => slug(a.name) === slug(clean))
        .sort((a, b) => (b.work_count || 0) - (a.work_count || 0));
      /* Work count alone picks the wrong person when a prolific namesake exists,
         so when we already know one of their titles, prefer the key that has it. */
      const fetchFor = async (k) => {
        const d = await getJSON('https://openlibrary.org/search.json?author_key=' + encodeURIComponent(k) +
          '&sort=readinglog&limit=24&fields=key,title,first_publish_year,cover_i');
        return ((d && d.docs) || []).filter(b => b.cover_i).map(b => ({
          id: 'ol' + slug(b.key), badge: 'BOOK', title: b.title,
          creator: clean, year: b.first_publish_year ? String(b.first_publish_year) : '',
          cover: 'https://covers.openlibrary.org/b/id/' + b.cover_i + '-L.jpg',
          olKey: b.key, live: true,
        }));
      };
      const wantTitle = knownTitle ? slug(knownTitle) : null;
      for (const c of cand.slice(0, 4)) {
        if (!c.key) continue;
        const got = await fetchFor(c.key);
        if (!wantTitle) { works = got; break; }
        if (got.some(w => slug(w.title) === wantTitle)) { works = got; break; }
        if (!works.length) works = got;
      }
    } else if (kind === 'MUSIC' || kind === 'CAST') {
      works = await itunes(clean, kind === 'CAST' ? 'CAST' : 'MUSIC', 24);
      const want = slug(clean);
      const strict = works.filter(w => slug(w.creator).includes(want) || want.includes(slug(w.creator)));
      if (strict.length) works = strict;
      /* Albums only — singles, remixes and session EPs are not a body of work. */
      works = works.filter(w => !/ - single| - ep|remix|session|karaoke|tribute|instrumental/i.test(w.title));
    }

    /* De-dupe by title so reissues and deluxe editions do not fill the shelf. */
    const seen = new Set();
    works = works.filter(w => {
      const k = slug(w.title).replace(/(deluxe|remaster(ed)?|expanded|anniversary|edition|single)/g, '');
      if (!k || seen.has(k)) return false;
      /* Box sets and multi-author collections are not their own work. */
      if (/collection set|books? collection|box set|\d+ books/i.test(w.title)) return false;
      seen.add(k); return true;
    }).slice(0, 10);

    if (!page && !works.length) { cacheSet(key, null); return null; }
    const img = page && ((page.originalimage && page.originalimage.width <= 2200 ? page.originalimage.source : null)
      || (page.thumbnail && page.thumbnail.source));
    const out = {
      name: clean,
      role: (page && page.description) || (HINT[kind] || 'Creator'),
      bio: page ? page.extract : null,
      portrait: img || null,
      wikiUrl: page && page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page,
      works,
    };
    cacheSet(key, out);
    return out;
  }

  /* ---- portrait for a real, notable person or organisation ---- */
  async function portrait(name, hint) {
    if (!name) return null;
    const key = 'portrait:' + slug(name);
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;

    const pull = (d) => {
      if (!d || d.type === 'disambiguation') return null;
      return (d.originalimage && d.originalimage.width <= 2200 ? d.originalimage.source : null)
        || (d.thumbnail && d.thumbnail.source) || null;
    };
    /* The exact title is far more reliable than search, which drifts to
       family/franchise pages (Sofia Coppola -> "Coppola family"). */
    let d = await getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' +
      encodeURIComponent(name.replace(/ /g, '_')));
    let url = pull(d);
    if (!url) {
      d = await wikiSummary(name + (hint ? ' ' + hint : ''));
      const ok = d && (slug(d.title).includes(slug(name)) || slug(name).includes(slug(d.title)));
      url = ok ? pull(d) : null;
    }
    if (url && !(await loadable(url))) url = null;
    cacheSet(key, url);
    return url;
  }

  /* ---- MusicBrainz + Cover Art Archive: record sleeves ----
     iTunes throttles aggressively and blocks by IP for long stretches, so
     albums have a second, independent source. Matched on artist, not just title. */
  async function mbCover(title, artist) {
    const q = 'release:"' + String(title).replace(/"/g, '') + '"' +
      (artist ? ' AND artist:"' + String(artist).replace(/"/g, '') + '"' : '');
    const d = await getJSON('https://musicbrainz.org/ws/2/release-group?query=' +
      encodeURIComponent(q) + '&fmt=json&limit=5');
    const groups = (d && d['release-groups']) || [];
    if (!groups.length) return null;
    const wantT = slug(title), wantA = slug(artist);
    const named = (g) => slug((g['artist-credit'] || []).map(a => a.name).join(' '));
    const ranked = groups
      .map(g => {
        const t = slug(g.title);
        let s = t === wantT ? 0 : t.startsWith(wantT) ? 1 : t.includes(wantT) ? 2 : 9;
        if (wantA && named(g).includes(wantA.split('-')[0])) s -= 0.5;
        return { g, s };
      })
      .filter(x => x.s < 9)
      .sort((a, b) => a.s - b.s);
    for (const { g } of ranked.slice(0, 1)) {
      const art = await getJSON('https://coverartarchive.org/release-group/' + g.id);
      const img = art && art.images && art.images.find(i => i.front) || (art && art.images && art.images[0]);
      const url = img && ((img.thumbnails && (img.thumbnails['500'] || img.thumbnails.large)) || img.image);
      if (url) return String(url).replace(/^http:/, 'https:');
    }
    return null;
  }

  /* ---- resolve the real cover for a known title ---- */
  async function cover(item) {
    if (!item || !item.title) return null;
    const key = 'cover:' + slug(item.title) + '|' + slug(item.creator || '');
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;

    const kind = item.badge || item.tag;
    const artist = String(item.creator || '').replace(/^Dir\.\s*/i, '').trim();
    let url = null;

    /* Titles are the reliable signal; our creator strings are editorial
       ("Mitchinson & Miller") and often differ from the catalogue's
       ("Backlisted Productions"), so a creator match may confirm a hit but
       must never be required to accept one. */
    const wantT = slug(item.title);
    const surnames = slug(artist).split('-').filter(w => w.length > 3);
    const titleScore = (r) => {
      const t = slug(r.title);
      if (t === wantT) return 0;
      if (t.startsWith(wantT)) return 1;
      if (t.includes(wantT)) return 2;
      if (wantT.includes(t) && t.length > 5) return 3;
      return 9;
    };
    const creatorHit = (r) => {
      const c = slug(r.creator);
      return surnames.some(w => c.includes(w));
    };
    const pick = (res) => {
      const scored = (res || []).map(r => ({ r, s: titleScore(r) - (creatorHit(r) ? 0.5 : 0) }))
        .filter(x => x.s < 9)
        .sort((a, b) => a.s - b.s);
      return scored.length ? scored[0].r : null;
    };

    if (kind === 'BOOK') {
      let res = await books(item.title, 10);
      let hit = pick(res);
      if ((!hit || !creatorHit(hit)) && artist) {
        const alt = pick(await books(item.title + ' ' + artist, 8));
        if (alt && creatorHit(alt)) hit = alt;
      }
      url = (hit || {}).cover || null;
    } else if (kind === 'MUSIC' || kind === 'CAST') {
      let res = await itunes(item.title, kind, 12);
      const throttled = res === THROTTLED;
      let hit = throttled ? null : pick(res);
      if (!throttled && (!hit || !creatorHit(hit)) && artist) {
        const altRes = await itunes(item.title + ' ' + artist, kind, 8);
        if (altRes !== THROTTLED) {
          const alt = pick(altRes);
          if (alt) hit = alt;
        }
      }
      url = (hit || {}).cover || null;
      /* Records have a second source; podcasts only live on iTunes, so a
         throttled lookup stays uncached and retries later. */
      if (!url && kind === 'MUSIC') url = await mbCover(item.title, artist);
      if (!url && kind === 'CAST' && throttled) return null;
    } else if (kind === 'FILM' || kind === 'TV') {
      if (kind === 'TV') {
        const res = await tv(item.title, 6);
        /* Never fall through to res[0] — TVmaze fuzzy-matches, so an unrelated
           show would hand back its own poster. */
        const exact = res.find(r => slug(r.title) === wantT);
        const starts = res.find(r => slug(r.title).startsWith(wantT));
        const inside = res.find(r => slug(r.title).includes(wantT) && wantT.length > 6);
        url = ((exact || starts || inside) || {}).cover || null;
      }
      if (!url) {
        /* Wikipedia search drifts badly on short or generic titles: "The Batman"
           comes back for all sorts of queries. Only accept a page whose own
           title matches ours once the disambiguation suffix is stripped. */
        const hint = kind === 'TV' ? 'television series' : 'film';
        const tries = [
          item.title + ' ' + (item.year || '') + ' ' + hint,
          item.title + ' ' + hint + (artist ? ' ' + artist : ''),
        ];
        for (const term of tries) {
          const d = await wikiSummary(term.replace(/\s+/g, ' ').trim());
          if (!d) continue;
          const pageT = slug(String(d.title).replace(/\s*\([^)]*\)\s*$/, ''));
          if (pageT !== wantT && !(pageT.startsWith(wantT) && wantT.length > 8)) continue;
          /* The page must actually be about a film or programme, not a person,
             album or novel that happens to share the name. */
          const blurb = ((d.description || '') + ' ' + (d.extract || '')).toLowerCase();
          if (!/\b(film|movie|television|tv series|series|sitcom|miniseries|directed)\b/.test(blurb)) continue;
          url = (d.originalimage && d.originalimage.width <= 1600 ? d.originalimage.source : null)
            || (d.thumbnail && d.thumbnail.source) || null;
          if (url) break;
        }
      }
    }
    if (url && !(await loadable(url))) url = null;
    cacheSet(key, url);
    return url;
  }

  /* ---- Wikipedia: films (iTunes has no usable movie catalogue) ---- */
  async function films(q, limit) {
    const titles = Array.isArray(q) ? q : [q];
    const out = [];
    for (const t of titles.slice(0, limit || 6)) {
      const d = await wikiSummary(t + ' film');
      if (!d || !d.thumbnail) continue;
      /* Reject search drift: the page title must be the film we asked for. */
      const askT = slug(t), gotT = slug(String(d.title).replace(/\s*\([^)]*\)\s*$/, ''));
      if (gotT !== askT && !gotT.startsWith(askT) && !(askT.startsWith(gotT) && gotT.length > 8)) continue;
      if (!/\b(film|movie|directed)\b/i.test((d.description || '') + ' ' + (d.extract || ''))) continue;
      const desc = d.description || '';
      const ym = desc.match(/\b(19|20)\d{2}\b/);
      const dm = desc.match(/by\s+(.+)$/i);
      out.push({
        id: 'wk' + slug(d.title),
        badge: 'FILM', tag: 'FILM',
        title: d.title.replace(/\s*\((film|\d{4} film)\)$/i, ''),
        creator: dm ? 'Dir. ' + dm[1].trim() : 'Film',
        year: ym ? ym[0] : '',
        cover: (d.originalimage && d.originalimage.width <= 1400 ? d.originalimage.source : d.thumbnail.source),
        synopsis: d.extract,
        wikiUrl: d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page,
        live: true,
      });
    }
    return out;
  }

  /* Loose keyword matches (hashtag spam, market-research titles) rank below real hits. */
  function relevance(item, q) {
    const t = String(item.title || '').toLowerCase();
    const c = String(item.creator || '').toLowerCase();
    const n = q.toLowerCase().trim();
    if (t === n) return 0;
    if (t.startsWith(n)) return 1;
    if (new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t)) return 2;
    if (t.includes(n)) return 3;
    if (c.includes(n)) return 4;
    return 5;
  }

  /* ---- unified search ---- */
  async function search(q, kind) {
    const key = 'search:' + (kind || 'all') + ':' + q.toLowerCase();
    const hit = cacheGet(key);
    if (hit) return hit;
    let jobs;
    if (kind === 'BOOK') jobs = [books(q, 10)];
    else if (kind === 'FILM') jobs = [films(q, 1)];
    else if (kind === 'MUSIC') jobs = [itunes(q, 'MUSIC', 10)];
    else if (kind === 'CAST') jobs = [itunes(q, 'CAST', 10)];
    else if (kind === 'TV') jobs = [tv(q, 10)];
    else jobs = [books(q, 4), films(q, 1), itunes(q, 'MUSIC', 4), itunes(q, 'CAST', 3), tv(q, 3)];
    const parts = await Promise.all(jobs);
    const lists = parts.filter(l => Array.isArray(l) && l.length)
      .map(l => l.slice().sort((a, b) => relevance(a, q) - relevance(b, q)));
    const seen = new Set();
    const out = [];
    const max = Math.max(0, ...lists.map(l => l.length));
    for (let i = 0; i < max; i++) {
      for (const l of lists) {
        const it = l[i];
        if (!it) continue;
        const k = slug(it.title) + '|' + slug(it.creator);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(it);
      }
    }
    if (out.length) cacheSet(key, out);
    return out;
  }

  /* ---- rails: seeded from real titles, since genre terms return compilation junk ---- */
  async function rail(seeds, kind, limit) {
    const list = Array.isArray(seeds) ? seeds : [seeds];
    const key = 'rail:' + kind + ':' + slug(list.join('|')) + ':' + (limit || 6);
    const hit = cacheGet(key);
    if (hit) return hit;
    let out = [];
    if (kind === 'FILM') {
      out = await films(list, limit || 6);
    } else {
      const seen = new Set();
      for (const seed of list.slice(0, limit || 6)) {
        const [rawTitle, artist] = String(seed).split('|').map(x => x.trim());
        const term = artist ? rawTitle + ' ' + artist : rawTitle;
        const res = kind === 'BOOK' ? await books(term, 6)
          : kind === 'TV' ? await tv(term, 3)
          : await itunes(term, kind, 8);
        let pool = Array.isArray(res) ? res : [];
        if (artist) {
          const want = slug(artist);
          const strict = pool.filter(r => {
            const got = slug(r.creator);
            return got.includes(want) || want.includes(got);
          });
          if (strict.length) pool = strict;
        }
        const ranked = pool.slice().sort((a, b) => relevance(a, rawTitle) - relevance(b, rawTitle));
        const pick = ranked.find(r => !seen.has(slug(r.title)));
        if (pick) { seen.add(slug(pick.title)); out.push(pick); }
        if (out.length >= (limit || 6)) break;
      }
    }
    if (out.length) cacheSet(key, out);
    return out;
  }

  /* ---- enrich one item with a real synopsis ---- */
  async function enrich(item) {
    if (!item) return null;
    const key = 'enrich:' + (item.id || slug(item.title));
    const hit = cacheGet(key);
    if (hit) return hit;
    let out = null;
    if (item.olKey) {
      const d = await getJSON('https://openlibrary.org' + item.olKey + '.json');
      const desc = d && (typeof d.description === 'string' ? d.description : (d.description && d.description.value));
      if (desc) out = { synopsis: strip(desc).split('\n')[0], source: 'Open Library' };
    }
    if (!out && item.synopsis && item.synopsis.length > 80) {
      out = { synopsis: item.synopsis, source: item.badge === 'TV' ? 'TVmaze' : 'Wikipedia' };
    }
    if (!out) {
      const hint = { FILM: 'film', TV: 'television series', BOOK: 'novel', MUSIC: 'album', CAST: 'podcast' }[item.badge || item.tag] || '';
      const d = await wikiSummary(item.title + ' ' + hint);
      if (d) out = { synopsis: d.extract, source: 'Wikipedia' };
    }
    if (out) cacheSet(key, out);
    return out;
  }

  /* ---- Claude-written copy ---- */
  async function copy(key, prompt, maxWords) {
    const ck = 'copy:' + key;
    const hit = cacheGet(ck);
    if (hit) return hit;
    if (!(window.claude && typeof window.claude.complete === 'function')) return null;
    try {
      const raw = await window.claude.complete(
        prompt + '\n\nReply with the sentence only — no preamble, no quotation marks, no markdown. ' +
        'Under ' + (maxWords || 26) + ' words. Editorial, unhurried, plain English. Never use emoji.'
      );
      const txt = String(raw || '').trim().replace(/^["'“]|["'”]$/g, '').split('\n')[0].trim();
      if (!txt || txt.length < 8) return null;
      cacheSet(ck, txt);
      return txt;
    } catch (e) { return null; }
  }

  /* ---- audio preview ---- */
  let audio = null, playingId = null;
  async function play(item, onChange) {
    const id = item && item.id;
    if (playingId === id && audio && !audio.paused) {
      audio.pause(); audio = null; playingId = null;
      if (onChange) onChange(null);
      return 'stopped';
    }
    if (audio) { audio.pause(); audio = null; }
    const url = await preview(item);
    if (!url) { playingId = null; if (onChange) onChange(null); return 'none'; }
    audio = new Audio(url);
    audio.volume = 0.85;
    playingId = id;
    audio.addEventListener('ended', () => { playingId = null; if (onChange) onChange(null); });
    audio.play().catch(() => { playingId = null; if (onChange) onChange(null); });
    if (onChange) onChange(id);
    return 'playing';
  }
  function stopAudio() { if (audio) { audio.pause(); audio = null; } playingId = null; }

  window.PaletteLive = {
    search, rail, enrich, copy, preview, cover, portrait, backdrop, creator, books, itunes, tv, films, play, stopAudio,
    get playingId() { return playingId; },
  };
})();
