/* Elon, the sums (pri 20). Money maths worked out at ask-time from the same record as the pages, and every
   result prints its working: conversion at the dated ECB rates, the calculator's own division for "how long at
   this pay" (through tools.js, so the bar and the calculator can never disagree), change between readings, a
   company's age against today, the age of the reading, the distance from a trillion and, only where the board
   carries both a stake and a dated valuation, a private stake's value. Nonsense inputs fall through to the floor. */
'use strict';
(function () {
  var S = window.ELON; if (!S || !S.DATA) return;
  var U = S.u, D = S.DATA, X = window.ObservatoryTools;
  var CUR = [
    ['INR', /\b(rupees?|inr|lakh|crore)\b|\u20b9/, 'rupees'], ['GBP', /\b(pounds?|sterling|gbp|quid)\b|\u00a3/, 'pounds'],
    ['EUR', /\b(euros?|eur)\b|\u20ac/, 'euros'], ['AED', /\b(dirhams?|aed)\b/, 'dirhams'], ['JPY', /\b(yen|jpy)\b|\u00a5/, 'yen'],
    ['CNY', /\b(yuan|renminbi|rmb|cny)\b/, 'yuan'], ['CAD', /\b(canadian dollars?|cad)\b/, 'Canadian dollars'],
    ['AUD', /\b(australian dollars?|aud)\b/, 'Australian dollars'], ['CHF', /\b(swiss francs?|francs?|chf)\b/, 'Swiss francs'],
    ['SAR', /\b(saudi riyals?|riyals?|sar)\b/, 'riyals'], ['HKD', /\b(hong kong dollars?|hkd)\b/, 'Hong Kong dollars'],
    ['SGD', /\b(singapore dollars?|sgd)\b/, 'Singapore dollars'], ['KRW', /\b(korean won|krw|in won)\b|\u20a9/, 'won'],
    ['BRL', /\b(brazilian reals?|reais|brl)\b/, 'reais'], ['MXN', /\b(mexican pesos?|pesos?|mxn)\b/, 'Mexican pesos'],
    ['ZAR', /\b(south african rand|rand|zar)\b/, 'rand'], ['SEK', /\b(swedish kronor|swedish krona|kronor|krona|sek)\b/, 'Swedish kronor'],
    ['NOK', /\b(norwegian kroner|norwegian krone|kroner|krone|nok)\b/, 'Norwegian kroner'], ['RUB', /\b(roubles?|rubles?|rub)\b|\u20bd/, 'roubles'],
    ['NZD', /\b(new zealand dollars?|kiwi dollars?|nzd)\b/, 'New Zealand dollars'], ['TRY', /\b(turkish lira|lira)\b|\u20ba/, 'Turkish lira']
  ];
  U.WORDS = (U.WORDS || '') + ' ' + CUR.map(function (x) { return x[1].source + ' ' + x[2]; }).join(' ');
  function curOf(ql) { for (var i = 0; i < CUR.length; i++) if (CUR[i][1].test(ql)) return CUR[i]; return null; }
  function rateText(r) { return r >= 10 ? r.toFixed(2) : r.toFixed(4); }
  function latest() { return D.latest; }
  function pay(code, v) { try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(v); } catch (e) { return code + ' ' + Math.round(v).toLocaleString('en-GB'); } }
  function amountIn(q) {
    var m = /(\d[\d,]*(?:\.\d+)?)\s*(trillion|tn|billion|bn|million|mn|m|thousand|k)?\b/i.exec(q);
    if (!m) return null;
    var v = parseFloat(m[1].replace(/,/g, '')), u = (m[2] || '').toLowerCase();
    v *= /^(trillion|tn)$/.test(u) ? 1e12 : /^(billion|bn)$/.test(u) ? 1e9 : /^(million|mn|m)$/.test(u) ? 1e6 : /^(thousand|k)$/.test(u) ? 1e3 : 1;
    return isFinite(v) && v > 0 ? v : null;
  }
  var DAY = 864e5;
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / DAY); }
  function readingOn(ql) {
    var m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/.exec(ql);
    if (!m) return null;
    var day = +(m[1] || m[4]), mon = (m[2] || m[3]);
    var mi = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(mon) + 1;
    return D.readings.filter(function (r) { var p = r.date.split('-'); return +p[1] === mi && +p[2] === day; })[0] || null;
  }
  S.register({ name: 'calc', pri: 20, try: function (q) {
    var ql = q.toLowerCase(), L = latest(), R = D.rates;
    /* how long would a yearly pay take to reach the figure */
    if (/\bhow long\b|\bhow many years\b|\byears to (earn|make)\b|\bto earn (it|that|his)\b/.test(ql) && /\d/.test(ql) && X) {
      var pm = /([\u00a3$\u20ac\u20b9\u00a5])?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|m|million)?\b/i.exec(q);
      if (pm) {
        var p = parseFloat(pm[2].replace(/,/g, '')) * (/^(k|thousand)$/i.test(pm[3] || '') ? 1e3 : /^(m|million)$/i.test(pm[3] || '') ? 1e6 : 1);
        if (!(p >= 1 && p <= 1e12)) return null;
        var sym = { '\u00a3': 'GBP', '$': 'USD', '\u20ac': 'EUR', '\u20b9': 'INR', '\u00a5': 'JPY' }[pm[1] || ''];
        var cw = curOf(ql), code = sym || (cw ? cw[0] : 'USD');
        var r = X.compute(L.v, p, code, R), name = code === 'USD' ? 'dollars' : (CUR.filter(function (c) { return c[0] === code; })[0] || [0, 0, code])[2];
        return { text: 'At ' + pay(code, p) + ' a year it would take ' + X.count(r.years) + ' years to earn ' + (code === 'USD' ? U.money(r.figure) : X.big(r.figure, X.symbol(R, code))) + '. Worked as the figure in ' + name + ' \u00f7 yearly pay' + (code === 'USD' ? '' : ', at the rate for ' + U.longDate(R.rate_date)) + ', on the Forbes estimate for ' + U.longDate(L.as_of) + ' \u2248. That is ' + X.count(r.lives) + ' working lives of 45 years.',
          links: [{ t: 'Open it in the calculator', u: './in-proportion.html?a=' + p + '&c=' + code }, U.linkOf('./currencies.html', 'In your currency')], note: U.NOTE_CALC };
      }
    }
    /* the figure, or a dollar amount, in another currency */
    var cur = curOf(ql);
    if (cur && X && (/\b(in|into|to|as|convert|converted|how many|how much)\b/.test(ql) || /\blakh|crore\b/.test(ql))) {
      var amt = /\d/.test(ql) ? amountIn(q) : null, base = amt || L.v, rate = X.perUsd(R, cur[0]), val = base * rate;
      var peg = R.pegs && R.pegs[cur[0]], off = R.official && R.official[cur[0]], src = peg ? 'the ' + peg.per_usd + ' peg set by the ' + peg.source.replace(/ peg$/, '') : off ? 'the ' + off.source + ' for ' + U.longDate(off.date) + ' \u2713 (' + off.why.replace(/\.$/, '').replace(/^The/, 'the') + ')' : 'the ECB rate for ' + U.longDate(R.rate_date) + ' \u2713';
      var head = cur[0] === 'INR' ? 'In rupees that is ' + X.big(val, '\u20b9') + ' (\u20b9' + (val / 1e12).toFixed(1) + ' lakh crore)' : 'In ' + cur[2] + ' that is ' + X.big(val, X.symbol(R, cur[0]));
      return { text: head + '. Worked as ' + U.money(base) + ' \u00d7 ' + rateText(rate) + ' ' + cur[2] + ' per dollar, ' + src + (amt ? '' : ', on the Forbes estimate for ' + U.longDate(L.as_of) + ' \u2248') + '.',
        links: (/^(GBP|EUR|JPY|CNY|INR|CAD|AUD|CHF|AED|SAR|HKD|SGD|KRW|BRL|MXN|ZAR|SEK|NOK|RUB|NZD|TRY)$/.test(cur[0]) && !amt ? [{ t: 'Show the number in ' + cur[2], u: './?cur=' + cur[0] + '#number' }] : []).concat([U.linkOf('./currencies.html', 'In your currency')]), note: U.NOTE_CALC };
    }
    /* change between two readings */
    if (/\b(change|changed|changes|gain|gained|lost|loss|rise|risen|rose|fell|fall|fallen|difference|moved|grown|grow|up|down)\b/.test(ql) &&
        /\b(since|from|reading|readings|last|previous|first|ago|september|october|august)\b/.test(ql) && !U.resolveEnt(q, 'companies')) {
      var rs = D.readings.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
      if (rs.length < 2) return null;
      var nw = rs[0], old = readingOn(ql) || (/\b(first|earliest)\b/.test(ql) ? rs[rs.length - 1] : rs[1]);
      if (old === nw) old = rs[1];
      var diff = nw.v - old.v, sign = diff >= 0 ? '+' : '\u2212', pct = Math.abs(diff) / old.v * 100, days = daysBetween(old.date, nw.date);
      return { text: sign + U.money(Math.abs(diff)) + ' (' + sign + pct.toFixed(1) + '%) from ' + U.money(old.v) + ' on ' + U.longDate(old.date) + ' to ' + U.money(nw.v) + ' on ' + U.longDate(nw.date) + '. Worked as (new \u2212 old) \u00f7 old, on two Forbes readings \u2248' + (days > 1 ? '. Over ' + days + ' days that is ' + U.money(Math.abs(diff) / days) + ' a day' : '') + '.',
        links: [U.linkOf('./history.html', 'Every dated reading')], note: U.NOTE_CALC };
    }
    /* how fresh is the figure */
    if (/\bhow (old|recent|fresh|current|up to date) is (the|this|that) (figure|number|reading|estimate|data)\b|\bis (this|the figure|the number|it) (up to date|current|live|real[- ]?time)\b|\bwhen was (it|this|the figure|the number) (checked|updated|read)\b|\blast (checked|updated)\b|\bhow up to date\b/.test(ql)) {
      var d = Math.max(0, Math.floor((Date.now() - Date.parse(L.checked)) / DAY));
      return { text: 'The latest reading is the Forbes estimate for ' + U.longDate(L.as_of) + ', checked on ' + U.longDate(L.checked) + ': ' + (d === 0 ? 'today' : d === 1 ? 'one day ago' : d + ' days ago') + '. It is a dated reading, not a live figure.',
        links: [U.linkOf('./sources.html', 'The sources'), U.linkOf('./history.html', 'Every dated reading')], note: U.NOTE_CALC };
    }
    /* distance from a trillion */
    if (/\btrillion\b/.test(ql) && /\b(how (far|much)|distance|short of|away from|above|over|below|under)\b/.test(ql) && !/\bstill\b|\btrillionaire\b/.test(ql)) {
      var gap = L.v - 1e12;
      return { text: U.money(Math.abs(gap)) + ' ' + (gap >= 0 ? 'above' : 'below') + ' $1 trillion on the latest reading, ' + U.longDate(L.as_of) + ': ' + U.money(L.v) + ' \u2212 $1 trillion.',
        links: [U.linkOf('./history.html', 'Every dated reading')], note: U.NOTE_CALC };
    }
    /* a company's age */
    var am = /\bhow old is\s+(.+)|\bage of\s+(.+)|\bhow long has\s+(.+?)\s+(?:existed|been around)/.exec(ql);
    if (am) {
      var ent = U.resolveEnt(am[1] || am[2] || am[3], 'companies');
      if (ent) {
        var c = ent.e;
        if (!c.y) return { text: 'The board has no founding year for ' + c.n + ' from a source this site accepts, so there is no age to work out.', links: [U.linkOf(c.u, c.n)], note: U.NOTE_CALC };
        return { text: c.n + ' was founded in ' + c.y + ' ' + c.mk + ', ' + (U.YEAR - c.y) + ' years ago: ' + U.YEAR + ' \u2212 ' + c.y + '.', links: [U.linkOf(c.u, c.n)], note: U.NOTE_CALC };
      }
    }
    /* a private stake's value, only where the board carries both numbers */
    var sv = /\b(?:value of|worth of)\s+(?:his\s+)?(.+?)\s+stake\b|\b(.+?)\s+stake\s+(?:is\s+)?worth\b|\bhow much is (?:his\s+)?(.+?)\s+stake\s+worth\b/.exec(ql);
    if (sv) {
      var ce = U.resolveEnt(sv[1] || sv[2] || sv[3], 'companies');
      if (ce) {
        var cc = ce.e, st = cc.facts.filter(function (f) { return f.key === 'stake_pct'; })[0], va = cc.facts.filter(function (f) { return f.key === 'valuation'; })[0];
        if (st && va) {
          return { text: 'About ' + U.money(st.num / 100 * va.num * 1e9) + ': ' + st.num + '% ' + st.mark + ' \u00d7 ' + U.money(va.num * 1e9) + ' ' + va.mark + ', both from the ' + st.src + ', ' + U.longDate(st.date) + '. A rough product of two estimates, not a figure Forbes states.', links: [U.linkOf(cc.u, cc.n)], note: U.NOTE_CALC };
        }
        return { text: 'The board has no dated valuation for ' + cc.n + ' to multiply a stake by. The figure itself, ' + U.money(L.v) + ' for ' + U.longDate(L.as_of) + ', is Forbes\u2019s estimate across everything he holds.', links: [U.linkOf(cc.u, cc.n), U.linkOf('./sources.html', 'The sources')], note: U.NOTE_CALC };
      }
    }
    return null;
  } });
})();

/* Elon, the markets (pri 15). Gold, bitcoin and dollars; the latest closing share prices; our own estimate at those
   closes; the trajectory scenarios; and the advertising rates. All from the record, all dated, all with their working.
   Elon still never quotes a live price: live prices belong to the banner and Calculate now. Scenarios are labelled
   scenarios, never forecasts. */
(function () {
  var S = window.ELON; if (!S || !S.DATA || !S.DATA.prices || !S.DATA.stores) return;
  var U = S.u, D = S.DATA, P = D.prices, ST = D.stores, PA = D.partner;
  var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function n0(v) { return Math.round(v).toLocaleString('en-GB'); }
  function usd(v, d) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function big(n) {
    if (n >= 1e12) { var t = n / 1e12; return '$' + (t >= 100 ? t.toFixed(0) : t >= 10 ? t.toFixed(1) : t.toFixed(2)) + ' trillion'; }
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e11 ? 0 : 1) + ' billion';
    return usd(n);
  }
  function signed(n) { return (n < 0 ? '−' : '+') + big(Math.abs(n)).replace('$', '$'); }
  function closeOf(sym, date) { for (var i = P.closes.length - 1; i >= 0; i--) if ((!date || P.closes[i].date === date) && typeof P.closes[i][sym] === 'number') return P.closes[i]; return null; }
  function latestClose() { return P.closes[P.closes.length - 1]; }
  function units(h) { return h.shares + (h.options || 0); }
  function estimate() {
    var last = latestClose(), base = closeOf('TSLA', P.base.date), lines = P.holdings.map(function (h) {
      return { h: h, delta: Math.round(units(h) * (last[h.symbol] - base[h.symbol])), price: last[h.symbol] };
    });
    return { v: D.latest.v + lines.reduce(function (a, l) { return a + l.delta; }, 0), lines: lines, date: last.date };
  }
  /* an amount the person typed, only when it is clearly money: "$5 billion", "2 trillion dollars" */
  function typedAmount(q) {
    var m = /\$\s*(\d[\d,]*(?:\.\d+)?)\s*(trillion|tn|billion|bn|million|mn|m|k)?\b|(\d[\d,]*(?:\.\d+)?)\s*(trillion|billion|million)\b/i.exec(q);
    if (!m) return null;
    var v = parseFloat((m[1] || m[3]).replace(/,/g, '')), u = (m[2] || m[4] || '').toLowerCase();
    v *= /^(trillion|tn)$/.test(u) ? 1e12 : /^(billion|bn)$/.test(u) ? 1e9 : /^(million|mn|m)$/.test(u) ? 1e6 : /^k$/.test(u) ? 1e3 : 1;
    return isFinite(v) && v > 0 ? v : null;
  }
  function onWhat(amt) { return amt ? '' : ', on the Forbes estimate for ' + U.longDate(D.latest.as_of) + ' ≈'; }
  function LINK(code) { return { t: 'Show the number in ' + (code === 'GOLD' ? 'ounces of gold' : code === 'BTC' ? 'bitcoin' : code === 'ETH' ? 'ether' : 'dollars'), u: './?cur=' + code + '#number' }; }
  S.register({ name: 'markets', pri: 15, try: function (q) {
    var ql = q.toLowerCase().replace(/[’']/g, '');
    /* advertising first, so "100 BTC" there is never read as bitcoin */
    if (/\b(advertis\w*|sponsor\w*|partnership|ad spot|ad space|ads?|banner spot|placement|forever spot|forever deal|forever partner)\b/.test(ql) &&
        (/\b(price|prices|cost|costs|how much|rate|rates|fee|buy|book|forever|btc|pay|charge)\b/.test(ql) || /\bforever\b/.test(ql))) {
      return { text: 'Advertising on this site is ' + PA.month + ' BTC a month or ' + PA.year + ' BTC for twelve months for the headline band under the number, or ' + PA.forever +
        ' BTC once to be the only brand on the site for as long as it is published, with a second banner across the top of the home page. All asking prices; every booking is labelled Sponsored and agreed in a written contract before any payment.' + (PA.telegram ? ' To book: ' + PA.telegram_how.charAt(0).toLowerCase() + PA.telegram_how.slice(1) : ''),
        links: (PA.telegram ? [{ t: 'Join the Telegram channel', u: PA.telegram }] : []).concat([{ t: 'The forever partnership', u: PA.forever_url }, { t: 'All booking terms', u: PA.url }]), note: U.NOTE };
    }
    var amt = typedAmount(q), base = amt || D.latest.v;
    /* gold, in troy ounces, grams, kilograms or tonnes */
    if (/\bgold\b|\bbullion\b|\bounces?\b|\boz\b|\btroy\b/.test(ql)) {
      var g = ST.gold, oz = base / g.usd, grams = oz * g.grams_per_unit, kg = grams / 1000, t = kg / 1000;
      var lead = /\btonnes?|tons?\b/.test(ql) ? n0(t) + ' tonnes of gold (' + n0(oz) + ' troy ounces)' :
        /\bkilo(gram)?s?\b|\bkg\b/.test(ql) ? n0(kg) + ' kilograms of gold (' + n0(oz) + ' troy ounces)' :
        /\bgrams?\b/.test(ql) ? n0(grams) + ' grams of gold' : n0(oz) + ' troy ounces of gold, about ' + n0(t) + ' tonnes';
      return { text: 'That is ' + lead + '. Worked as ' + U.money(base) + ' ÷ ' + usd(g.usd) + ' a troy ounce, the gold price at ' + g.time + ' on ' + U.longDate(g.as_of) + ' ≈ (' + g.source.name.split(',')[0] + ')' + onWhat(amt) + '. One troy ounce is ' + g.grams_per_unit + ' grams.',
        links: [LINK('GOLD'), { t: g.source.name, u: g.source.url }], note: U.NOTE_CALC };
    }
    /* bitcoin, in coins or satoshis */
    if (/\bbitcoins?\b|\bbtc\b|\bsats?\b|\bsatoshis?\b/.test(ql)) {
      var b = ST.bitcoin, coins = base / b.usd, cap = b.supply_cap, share = coins / cap;
      var head = /\bsats?\b|\bsatoshis?\b/.test(ql) ? 'In satoshis that is ' + n0(coins * 1e8) + ' (' + n0(coins) + ' bitcoin)' : 'In bitcoin that is ' + n0(coins) + ' BTC';
      var capW = cap % 1e6 === 0 ? (cap / 1e6) + ' million' : n0(cap);
      var ofCap = share >= 1 ? ', more than all ' + capW + ' bitcoin that will ever exist' : ', about ' + Math.round(share * 100) + '% of the ' + capW + ' that will ever exist';
      return { text: head + ofCap + '. Worked as ' + U.money(base) + ' ÷ ' + usd(b.usd, 2) + ' a bitcoin, the price at ' + b.time + ' on ' + U.longDate(b.as_of) + ' ≈ (' + b.source.name.split(',')[0] + ')' + onWhat(amt) + '.',
        links: [LINK('BTC'), { t: b.source.name, u: b.source.url }], note: U.NOTE_CALC };
    }
    /* ether: in coins, and how much of all the ether there is it would buy, on paper */
    if (/\bether(eum)?\b|\beth\b|\bgwei\b|\bvitalik\b/.test(ql) && ST.ethereum) {
      var e = ST.ethereum, eth = base / e.usd, all = e.supply * e.usd, times = base / all;
      var line = times >= 1 ? '. The funny part: on paper he could own all ' + (e.supply / 1e6).toFixed(1) + ' million ether in existence ' + times.toFixed(1) + ' times over' : ', about ' + Math.round(times * 100) + '% of all ' + (e.supply / 1e6).toFixed(1) + ' million ether in existence';
      return { text: 'In ether that is ' + n0(eth) + ' ETH' + line + '. Worked as ' + U.money(base) + ' \u00f7 ' + usd(e.usd, 2) + ' an ether, the price at ' + e.time + ' on ' + U.longDate(e.as_of) + ' \u2248 (' + e.source.name.split(',')[0] + '), and ' + n0(e.supply) + ' ether in circulation on ' + U.longDate(e.supply_as_of) + ' \u2248 (' + e.supply_source.name.split(',')[0] + ')' + onWhat(amt) + '. In practice, buying that much would move the price long before he finished.',
        links: [LINK('ETH'), { t: e.source.name, u: e.source.url }, { t: e.supply_source.name, u: e.supply_source.url }], note: U.NOTE_CALC };
    }
    /* dollars: the site's own currency */
    if (/\b(in|into|to) (us |american )?dollars?\b|\busd\b/.test(ql) && !/\b(canadian|australian)\b/.test(ql)) {
      return { text: 'In US dollars it is ' + U.money(D.latest.v) + ', the Forbes estimate for ' + U.longDate(D.latest.as_of) + ' ≈, rounded to ' + D.latest.rounding + '. Forbes reports in dollars, so this is the figure before any conversion.', links: [LINK('USD')], note: U.NOTE };
    }
    var tsla = /\btesla\b|\btsla\b/.test(ql), spcx = /\bspacex\b|\bspcx\b|\bspace x\b/.test(ql);
    /* the latest closing share prices */
    if (/\b(share|stock)s?\s+price|\bprice of (a |one )?(tesla|spacex|tsla|spcx)|\bclosed? at\b|\bclosing price|\btrading at\b|\bticker\b|\bshare price|\blive price|\bstock (today|right now|now)\b/.test(ql) || ((tsla || spcx) && (/\b(price|stock|shares) (now|today)\b|\b(stock|share) (cost|worth)\b|\bhow much is (a |one )?(tesla|spacex|tsla|spcx) (stock|share)s?\b/.test(ql) || /\b(tesla|spacex|tsla|spcx) (stock|share)s?\b/.test(ql) && /\bhow much|\bwhat is|\bprice|\bcost/.test(ql)))) {
      var c = latestClose(), src = 'Stock Analysis';
      var parts = [];
      if (tsla || !spcx) parts.push('Tesla closed at ' + usd(c.TSLA, 2));
      if (spcx || !tsla) parts.push((parts.length ? 'SpaceX at ' : 'SpaceX closed at ') + usd(c.SPCX, 2));
      return { text: parts.join(' and ') + ' on ' + U.longDate(c.date) + ' ≈ (' + src + '). Elon only quotes dated closes; the banner on the home page carries the latest price, and Calculate now uses it.',
        links: [{ t: 'The price banner and Calculate now', u: './#number' }, { t: 'How Calculate now works', u: './#own-count' }], note: U.NOTE };
    }
    /* our own estimate at the latest closes */
    if (!/\bhow (does|do|is)\b|\bexplain\b|\bwhy\b/.test(ql) && /\b(our|your|the sites?|sites) (own )?(estimate|count|calculation|figure)\b|\bestimate (today|now)\b|\bworth (right )?now\b|\bcalculated? (figure|estimate|net worth)\b|\blive (figure|estimate|net worth)\b/.test(ql)) {
      var e = estimate(), tl = e.lines.filter(function (l) { return l.h.symbol === 'TSLA'; })[0], sl = e.lines.filter(function (l) { return l.h.symbol === 'SPCX'; })[0];
      return { text: 'Our estimate at the closing prices on ' + U.longDate(e.date) + ' is ' + usd(e.v) + ': the Forbes reading of ' + U.money(D.latest.v) + ' for ' + U.longDate(D.latest.as_of) + ', ' + signed(tl.delta) + ' for Tesla and ' + signed(sl.delta) +
        ' for SpaceX since that day’s close, from the shares in his SEC filings ✓. Press Calculate now on the home page for current prices; it says which prices it used.',
        links: [{ t: 'Calculate now', u: './#number' }, { t: 'How it is worked out', u: './#own-count' }], note: U.NOTE_CALC };
    }
    /* the trajectory scenarios */
    var named = P.scenarios.filter(function (c) { return new RegExp('\\b' + c.id + '\\b').test(ql); });
    var yr = /\bin (20[3-9]\d)\b|\bby (20[3-9]\d)\b/.exec(ql), ny = /\b(?:in|over|after) (\d{1,2}|five|ten|fifteen|twenty|thirty) years?\b/.exec(ql);
    var wordsN = { five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30 };
    var asksFuture = /\b(trajectory|scenarios?|projection|project|forecast|predict\w*|future|will he be worth|would he be worth|could he be worth|be worth in|worth by|next year)\b|\bwhere (could|will|might) (his )?(fortune|wealth|net worth|it) go\b|\bwhat will (he|elon|musk|his net worth|it) be\b|\bwill (he|elon|musk) (be|become|stay|ever|still)\b/.test(ql);
    if (named.length || ((yr || ny) && /\b(worth|net worth|fortune|wealth|rich)\b/.test(ql)) || asksFuture) {
      var start = new Date(P.checked_on + 'T12:00:00Z'), y0 = start.getUTCFullYear(), m0 = start.getUTCMonth();
      var years = yr ? (+(yr[1] || yr[2]) - y0) : ny ? (+(wordsN[ny[1]] || ny[1])) : /\bnext year\b/.test(ql) ? 1 : 10;
      if (!(years >= 1 && years <= 30)) years = 10;
      var e2 = estimate(), last = latestClose(), other = e2.v - P.holdings.reduce(function (a, h) { return a + units(h) * last[h.symbol]; }, 0);
      if (other < 0) other = 0;
      var run = function (c) {
        var tp = last.TSLA * Math.pow(1 + c.TSLA, years), sp = last.SPCX * Math.pow(1 + c.SPCX, years), ht = P.holdings[0].symbol === 'TSLA' ? P.holdings[0] : P.holdings[1], hs = ht === P.holdings[0] ? P.holdings[1] : P.holdings[0];
        return { net: other + units(ht) * tp + units(hs) * sp, spcxCo: sp * hs.outstanding, tslaCo: tp * ht.outstanding };
      };
      var when = MON[m0] + ' ' + (y0 + years), pct = function (r) { return (r < 0 ? '−' : '+') + Math.round(Math.abs(r) * 100) + '%'; };
      var lead = /\bforecast|\bpredict|\bwill (he|elon|musk|his net worth|it)\b|\bnext year\b/.test(ql) ? 'Elon does not forecast, but the site has scenarios. ' : '';
      var text;
      if (named.length === 1) {
        var c = named[0], r = run(c);
        text = lead + 'On the ' + c.name + ' case, SpaceX shares ' + pct(c.SPCX) + ' and Tesla ' + pct(c.TSLA) + ' a year, he would be worth about ' + big(r.net) + ' by ' + when + '. At those prices SpaceX would be worth ' + big(r.spcxCo) + ' as a company and Tesla ' + big(r.tslaCo) + '.';
      } else {
        text = lead + 'By ' + when + ': ' + P.scenarios.map(function (c) { return c.name + ' about ' + big(run(c).net); }).join(', ') + '.';
      }
      text += ' A scenario, not a forecast: share prices grow at a steady yearly rate from our estimate today, and everything else he owns is held at today’s value.';
      return { text: text, links: [{ t: 'Open the trajectory simulator', u: './trajectory.html' }], note: U.NOTE_CALC };
    }
    return null;
  } });
})();
