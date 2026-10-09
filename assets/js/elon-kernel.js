/* ElonMuskNetWorth.org: the Elon kernel. A port of Spok (spaceflight.fyi): it owns the bar, the shared
   utilities, the state and the dispatch. Every question goes down the faculties in priority order until one
   answers; the librarian (index ranking with intents) is built in at 80 and the honest floor answers last.
   Nothing is generated and nothing leaves the tab: answers are retrieved from ELON_INDEX or worked out from
   ELON_DATA, both built from the same record as the pages. Load order: elon-index, elon-kernel, faculties. */
'use strict';
(function () {
  var IDX = window.ELON_INDEX || [];
  var DATA = window.ELON_DATA || null;
  var dock = document.getElementById('elonDock');
  if (!dock) return;
  var bar = document.getElementById('elonBar');
  var input = document.getElementById('elonIn');
  var results = document.getElementById('elonResults');
  var fine = function () { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; };
  var still = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-paused'); };

  var STOP = { the:1, is:1, an:1, of:1, to:1, in:1, on:1, how:1, what:1, does:1, do:1, did:1, are:1, was:1, were:1,
    it:1, its:1, and:1, or:1, for:1, with:1, by:1, at:1, tell:1, me:1, about:1, much:1, many:1, he:1, his:1, him:1,
    elon:1, musk:1, musks:1, s:1, has:1, have:1, be:1, can:1, you:1, please:1, now:1 };
  function tok(s) {
    return (s || '').toLowerCase().replace(/[\u2019']/g, '').replace(/(\w)-(\w)/g, '$1$2')
      .replace(/[^a-z0-9\u00e0-\u00ff\s-]/g, ' ').split(/[\s-]+/)
      .filter(function (w) { return (w.length > 1 || /^[0-9x]$/.test(w)) && !STOP[w]; });
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fnum(v) { return v.toLocaleString('en-GB', { maximumFractionDigits: v < 1000 ? 1 : 0 }); }
  function money(n) {
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(3).replace(/\.?0+$/, '') + ' trillion';
    if (n >= 1e9) return '$' + (Math.round(n / 1e8) / 10).toLocaleString('en-GB') + ' billion';
    if (n >= 1e6) return '$' + (Math.round(n / 1e5) / 10).toLocaleString('en-GB') + ' million';
    return '$' + Math.round(n).toLocaleString('en-GB');
  }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function longDate(iso) { var p = String(iso).slice(0, 10).split('-'); return (+p[2]) + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function edist(a, b, cap) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > cap) return cap + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i; var rowMin = i;
      for (j = 1; j <= lb; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > cap) return cap + 1;
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[lb];
  }
  var CATS = [
    { key: 'companies', words: /\bcompan(?:y|ies)\b|\bbusiness(?:es)?\b|\bfirms?\b/, dim: 'y', label: 'founded', fmt: function (v) { return String(v); } },
    { key: 'stakes', words: /\bstakes?\b|\bownership\b/, dim: 'pct', label: 'stake', fmt: function (v) { return fnum(v) + '%'; } },
    { key: 'readings', words: /\breadings?\b|\bestimates?\b|\bnet worth\b|\bfortune\b/, dim: 'v', label: 'Forbes estimate', fmt: money },
    { key: 'holdings', words: /\bshares\b/, dim: 'shares', label: 'Tesla shares', fmt: function (v) { return fnum(v) + ' shares'; } },
    { key: 'events', words: /\bevents?\b|\btimeline\b|\bmilestones?\b/, dim: 'y', label: 'year', fmt: function (v) { return String(v); } }
  ];
  var ENT = [];
  if (DATA) CATS.forEach(function (c) {
    (DATA[c.key] || []).forEach(function (e) { ENT.push({ e: e, cat: c, toks: tok(e.n), al: e.al || [] }); });
  });
  function resolveEnt(str, only) {
    var qts = tok(str), best = null, bs = 0;
    for (var i = 0; i < ENT.length; i++) {
      var x = ENT[i];
      if (only && x.cat.key !== only) continue;
      var sc = 0;
      for (var a = 0; a < x.al.length; a++) if (qts.indexOf(x.al[a]) !== -1) sc = Math.max(sc, 6 + x.al[a].length * 0.01);
      var hits = 0;
      for (var j = 0; j < x.toks.length; j++) if (qts.indexOf(x.toks[j]) !== -1) hits++;
      if (hits && !(hits < x.toks.length && hits < 2 && x.toks.length > 1)) sc = Math.max(sc, hits * 2 + (hits === x.toks.length ? 3 : 0) + x.toks.length * 0.1);
      if (sc > bs) { bs = sc; best = x; }
    }
    if (best) S.state.lastEnt = { n: best.e.n };
    return best;
  }
  function linkOf(u, t) {
    for (var i = 0; i < IDX.length; i++) if (IDX[i].u === u) return { t: t || IDX[i].t, u: u };
    return { t: t || u, u: u };
  }
  function company(id) { return DATA && (DATA.companies || []).filter(function (c) { return c.id === id; })[0]; }

  var S = window.ELON = {
    IDX: IDX, DATA: DATA,
    faculties: [], pres: [],
    state: { lastEnt: null, lastF: null, mode: null, hist: [] },
    u: { tok: tok, esc: esc, fnum: fnum, money: money, longDate: longDate, edist: edist, resolveEnt: resolveEnt,
         linkOf: linkOf, company: company, CATS: CATS, ENT: ENT, STOP: STOP,
         MEDS: ['\uD83E\uDD47 ', '\uD83E\uDD48 ', '\uD83E\uDD49 '],
         YEAR: new Date().getFullYear(),
         NOTE: 'from this site\u2019s record. Same pages, no servers.',
         NOTE_CALC: 'worked out just now, in this tab, from the same record. No servers.' },
    register: function (f) { this.faculties.push(f); this.faculties.sort(function (a, b) { return a.pri - b.pri; }); },
    prehook: function (fn) { this.pres.push(fn); },
    HUBS: [
      { t: 'The figure', u: './#number' }, { t: 'The companies', u: './companies.html' },
      { t: 'The history', u: './history.html' }, { t: 'The sources', u: './sources.html' }
    ],
    DONTKNOW: 'Honest answer: that is not in this site\u2019s record. Elon never guesses. Try a company, a reading, a currency or the Tesla stake by name.',
    answer: function (q) {
      for (var pi = 0; pi < S.pres.length; pi++) q = S.pres[pi](q, S) || q;
      S.state.hist.push(q); if (S.state.hist.length > 40) S.state.hist.shift();
      if (S.state.mode) { var mr = S.state.mode.fn(q, S); if (mr) return mr; }
      for (var fi = 0; fi < S.faculties.length; fi++) {
        var r = S.faculties[fi].try(q, S);
        if (r) return r;
      }
      return { text: S.DONTKNOW, links: S.HUBS };
    }
  };
  window.__ELON_DBG = function () { return { lastF: S.state.lastF, lastEnt: S.state.lastEnt, mode: S.state.mode && S.state.mode.owner, faculties: S.faculties.map(function (f) { return f.name + ':' + f.pri; }) }; };

  /* the librarian: index ranking, intents and follow-up carry (pri 80) */
  var INTENTS = [
    { re: /\b(stakes?|own|owns|owned|share of|percent|per cent|how much of)\b/, f: 'stake' },
    { re: /\b(vote|votes|voting|control|controls)\b/, f: 'voting' },
    { re: /\b(founded|started|start|began|when was|year)\b/, f: 'founded' },
    { re: /\b(role|roles|ceo|chief|chairman|chair|runs?|job|boss)\b/, f: 'role' },
    { re: /\b(listed|list|ipo|public|ticker|nasdaq|float)\b/, f: 'listed' },
    { re: /\b(valuation|valued|value)\b/, f: 'valuation' },
    { re: /\b(owner|owns it|who owns|parent|bought|buy|buying|acquired|acquire|sold|sell|sale|merged|pay|paid|part of|happened)\b/, f: 'owner' }
  ];
  var SYN = { buy: ['bought', 'acquired'], buying: ['bought'], purchase: ['bought', 'acquired'], purchased: ['bought'], pay: ['bought', 'price'], paid: ['bought', 'price'],
    sell: ['sold'], sale: ['sold'], join: ['joined'], ipo: ['listed', 'listing'], price: ['share'], start: ['founded'], started: ['founded'], found: ['founded'],
    create: ['founded'], created: ['founded'], begin: ['founded'], began: ['founded'], happened: ['acquired', 'renamed', 'merged', 'owner'] };
  S.u.INTENT_WORDS = INTENTS.map(function (i) { return i.re.source; }).join(' ') + ' ' + Object.keys(SYN).join(' ');
  function score(qt, entry) {
    var s = 0, tt = tok(entry.t);
    for (var i = 0; i < qt.length; i++) {
      if (entry.k.indexOf(qt[i]) !== -1) s += 3;
      else if (qt[i].length > 2 && entry.k.some(function (k) { return k.indexOf(qt[i]) === 0; })) s += 1;
      if (tt.indexOf(qt[i]) !== -1) s += 2;
    }
    if (s > 0 && entry.f) s += 0.5;
    return s;
  }
  S.register({ name: 'librarian', pri: 80, try: function (q) {
    var fm = /^\s*(?:and|what about|how about|also)\s+/i.exec(q);
    var carried = null;
    if (fm) { carried = S.state.lastF; q = q.slice(fm[0].length); }
    var qt = tok(q);
    if (!qt.length) return null;
    qt.slice().forEach(function (w) { (SYN[w] || []).forEach(function (s) { if (qt.indexOf(s) === -1) qt.push(s); }); });
    var entHit = resolveEnt(q, 'companies');
    var ranked = IDX.map(function (e) { return [score(qt, e) + (entHit && e.n === entHit.e.n ? 4 : 0), e]; })
      .filter(function (x) { return x[0] > 0; })
      .sort(function (a, b) { return b[0] - a[0]; });
    if (!ranked.length || ranked[0][0] < 3) return null;
    var top = ranked[0][1], text = null, hits = [], ql = q.toLowerCase();
    for (var i = 0; i < INTENTS.length; i++) {
      var f = INTENTS[i].f;
      if (INTENTS[i].re.test(ql) && top.f && top.f[f] && hits.indexOf(top.f[f]) === -1) {
        hits.push(top.f[f]);
        if (hits.length === 1) S.state.lastF = f;
        if (hits.length >= 3) break;
      }
    }
    if (hits.length) text = hits.join(' \u00b7 ');
    if (!text && carried && top.f && top.f[carried]) { text = top.f[carried]; S.state.lastF = carried; }
    if (!text) text = top.a || top.s;
    if (top.n) S.state.lastEnt = { n: top.n };
    var links = ranked.slice(0, 3).map(function (x) { return { t: x[1].t, u: x[1].u }; });
    if (top.orrery) links.push({ t: 'Show ' + top.n + ' in the Orrery', u: './#body-' + top.orrery });
    return { text: text, links: links };
  } });

  /* render: answer, optional chart, links, note */
  function collapse() { results.classList.remove('open'); }
  function render(q) {
    var res = S.answer(q);
    if (!res) { collapse(); return; }
    var links = (res.links || []).map(function (l) {
      return '<a href="' + esc(l.u) + '">' + esc(l.t) + ' <span aria-hidden="true">\u2192</span></a>';
    }).join('');
    results.innerHTML = '<div class="elon-answer"><span class="elon-mark" aria-hidden="true"></span><p>' + res.text + '</p></div>' +
      (res.svg ? '<div class="elon-chart">' + res.svg + '</div>' : '') +
      (links ? '<nav class="elon-links" aria-label="Pages Elon found">' + links + '</nav>' : '') +
      '<p class="elon-note">' + (res.note || S.u.NOTE) + '</p>';
    results.classList.add('open');
  }
  /* the drop-down: suggested questions on the first tap, then the ones that match what is being typed. Arrow keys
     move through them, Enter or a tap asks one, Escape closes. The answer still appears below as before. */
  var sug = document.getElementById('elonSuggest'), box = document.getElementById('elonBox'), drop = document.getElementById('elonDrop'), active = -1, shown = [], isOpen = false, dropAnim = null;
  var ghostStop = function () {};
  var SUGGEST = ['What is it in ounces of gold?', 'What is it in bitcoin?', 'Could he buy all the ether?', 'What is it in pounds?', 'How much of Tesla does he own?',
    'What is our estimate now?', 'What would he be worth on the Plaid case?', 'What did Tesla close at?', 'Is he still a trillionaire?',
    'How much is the forever ad spot?', 'What is it in euros?', 'What is it in yen?', 'How old is SpaceX?', 'Who owns X?',
    'How many tonnes of gold is that?', 'What will he be worth in 2030?', 'How long would £35,000 a year take?', 'Chart the readings', 'Quiz me'];
  function suggestFor(q) {
    if (!q) return SUGGEST.slice(0, 6);
    var ql = q.toLowerCase(), qt = tok(q), out = [];
    SUGGEST.forEach(function (s) {
      var sl = s.toLowerCase(), sc = sl.indexOf(ql) === 0 ? 10 : sl.indexOf(ql) > 0 ? 6 : 0;
      qt.forEach(function (w) { if (w.length > 1 && sl.indexOf(w) !== -1) sc += 2; });
      if (sc > 0) out.push([sc, s]);
    });
    IDX.forEach(function (e) {
      if (!e.n || out.length > 30) return;
      var nl = e.n.toLowerCase();
      if (qt.some(function (w) { return w.length > 2 && nl.indexOf(w) === 0; })) out.push([5, 'Tell me about ' + e.n]);
    });
    out.sort(function (a, b) { return b[0] - a[0]; });
    var seen = {}, list = [];
    out.forEach(function (x) { if (!seen[x[1]] && x[1].toLowerCase() !== ql) { seen[x[1]] = 1; list.push(x[1]); } });
    return list.slice(0, 4);
  }
  /* the shell grows from the bar with a spring and folds back into it: one shape, never a second box */
  function springTo(from, to, opening) {
    if (!drop) return;
    if (dropAnim) { dropAnim.cancel(); dropAnim = null; }
    if (still() || typeof drop.animate !== 'function') { drop.style.height = opening ? 'auto' : '0px'; if (!opening) box.classList.remove('is-open'); return; }
    var frames = opening
      ? [{ height: from + 'px' }, { height: (to * 1.07 + 4) + 'px', offset: 0.55 }, { height: (to * 0.98) + 'px', offset: 0.8 }, { height: to + 'px' }]
      : [{ height: from + 'px' }, { height: (from * 1.04 + 3) + 'px', offset: 0.22 }, { height: '0px' }];
    drop.style.height = from + 'px';
    dropAnim = drop.animate(frames, { duration: opening ? 560 : 360, easing: opening ? 'cubic-bezier(.22,.8,.25,1)' : 'cubic-bezier(.55,0,.75,.4)' });
    dropAnim.onfinish = function () { dropAnim = null; drop.style.height = opening ? 'auto' : '0px'; if (!opening) box.classList.remove('is-open'); };
  }
  function closeSug() {
    if (!sug) return;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1;
    if (!isOpen) return;
    isOpen = false;
    springTo(drop.getBoundingClientRect().height, 0, false);
  }
  function mark(i) {
    active = i;
    [].forEach.call(sug.children, function (li, k) { li.setAttribute('aria-selected', String(k === i)); });
    if (i >= 0) input.setAttribute('aria-activedescendant', 'elonOpt' + i); else input.removeAttribute('aria-activedescendant');
  }
  function openSug(list) {
    if (!sug) return;
    if (!list.length) { closeSug(); return; }
    if (isOpen && list.join('\n') === shown.join('\n')) return;
    var before = isOpen ? drop.getBoundingClientRect().height : 0;
    shown = list;
    sug.innerHTML = list.map(function (s, i) { return '<li role="option" id="elonOpt' + i + '" aria-selected="false" data-q="' + esc(s) + '"><span>' + esc(s) + '</span><span class="elon-go" aria-hidden="true">↗</span></li>'; }).join('');
    input.setAttribute('aria-expanded', 'true'); mark(-1);
    box.classList.add('is-open');
    var wasOpen = isOpen; isOpen = true;
    var after = sug.scrollHeight;
    if (!wasOpen || Math.abs(after - before) > 1) springTo(before, after, true);
  }
  function ask(text) { ghostStop(); input.value = text; closeSug(); render(text); }
  if (sug) {
    var invite = function () { if (!isOpen && !input.value.trim()) openSug(suggestFor('')); };
    input.addEventListener('focus', invite);
    input.addEventListener('click', invite);
    input.addEventListener('keydown', function (e) {
      if (!isOpen) { if (e.key === 'ArrowDown') { openSug(suggestFor(input.value.trim())); e.preventDefault(); } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); mark((active + 1) % shown.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active <= 0 ? shown.length - 1 : active - 1); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); ask(shown[active]); }
      else if (e.key === 'Escape') { closeSug(); }
    });
    sug.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    sug.addEventListener('click', function (e) { var li = e.target.closest && e.target.closest('li[data-q]'); if (li) ask(li.getAttribute('data-q')); });
    document.addEventListener('click', function (e) { if (!dock.contains(e.target)) closeSug(); });
  }
  /* typing never competes with a decorative animation: the scenes stop drawing while the bar has focus and wake when it loses it */
  input.addEventListener('focus', function () { document.documentElement.classList.add('elon-typing'); });
  input.addEventListener('blur', function () { document.documentElement.classList.remove('elon-typing'); window.dispatchEvent(new Event('observatory-motion-change')); });
  var t = null;
  input.addEventListener('input', function () {
    clearTimeout(t);
    var q = input.value.trim();
    if (sug) openSug(suggestFor(q));
    if (q.length < 2) { collapse(); return; }
    t = setTimeout(function () { render(q); }, 160);
  });
  bar.addEventListener('submit', function (e) {
    e.preventDefault();
    if (typeof closeSug === 'function') closeSug();
    var q = input.value.trim();
    if (q.length >= 2) render(q);
    if (!fine()) input.blur();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') collapse();
    var a = document.activeElement || {};
    if (e.key === '/' && a !== input && !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || '') && !a.isContentEditable) { e.preventDefault(); summon(); }
  });
  document.addEventListener('click', function (e) { if (!dock.contains(e.target) && !(e.target.closest && e.target.closest('[data-elon-open]'))) collapse(); });

  /* the trail: a private breadcrumb for the recall faculty, kept in this browser only */
  try {
    var here = { t: (document.title || '').split(' | ')[0], u: location.pathname || '/' };
    if (here.t) {
      var trail = JSON.parse(localStorage.getItem('elonTrail') || '[]').filter(function (x) { return x.u !== here.u; });
      trail.unshift(here); localStorage.setItem('elonTrail', JSON.stringify(trail.slice(0, 8)));
      if (!sessionStorage.getItem('elonSeen')) {
        sessionStorage.setItem('elonSeen', '1');
        localStorage.setItem('elonVisits', String((parseInt(localStorage.getItem('elonVisits') || '0', 10) || 0) + 1));
      }
    }
  } catch (err) { /* storage unavailable: everything else works the same */ }

  /* attract loop: the bar types questions to itself while it is on screen, never under reduced motion */
  var ghost = document.getElementById('elonGhost'), gtype = document.getElementById('elonType');
  if (ghost && gtype) {
    var PHRASES = ['what is Elon Musk worth?', 'how much of Tesla does he own?', 'is he still a trillionaire?', 'SpaceX vs Tesla',
      'what is it in rupees?', 'who owns X?', 'how old is SpaceX?', 'chart the readings', 'how long would \u00a335,000 a year take?', 'quiz me'];
    var pi = 0, ci = 0, mode = 'type', timer = null, on = false, seen = false, placeholder = input.getAttribute('placeholder');
    var step = function () {
      if (!on) return;
      /* never type over a real question: anything in the field, or the field in use, ends the loop */
      if (input.value || document.activeElement === input) { stop(); return; }
      clearTimeout(timer);
      var ph = PHRASES[pi], wait;
      if (mode === 'type') { ci++; gtype.textContent = ph.slice(0, ci); if (ci >= ph.length) { mode = 'hold'; wait = 1700; } else wait = 55 + Math.random() * 45; }
      else if (mode === 'hold') { mode = 'del'; wait = 60; }
      else { ci--; gtype.textContent = ph.slice(0, ci); if (ci <= 0) { mode = 'type'; pi = (pi + 1) % PHRASES.length; wait = 520; } else wait = 26; }
      timer = setTimeout(step, wait);
    };
    var stop = function () { on = false; clearTimeout(timer); ghost.classList.add('is-off'); gtype.textContent = ''; ci = 0; mode = 'type'; if (placeholder) input.setAttribute('placeholder', placeholder); };
    ghostStop = stop;
    var start = function () {
      if (still() || !seen || document.hidden || document.activeElement === input || input.value) return;
      if (on) return;
      on = true; ghost.classList.remove('is-off'); input.removeAttribute('placeholder'); step();
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) start(); else stop(); }).observe(bar);
    }
    input.addEventListener('focus', stop);
    input.addEventListener('blur', function () { setTimeout(start, 120); });
    input.addEventListener('input', function () { if (input.value) stop(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    window.addEventListener('observatory-motion-change', function () { if (still()) stop(); else start(); });
  }

  /* summons: the nav button, the menu row, the dock item and the / key */
  function summon(e) {
    if (e && e.preventDefault) e.preventDefault();
    var menu = document.getElementById('menu'), wasOpen = !!(menu && menu.open);
    if (wasOpen) menu.close();
    var go = function () {
      dock.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' });
      var shell = box || bar; shell.classList.remove('pulse'); void shell.offsetWidth; shell.classList.add('pulse');
      input.focus({ preventScroll: true });
    };
    if (wasOpen) setTimeout(go, 60); else go();
  }
  document.querySelectorAll('[data-elon-open]').forEach(function (el) { el.addEventListener('click', summon); });

  /* ?q= deep link: faculties register after the kernel, so render one tick later */
  var qp = new URLSearchParams(location.search).get('q');
  if (qp) {
    var done = false, go = function () { if (done) return; done = true; input.value = qp; render(qp.trim()); dock.scrollIntoView({ behavior: 'auto', block: 'center' }); };
    if (document.readyState === 'complete') setTimeout(go, 0); else { document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); }); window.addEventListener('load', go); }
  }
})();
