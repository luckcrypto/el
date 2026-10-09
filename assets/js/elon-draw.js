/* Elon, the charts (pri 25). "chart the readings" draws a bar per dated reading, never a line between them,
   because nothing is known between readings. Also his stakes by source, and the companies by age. Bars to one
   scale; the chart's background is a literal colour in each theme, set in site.css. */
'use strict';
(function () {
  var S = window.ELON; if (!S || !S.DATA) return;
  var U = S.u, D = S.DATA;
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shortDate(iso) { var p = iso.split('-'); return (+p[2]) + ' ' + SHORT[+p[1] - 1]; }
  function abbr(n) { return n.replace('The Boring Company', 'Boring Co.'); }
  function srcTag(s) { var y = s.date.slice(0, 4), m = +s.date.slice(5, 7); return s.mk === '\u2713' ? 'SEC' : 'Forbes ' + (y === String(U.YEAR) ? SHORT[m - 1] : '\u2019' + y.slice(2)); }
  function bars(rows, label) {
    var W = 340, LX = 164, BW = 106, RH = 24, H = rows.length * RH + 16, max = Math.max.apply(null, rows.map(function (r) { return r.v; }));
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + U.esc(label) + '"><rect class="ec-bg" x="0" y="0" width="' + W + '" height="' + H + '"/>';
    rows.forEach(function (r, i) {
      var y = 10 + i * RH, bw = Math.max(2, Math.round(r.v / max * BW));
      svg += '<text class="ec-label" x="' + (LX - 6) + '" y="' + (y + 13) + '" text-anchor="end">' + U.esc(r.n) + '</text>' +
        '<rect class="' + (r.hi ? 'ec-bar ec-hi' : 'ec-bar') + '" x="' + LX + '" y="' + (y + 3) + '" width="' + bw + '" height="13"/>' +
        '<text class="ec-value" x="' + (LX + bw + 5) + '" y="' + (y + 13) + '">' + U.esc(r.t) + '</text>';
    });
    return svg + '</svg>';
  }
  S.register({ name: 'draw', pri: 25, try: function (q) {
    var m = /^\s*(?:chart|graph|plot|draw)\s+(?:the\s+|his\s+)?(readings?|net worth|fortune|estimates?|stakes?|companies|ages?)\b/i.exec(q);
    if (!m) return null;
    var k = m[1].toLowerCase();
    if (/^(readings?|net worth|fortune|estimates?)$/.test(k)) {
      var rs = D.readings.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var rows = rs.map(function (r, i) { return { n: shortDate(r.date), v: r.v, t: '$' + (r.v / 1e9).toLocaleString('en-GB', { maximumFractionDigits: 1 }) + 'bn', hi: i === rs.length - 1 }; });
      return { text: 'Charted: ' + rs.length + ' Forbes readings, one bar each, oldest at the top. Bars, never a line: nothing is known between two readings.', svg: bars(rows, 'Forbes readings of his net worth, by date'), links: [U.linkOf('./history.html', 'Every dated reading')], note: U.NOTE_CALC };
    }
    if (/^stakes?$/.test(k)) {
      var ss = D.stakes.slice().sort(function (a, b) { return b.pct - a.pct; });
      var rows2 = ss.map(function (s) { return { n: abbr(s.company) + ' ' + srcTag(s), v: s.pct, t: U.fnum(s.pct) + '% ' + s.mk }; });
      return { text: 'Charted: ' + ss.length + ' stake figures from the board, largest first, each labelled with its source. Where a company has more than one bar, the sources differ.', svg: bars(rows2, 'His stakes by company and source'), links: [U.linkOf('./companies.html', 'The companies board')], note: U.NOTE_CALC };
    }
    var cs = D.companies.filter(function (c) { return c.y; }).sort(function (a, b) { return a.y - b.y; });
    var rows3 = cs.map(function (c) { return { n: abbr(c.n), v: U.YEAR - c.y, t: (U.YEAR - c.y) + ' yrs' }; });
    return { text: 'Charted: ' + cs.length + ' companies by age this year, oldest at the top. Companies with no sourced founding year are left off.', svg: bars(rows3, 'Companies by age'), links: [U.linkOf('./companies.html', 'The companies board')], note: U.NOTE_CALC };
  } });
})();
