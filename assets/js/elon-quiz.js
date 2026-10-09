/* Elon, the quiz (pri 30). "quiz me" starts a mode: questions made from ELON_DATA at ask-time, never written
   by hand, with a streak; every reveal carries the numbers and their marks. Answers are tokenised before
   matching. Anything that is not an answer is released to the other faculties; "stop" ends with the score. */
'use strict';
(function () {
  var S = window.ELON; if (!S || !S.DATA) return;
  var U = S.u, D = S.DATA;
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function gen(n, streak) {
    var tag = 'Quiz ' + n + (streak ? ' (streak ' + streak + ')' : '') + ': ';
    var dated = D.companies.filter(function (c) { return c.y; }), kind = ['first', 'year', 'reading', 'group'][n % 4];
    if (kind === 'first') { var A = pick(dated), B = A; while (B.y === A.y) B = pick(dated); return { kind: kind, A: A, B: B, text: tag + 'which was founded first, ' + A.n + ' or ' + B.n + '?' }; }
    if (kind === 'year') { var C = pick(dated); return { kind: kind, A: C, text: tag + 'what year was ' + C.n + ' founded?' }; }
    if (kind === 'reading' && D.readings.length >= 2) { var R1 = pick(D.readings), R2 = R1; while (R2.v === R1.v) R2 = pick(D.readings); return { kind: kind, A: R1, B: R2, text: tag + 'which Forbes reading was larger, ' + U.longDate(R1.date) + ' or ' + U.longDate(R2.date) + '?' }; }
    var G = pick(D.companies.filter(function (c) { return c.group === 'listed' || c.group === 'private'; }));
    return { kind: 'group', A: G, text: tag + 'is ' + G.n + ' listed or private?' };
  }
  function reveal(c) {
    if (c.kind === 'first') { var o = c.A.y < c.B.y ? c.A : c.B, y = o === c.A ? c.B : c.A; return o.n + ' ' + o.y + ' ' + o.mk + ', ' + y.n + ' ' + y.y + ' ' + y.mk; }
    if (c.kind === 'year') return c.A.n + ' was founded in ' + c.A.y + ' ' + c.A.mk;
    if (c.kind === 'reading') { var hi = c.A.v > c.B.v ? c.A : c.B, lo = hi === c.A ? c.B : c.A; return U.money(hi.v) + ' on ' + U.longDate(hi.date) + ' against ' + U.money(lo.v) + ' on ' + U.longDate(lo.date); }
    return c.A.n + ' is ' + c.A.group;
  }
  S.register({ name: 'quiz', pri: 30, try: function (q) {
    if (!/^\s*(?:quiz(?:\s+me)?|test me|play a game)\s*[!?.]*\s*$/i.test(q)) return null;
    var st = { n: 1, streak: 0, best: 0 }; st.cur = gen(1, 0);
    function next(verdict) { st.n++; st.cur = gen(st.n, st.streak); return { text: verdict + ' Next, ' + st.cur.text, links: [], note: 'a quiz made from the record. Say stop to end.' }; }
    function right(msg) { st.streak++; if (st.streak > st.best) st.best = st.streak; return next(msg + ' \u2713, ' + reveal(st.cur) + '.'); }
    function wrong() { st.streak = 0; return next('Not this time: ' + reveal(st.cur) + '.'); }
    S.state.mode = { owner: 'quiz', fn: function (ans) {
      if (/^\s*(stop|exit|quit|enough|end)\b/i.test(ans)) { S.state.mode = null; return { text: 'Quiz over. Best streak ' + st.best + '. Every answer came from the record, marks included.', links: S.HUBS.slice(0, 2) }; }
      var c = st.cur, al = ans.toLowerCase(), at = U.tok(ans);
      if (c.kind === 'first') {
        var hitA = U.tok(c.A.n).some(function (t) { return at.indexOf(t) !== -1; }) || (c.A.al || []).some(function (t) { return at.indexOf(t) !== -1; });
        var hitB = U.tok(c.B.n).some(function (t) { return at.indexOf(t) !== -1; }) || (c.B.al || []).some(function (t) { return at.indexOf(t) !== -1; });
        if (hitA === hitB) return null;
        return ((c.A.y < c.B.y) === hitA) ? right('Correct') : wrong();
      }
      if (c.kind === 'year') {
        var ym = /(19|20)\d\d/.exec(ans); if (!ym) return null;
        var d = Math.abs(+ym[0] - c.A.y);
        return d === 0 ? right('Correct') : d <= 2 ? right('Close enough') : wrong();
      }
      if (c.kind === 'reading') {
        var dm = /\b(\d{1,2})\b/.exec(al); if (!dm) return null;
        var day = +dm[1], dA = +c.A.date.slice(8), dB = +c.B.date.slice(8);
        if (day !== dA && day !== dB) return null;
        return ((day === dA) === (c.A.v > c.B.v)) ? right('Correct') : wrong();
      }
      var gp = /\b(listed|public)\b/.test(al) ? 'listed' : /\bprivate\b/.test(al) ? 'private' : null;
      if (!gp) return null;
      return gp === c.A.group ? right('Correct') : wrong();
    } };
    return { text: 'Quiz mode: questions made from the record, streaks counted. ' + st.cur.text, links: [], note: 'a quiz made from the record. Say stop to end.' };
  } });
})();
