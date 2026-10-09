/* Elon, the analyst (pri 40). Everything here is counted, sorted or compared at the moment of asking, from
   ELON_DATA: counts on exact nouns only, the companies by group, superlatives and rankings, averages that keep
   their decimal, two-way and N-way comparisons of companies with every source for a disputed stake, and the
   yes-or-no questions the record can settle (still a trillionaire, older than). */
'use strict';
(function () {
  var S = window.ELON; if (!S || !S.DATA) return;
  var U = S.u, D = S.DATA;
  var GROUP = { listed: 'listed', 'inside-spacex': 'inside SpaceX', private: 'private', former: 'no longer his' };
  var KIND = { listed: 'a listed company', 'inside-spacex': 'a company inside SpaceX, not listed separately', private: 'a private company', former: 'no longer his' };
  function ll(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function lc(s) { return /^(About|Up to|Closed|Chairman|Chief|Stepped|Acquired|Released|Approved|Removed|Part|To|An|A|Sold)\b/.test(s) ? ll(s) : s; }
  function stakes(c) { return c.facts.filter(function (f) { return f.key === 'stake_pct'; }).sort(function (a, b) { return (a.mark === '\u2713' ? 0 : 1) - (b.mark === '\u2713' ? 0 : 1) || (a.date < b.date ? 1 : -1); }); }
  function srcLine(f) { return lc(f.text) + ' ' + f.mark + ' (' + f.src + ', ' + U.longDate(f.date) + ')'; }
  function fact(c, keys) { for (var i = 0; i < keys.length; i++) { var f = c.facts.filter(function (x) { return x.key === keys[i]; })[0]; if (f) return f; } return null; }
  function card(c) {
    var parts = [], st = stakes(c), role = fact(c, ['role', 'joined']), owner = fact(c, ['acquired', 'owner', 'sold']);
    parts.push(c.y ? 'founded ' + c.y + ' ' + c.mk : GROUP[c.group]);
    if (st.length) parts.push('his stake ' + st.map(srcLine).join('; '));
    if (role) parts.push(role.text.charAt(0).toLowerCase() + role.text.slice(1));
    if (!st.length && owner) parts.push(owner.text.charAt(0).toLowerCase() + owner.text.slice(1));
    return '<b>' + U.esc(c.n) + '</b>: ' + parts.join('; ');
  }
  function list(group) { return D.companies.filter(function (c) { return c.group === group; }); }
  function names(arr) { var n = arr.map(function (c) { return c.n; }); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0]; }
  var BOARD = function () { return U.linkOf('./companies.html', 'The companies board'); };
  S.register({ name: 'data', pri: 40, try: function (q) {
    var ql = q.toLowerCase(), L = D.latest;
    /* still a trillionaire, or a billionaire */
    if (/\b(trillionaire|billionaire)\b/.test(ql) && /\b(is|was|still|am|are|became|become|now)\b/.test(ql) && !/\b(first|when|how far|how much)\b/.test(ql)) {
      var tri = /trillionaire/.test(ql), yes = tri ? L.v >= 1e12 : L.v >= 1e9;
      return { text: (yes ? 'Yes' : 'No') + '. The latest Forbes reading in this record is ' + U.money(L.v) + ' for ' + U.longDate(L.as_of) + ', ' + (tri ? (yes ? 'above' : 'below') + ' $1 trillion. ' + D.first_trillion : 'well above $1 billion.'),
        links: [U.linkOf('./history.html', 'Every dated reading'), U.linkOf('./sources.html', 'The sources')], note: U.NOTE_CALC };
    }
    /* his stake or voting power in a named company */
    var stakeQ = /\b(stakes?|own|owns|owned|share of|how much of|percent|per cent|holding)\b/.test(ql), voteQ = /\b(vote|votes|voting|control|controls)\b/.test(ql);
    if ((stakeQ || voteQ) && !/\b(worth|value|valuation|shares)\b/.test(ql)) {
      var se = U.resolveEnt(q, 'companies');
      if (se) {
        var sc = se.e, sl = [U.linkOf(sc.u, sc.n)].concat(sc.orrery ? [{ t: 'Show ' + sc.n + ' in the Orrery', u: './#body-' + sc.orrery }] : []);
        var vf = sc.facts.filter(function (f) { return /^voting/.test(f.key); });
        if (voteQ && vf.length) return { text: sc.n + ', his voting power: ' + vf.map(function (f) { return ll(f.label) + ' ' + srcLine(f); }).join('; ') + '.', links: sl };
        var ss = stakes(sc);
        if (ss.length) return { text: sc.n + (ss.length > 1 ? ': sources differ on his stake. ' : ': his stake is ') + ss.map(srcLine).join('; ') + '.' + (vf.length ? ' His voting power is on the companies board too.' : ''), links: sl };
        var sb = fact(sc, ['stake_before']), ow = fact(sc, ['owner', 'acquired']);
        if (sb) return { text: sc.n + ': ' + (ow ? lc(ow.text) + ' ' + ow.mark + '. ' : '') + 'His stake before the deal: ' + srcLine(sb) + '.', links: sl };
        if (sc.group === 'former') { var lf = sc.facts[sc.facts.length - 1]; return { text: sc.n + ' is listed on the board as no longer his. ' + lf.label + ': ' + srcLine(lf) + '.', links: sl }; }
      }
    }
    /* where the figure comes from */
    if (/\bwhere (does|did|is) (the |this |that )?(figure|number|net worth|data|estimate|reading)\b.*\b(come|from|sourced)\b|\bwhere (does|did) .*\bcome from\b|\bsource of (the |this )?(figure|number|estimate)\b|\bwho (says|reports|publishes|estimates|calculates) (the |this )?(figure|number|net worth|estimate)\b|\bhow (is|was) (the |this )?(figure|number|net worth|estimate) (calculated|worked out|made|measured)\b/.test(ql)) {
      return { text: 'From ' + L.source + ', which we read on ' + U.longDate(L.checked) + ': ' + U.money(L.v) + ' for ' + U.longDate(L.as_of) + ', rounded to ' + L.rounding + '. We do not calculate it ourselves; the sources page says exactly how it was read.', links: [U.linkOf('./sources.html', 'The sources'), U.linkOf('./methodology.html', 'Methodology')] };
    }
    /* a company's value, and which of two is bigger */
    function vfacts(c) { return c.facts.filter(function (f) { return (f.key === 'valuation' || f.key === 'first_day') && f.num; }); }
    function vline(f) { return ll(f.label) + ', ' + lc(f.text) + ' ' + f.mark + ' (' + f.src + ', ' + U.longDate(f.date) + ')'; }
    var big = /^\s*(?:is|are|was)\s+(.+?)\s+(?:bigger|larger|more valuable|worth more|more valued)\s+than\s+(.+?)[\s?!.]*$/i.exec(q);
    if (big) {
      var ba = U.resolveEnt(big[1], 'companies'), bb = U.resolveEnt(big[2], 'companies');
      if (ba && bb && ba.e.n !== bb.e.n) {
        var va = vfacts(ba.e)[0], vb = vfacts(bb.e)[0], lk = [U.linkOf(ba.e.u, ba.e.n), U.linkOf(bb.e.u, bb.e.n)];
        if (va && vb) {
          var hi = va.num >= vb.num ? [ba.e, va] : [bb.e, vb], lo = hi[0] === ba.e ? [bb.e, vb] : [ba.e, va];
          return { text: 'On the dated values the board holds, ' + hi[0].n + ' is bigger: ' + vline(hi[1]) + ', against ' + lo[0].n + ': ' + vline(lo[1]) + '. Different dates and sources, so this is not a like-for-like comparison.', links: lk, note: U.NOTE_CALC };
        }
        if (va || vb) {
          var has = va ? ba.e : bb.e, lacks = va ? bb.e : ba.e, hf = va || vb;
          return { text: 'The board has a dated value for ' + has.n + ' but none for ' + lacks.n + ', so it cannot compare them. ' + has.n + ': ' + vline(hf) + '. Market values move with the share price, and live prices are not in this record.', links: lk };
        }
        return { text: 'The board has no dated value for ' + ba.e.n + ' or ' + bb.e.n + ', so it cannot compare them. Market values move with the share price, and live prices are not in this record.', links: lk };
      }
    }
    if (/\b(worth|valuation|valued|market value|market cap|market capitali[sz]ation|how valuable|how big is)\b/.test(ql) && !/\b(stake|stakes|net worth|his net)\b/.test(ql)) {
      var ve = U.resolveEnt(q, 'companies');
      if (ve) {
        var vc = ve.e, vf = vfacts(vc);
        if (vf.length) return { text: vc.n + ': ' + vf.map(vline).join('; ') + '. A dated point, not a live market value.', links: [U.linkOf(vc.u, vc.n)] };
        return { text: 'The board has no dated value for ' + vc.n + '. ' + (vc.group === 'listed' ? 'Its market value moves with the share price, and live prices are not in this record.' : 'Private companies publish no price, and nothing on the board is a source for one.'), links: [U.linkOf(vc.u, vc.n), U.linkOf('./#prices', 'Share prices')] };
      }
    }
    /* is a company listed or private */
    var pu = /^\s*(?:is|was|are)\s+(.+?)\s+(public|publicly traded|listed|private|privately held)\s*[?!.]*$/i.exec(q);
    if (pu) {
      var pe = U.resolveEnt(pu[1], 'companies');
      if (pe) {
        var pc = pe.e, lf2 = fact(pc, ['listed']);
        return { text: pc.n + ' is on the board as ' + KIND[pc.group] + (lf2 ? ': ' + lc(lf2.text) + ' ' + lf2.mark + ' (' + lf2.src + ', ' + U.longDate(lf2.date) + ')' : '') + '.', links: [U.linkOf(pc.u, pc.n)] };
      }
    }
    /* is one company part of another */
    var po = /^\s*(?:is|was|are)\s+(.+?)\s+(?:part of|inside|owned by|a subsidiary of|run by|under)\s+(.+?)[\s?!.]*$/i.exec(q);
    if (po) {
      var pa = U.resolveEnt(po[1], 'companies'), pb = U.resolveEnt(po[2], 'companies');
      if (pa && pb && pa.e.n !== pb.e.n) {
        var chain = [], cur = pa.e, lk2 = [U.linkOf(pa.e.u, pa.e.n), U.linkOf(pb.e.u, pb.e.n)];
        while (cur && cur.parent && chain.length < 4) { var pid = cur.parent; cur = D.companies.filter(function (c2) { return c2.id === pid; })[0]; if (cur) chain.push(cur); }
        if (chain.some(function (c3) { return c3.id === pb.e.id; })) {
          var of = fact(pa.e, ['owner', 'acquired']);
          return { text: 'Yes. ' + pa.e.n + ' is inside ' + pb.e.n + (chain.length > 1 ? ', through ' + chain.slice(0, -1).map(function (c4) { return c4.n; }).join(' and ') : '') + (of ? ': ' + lc(of.text) + ' ' + of.mark + ' (' + of.src + ', ' + U.longDate(of.date) + ')' : '') + '.', links: lk2 };
        }
        var up = [], cb = pb.e;
        while (cb && cb.parent && up.length < 4) { var qid = cb.parent; cb = D.companies.filter(function (c7) { return c7.id === qid; })[0]; if (cb) up.push(cb); }
        if (up.some(function (c8) { return c8.id === pa.e.id; })) return { text: 'No, the other way round: ' + pb.e.n + ' is inside ' + pa.e.n + '. The board lists ' + pa.e.n + ' as ' + KIND[pa.e.group] + '.', links: lk2 };
        return { text: 'The board does not show ' + pa.e.n + ' as part of ' + pb.e.n + '. It lists ' + pa.e.n + ' as ' + KIND[pa.e.group] + '.', links: lk2 };
      }
    }
    /* companies he sold */
    if (/\b(sold|sell|sale|exited)\b/.test(ql) && /\b(compan\w*|business\w*)\b/.test(ql)) {
      var sold = D.companies.map(function (c5) { return [c5, fact(c5, ['sold'])]; }).filter(function (x) { return x[1]; });
      if (sold.length) return { text: 'Sold: ' + sold.map(function (x) { return x[0].n + ' (' + lc(x[1].text) + ' ' + x[1].mark + ')'; }).join('; ') + '. Sources and dates are on the companies board.', links: [BOARD()] };
    }
    /* the figure itself */
    if (/\b(worth|net worth|rich|richest|fortune|wealth|wealthy|money|cash)\b/.test(ql) && !/\b(stake|stakes|value of|valuation|valued|will|would|average|mean|total|chart|graph|plot|top|highest|lowest|largest|smallest|change|changed|since|history|readings?|estimates?|trillion|rupees?|pounds?|euros?|dirhams?|yen|yuan|bigger|larger)\b/.test(ql) && !U.resolveEnt(q, 'companies')) {
      return { text: 'Forbes put Elon Musk\u2019s net worth at ' + U.money(L.v) + ' on ' + U.longDate(L.as_of) + ', rounded to ' + L.rounding + '. It is a dated estimate, not a live figure.' + (/\b(money|cash)\b/.test(ql) ? ' Most of it is shares in his companies, not cash in a bank.' : ''), links: [U.linkOf('./#number', 'The figure'), U.linkOf('./sources.html', 'The sources'), U.linkOf('./history.html', 'Every dated reading')] };
    }
    /* counts on exact nouns */
    var hm = /how many\s+(?:tesla\s+)?(\w+)/.exec(ql);
    if (hm) {
      var w = hm[1];
      if (/^(companies|businesses|firms)$/.test(w)) return { text: D.companies.length + ' companies are on the board: ' + (D.companies.length - list('former').length) + ' he runs or holds a stake in, and ' + list('former').length + ' that are no longer his. Counted from the board just now.', links: [BOARD()], note: U.NOTE_CALC };
      if (/^(readings|estimates)$/.test(w)) return { text: D.readings.length + ' Forbes readings are in the record, from ' + U.longDate(D.readings[D.readings.length - 1].date) + ' to ' + U.longDate(D.readings[0].date) + '.', links: [U.linkOf('./history.html', 'Every dated reading')], note: U.NOTE_CALC };
      if (/^sources$/.test(w)) return { text: D.sources + ' sources sit behind the ' + D.facts + ' facts on the companies board: filings, company statements and Forbes.', links: [BOARD()], note: U.NOTE_CALC };
      if (/^facts$/.test(w)) return { text: D.facts + ' facts are on the companies board, each with its source, date and mark.', links: [BOARD()], note: U.NOTE_CALC };
      if (/^pages$/.test(w)) return { text: 'This site is ' + D.pages + ' pages, every figure dated and sourced.', links: S.HUBS.slice(0, 2), note: U.NOTE_CALC };
      if (/^shares$/.test(w)) return holdings();
    }
    if (/\b(tesla shares|shares (does|did) (he|elon|musk)|shares (he|elon) (owns|holds))\b/.test(ql)) return holdings();
    function holdings() {
      return { text: 'From his SEC filings \u2713: ' + D.holdings.map(function (h) { return ll(h.n) + ', ' + U.fnum(h.shares) + (h.note ? ' (' + h.note + ')' : '') + ', filed ' + U.longDate(h.date); }).join('; ') + '.',
        links: [U.linkOf('./tesla-stake.html', 'The Tesla stake'), BOARD()], note: U.NOTE };
    }
    /* companies by group */
    if (/\b(private|unlisted)\b/.test(ql) && /\bcompan/.test(ql)) return { text: 'Private.<br>' + list('private').map(card).join('.<br>') + '.', links: [BOARD()] };
    if (/\b(listed|public|publicly traded)\b/.test(ql) && /\bcompan/.test(ql)) return { text: 'Listed.<br>' + list('listed').map(card).join('.<br>') + '.', links: [BOARD()] };
    if (/\b(no longer|used to|former|formerly|past|previous|exited|left)\b/.test(ql) && /\b(compan\w*|owns?|business\w*|his)\b/.test(ql)) return { text: 'No longer his: ' + list('former').map(function (c) { var f = c.facts[c.facts.length - 1]; return c.n + ' (' + f.text.charAt(0).toLowerCase() + f.text.slice(1) + ' ' + f.mark + ')'; }).join('; ') + '.', links: [BOARD()] };
    if (/\b(what|which) (companies|businesses|firms)\b|\bwhat does (he|elon|musk|elon musk) (own|run|control)\b|\b(companies|businesses) (does|did) (he|elon|musk|elon musk) (own|run|control)\b|\blist (his|the) companies\b|^\s*(his )?companies\s*[?!.]*\s*$/.test(ql)) {
      return { text: 'Listed: ' + names(list('listed')) + '. Inside SpaceX: ' + names(list('inside-spacex')) + '. Private: ' + names(list('private')) + '. No longer his: ' + names(list('former')) + '. Every fact about each is on the companies board with its source.', links: [BOARD(), U.linkOf('./#made-of', 'The Orrery')] };
    }
    /* yes or no: older than */
    var ym = /^\s*(?:is|was)\s+(.+?)\s+(older|younger|newer)\s+than\s+(.+?)[\s?!.]*$/i.exec(q);
    if (ym) {
      var a = U.resolveEnt(ym[1], 'companies'), b = U.resolveEnt(ym[3], 'companies');
      if (a && b && a.e.y && b.e.y && a.e.n !== b.e.n) {
        var older = /older/.test(ym[2]), yes2 = older ? a.e.y < b.e.y : a.e.y > b.e.y;
        if (a.e.y === b.e.y) return { text: 'Neither: both were founded in ' + a.e.y + '.', links: [U.linkOf(a.e.u, a.e.n), U.linkOf(b.e.u, b.e.n)], note: U.NOTE_CALC };
        return { text: (yes2 ? 'Yes' : 'No') + '. ' + a.e.n + ' was founded in ' + a.e.y + ' ' + a.e.mk + ' and ' + b.e.n + ' in ' + b.e.y + ' ' + b.e.mk + ', ' + Math.abs(a.e.y - b.e.y) + ' years apart.', links: [U.linkOf(a.e.u, a.e.n), U.linkOf(b.e.u, b.e.n)], note: U.NOTE_CALC };
      }
    }
    /* compare companies, two-way or N-way */
    if (/\bvs\.?\b|\bversus\b|\bcompare|\bcompared\b|\bdifference between\b/.test(ql)) {
      var parts = q.replace(/^\s*(compare|difference between)\s+/i, '').split(/\s+(?:vs\.?|versus|and|or|with|to)\s+|\s*,\s*/i), got = [];
      parts.forEach(function (p) { var e = U.resolveEnt(p, 'companies'); if (e && got.indexOf(e.e) === -1) got.push(e.e); });
      if (got.length === 2) {
        var o = got[0].y && got[1].y && got[0].y !== got[1].y ? (got[0].y < got[1].y ? got[0] : got[1]) : null;
        return { text: card(got[0]) + '.<br>' + card(got[1]) + '.' + (o ? '<br>' + o.n + ' is ' + Math.abs(got[0].y - got[1].y) + ' years older.' : ''),
          links: [U.linkOf(got[0].u, got[0].n), U.linkOf(got[1].u, got[1].n)].concat(got[0].orrery ? [{ t: 'Show them in the Orrery', u: './#made-of' }] : []), note: U.NOTE_CALC };
      }
      if (got.length >= 3) {
        var dated = got.filter(function (c) { return c.y; }).sort(function (x, y) { return x.y - y.y; });
        return { text: 'Oldest first: ' + dated.map(function (c, i) { return (i < 3 ? U.MEDS[i] : '') + c.n + ' ' + c.y + ' ' + c.mk; }).join(' \u00b7 ') + (dated.length < got.length ? '. No founding year on the board for ' + names(got.filter(function (c) { return !c.y; })) : '') + '. Stakes and roles are on each company\u2019s row.',
          links: got.slice(0, 3).map(function (c) { return U.linkOf(c.u, c.n); }), note: U.NOTE_CALC };
      }
    }
    /* superlatives and rankings */
    var which0 = /\b(compan|business|firms?)/.test(ql), sm0 = /\b(largest|biggest|smallest|highest|lowest)\b/.exec(ql);
    if (which0 && sm0 && !/\bstakes?\b|\breadings?\b/.test(ql)) {
      var vals = [];
      D.companies.forEach(function (c6) { var f6 = vfacts(c6)[0]; if (f6) vals.push([c6, f6]); });
      vals.sort(function (a, b) { return b[1].num - a[1].num; });
      return { text: 'The board does not rank companies by size. It holds dated values for some: ' + vals.map(function (x) { return x[0].n + ', ' + lc(x[1].text) + ' ' + x[1].mark + ' (' + x[1].src + ', ' + U.longDate(x[1].date) + ')'; }).join('; ') + '. Different dates and sources, so it is not a like-for-like ranking.', links: [BOARD()], note: U.NOTE_CALC };
    }
    var which = /\bstakes?\b/.test(ql) ? 'stakes' : /\b(readings?|estimates?|net worth|fortune)\b/.test(ql) ? 'readings' : /\b(compan|business|firms?)/.test(ql) ? 'companies' : null;
    var sm = /\b(oldest|newest|youngest|largest|biggest|smallest|highest|lowest|most recent|latest|first|earliest)\b/.exec(ql);
    var tm = /\b(?:top|rank|ranking|list)\s*(\d+)?\b/.exec(ql);
    if (which && (sm || tm)) {
      var pool, fmt, key;
      if (which === 'companies') { pool = D.companies.filter(function (c) { return c.y; }); key = 'y'; fmt = function (c) { return c.n + ', founded ' + c.y + ' ' + c.mk; }; }
      else if (which === 'stakes') { pool = D.stakes.slice(); key = 'pct'; fmt = function (s) { return s.company + ' ' + U.fnum(s.pct) + '% ' + s.mk + ' (' + s.src + ', ' + U.longDate(s.date) + ')'; }; }
      else { pool = D.readings.slice(); key = 'v'; fmt = function (r) { return U.money(r.v) + ' on ' + U.longDate(r.date) + ' \u2248'; }; }
      var w0 = sm ? sm[1] : '';
      if (which === 'readings' && /most recent|latest/.test(w0)) pool.sort(function (x, y) { return x.date < y.date ? 1 : -1; });
      else if (which === 'readings' && /first|earliest/.test(w0)) pool.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
      else if (which === 'companies') pool.sort(function (x, y) { return /newest|youngest|latest|most recent/.test(w0) ? y.y - x.y : x.y - y.y; });
      else pool.sort(function (x, y) { return /smallest|lowest/.test(w0) ? x[key] - y[key] : y[key] - x[key]; });
      if (tm && !sm) {
        var n = Math.min(parseInt(tm[1] || '5', 10), 7, pool.length);
        return { text: (which === 'companies' ? 'Oldest first: ' : 'Largest first: ') + pool.slice(0, n).map(function (x, i) { return (i < 3 ? U.MEDS[i] : (i + 1) + '. ') + fmt(x); }).join(' \u00b7 ') + '.', links: [which === 'readings' ? U.linkOf('./history.html', 'Every dated reading') : BOARD()], note: U.NOTE_CALC };
      }
      var champ = pool[0], ties = pool.filter(function (x) { return x[key] === champ[key]; });
      if (which === 'companies') S.state.lastEnt = { n: champ.n };
      return { text: U.MEDS[0] + ties.map(fmt).join(' and ') + (ties.length > 1 ? ', level' : '') + (pool[ties.length] ? ' \u00b7 next: ' + fmt(pool[ties.length]) : '') + '.', links: [which === 'readings' ? U.linkOf('./history.html', 'Every dated reading') : BOARD()], note: U.NOTE_CALC };
    }
    /* averages keep their decimal */
    if (/\b(average|mean)\b/.test(ql) && /\b(readings?|estimates?|net worth|fortune)\b/.test(ql)) {
      var sum = D.readings.reduce(function (s, r) { return s + r.v; }, 0), avg = sum / D.readings.length;
      return { text: 'Average of the ' + D.readings.length + ' Forbes readings in the record: $' + (avg / 1e9).toFixed(1) + ' billion, summed and divided just now. Four dates are not a trend; the history page shows each one.', links: [U.linkOf('./history.html', 'Every dated reading')], note: U.NOTE_CALC };
    }
    /* who owns a company */
    var wo = /\bwho (?:owns|controls|runs|bought)\s+(.+?)[\s?!.]*$/.exec(ql);
    if (wo && !/\b(this|the site|this site|you)\b/.test(wo[1])) {
      var oe = U.resolveEnt(wo[1], 'companies');
      if (oe) {
        var c2 = oe.e, own = fact(c2, ['owner', 'acquired', 'sold', 'merged', 'left']), st2 = stakes(c2);
        var text = own ? c2.n + ': ' + own.text.charAt(0).toLowerCase() + own.text.slice(1) + ' ' + own.mark + ' (' + own.src + ', ' + U.longDate(own.date) + ').' : c2.n + ': his stake is ' + st2.map(srcLine).join('; ') + '.';
        if (own && st2.length) text += ' His stake: ' + st2.map(srcLine).join('; ') + '.';
        return { text: text, links: [U.linkOf(c2.u, c2.n)] };
      }
    }
    return null;
  } });
})();
