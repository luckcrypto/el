/* Elon, the guide (pri 10). Three guided tours stepped with "next", "surprise me" (a random board fact) and
   "what's new" (the latest dated correction). A question asked mid-tour is answered normally and the tour waits. */
'use strict';
(function () {
  var S = window.ELON; if (!S) return;
  var U = S.u;
  var TOURS = {
    number: { name: 'the number', steps: [
      { u: './#number', t: 'The number', say: 'One dated figure: the latest Forbes estimate, with the day Forbes gave it and the day it was read.' },
      { u: './sources.html', t: 'The sources', say: 'Where it came from and how it was read, with the rounding stated.' },
      { u: './history.html', t: 'The history', say: 'Every reading in the record, newest first, each with its change from the one before.' } ] },
    made: { name: 'what it is made of', steps: [
      { u: './#made-of', t: 'The Orrery', say: 'Six companies in orbit, placed by ownership: Tesla and SpaceX listed, xAI and X inside SpaceX, Neuralink and The Boring Company private.' },
      { u: './companies.html', t: 'The companies board', say: 'Every fact with its source, date and mark, and the places where sources disagree printed side by side.' },
      { u: './tesla-stake.html', t: 'The Tesla stake', say: 'Share counts from his Form 4 filing: held in his trust, and held directly as restricted shares.' } ] },
    checked: { name: 'how it is checked', steps: [
      { u: './methodology.html', t: 'Methodology', say: 'How a net worth estimate is built, and the doubt in each input.' },
      { u: './corrections.html', t: 'Corrections', say: 'Every change to the record, dated, newest first.' },
      { u: './data.html', t: 'Data', say: 'The record as JSON and CSV, and what the data service can and cannot say.' } ] }
  };
  function stepRes(tr) {
    var s = tr.def.steps[tr.i], last = tr.i + 1 >= tr.def.steps.length;
    return { text: s.say + ' (' + (tr.i + 1) + '/' + tr.def.steps.length + (last ? '. End of tour.)' : ', say next, or stop.)'), links: [U.linkOf(s.u, s.t)], note: 'a guided tour. Answers still come only from the record.' };
  }
  S.register({ name: 'tour', pri: 10, try: function (q) {
    if (/^\s*(?:surprise me|surprise|random|anything|tell me something|fun fact|random fact)\s*[!?.]*\s*$/i.test(q)) {
      var pool = S.IDX.filter(function (e) { return e.bf; }), p = pool[Math.floor(Math.random() * pool.length)];
      if (p) return { text: 'Elon picked: ' + p.a, links: [{ t: p.t, u: p.u }] };
    }
    if (/^\s*what'?s new\b|^\s*what changed\b|\brecent changes\b|\blatest (changes|correction)\b|\bany updates\b/i.test(q)) {
      var n = S.IDX.filter(function (e) { return e.news; })[0];
      if (n) return { text: n.a, links: [{ t: 'Corrections', u: n.u }] };
    }
    var tm = /^\s*(?:give me a |take me on a |start (?:the |a )?)?tours?(?:\s+(?:of\s+)?(?:the\s+)?(.+?))?\s*[!?.]*\s*$/i.exec(q);
    if (!tm) return null;
    var w = (tm[1] || '').toLowerCase();
    var key = /number|figure|reading/.test(w) ? 'number' : /made|compan|orrery|business/.test(w) ? 'made' : /check|method|correct|how it/.test(w) ? 'checked' : null;
    if (!key) return { text: 'Three tours, each three stops: \u201ctour the number\u201d, \u201ctour the companies\u201d and \u201ctour how it is checked\u201d. Pick one.', links: [U.linkOf('./#number', 'The number'), U.linkOf('./companies.html', 'The companies board'), U.linkOf('./methodology.html', 'Methodology')], note: 'guided tours, stepped with next' };
    var tr = { def: TOURS[key], i: 0 };
    S.state.mode = { owner: 'tour', fn: function (ans) {
      if (/^\s*(next|continue|go on|onwards?)\b/i.test(ans)) {
        tr.i++;
        if (tr.i >= tr.def.steps.length) { S.state.mode = null; return { text: 'That was the last stop of ' + tr.def.name + '. Ask anything, or say quiz me.', links: S.HUBS.slice(0, 2) }; }
        var r = stepRes(tr); if (tr.i === tr.def.steps.length - 1) S.state.mode = null; return r;
      }
      if (/^\s*(stop|exit|quit|end)\b/i.test(ans)) { S.state.mode = null; return { text: 'Tour paused at stop ' + (tr.i + 1) + '. The pages stay where they are. Ask anything.', links: [U.linkOf(tr.def.steps[tr.i].u, tr.def.steps[tr.i].t)] }; }
      return null;
    } };
    return { text: 'Tour of ' + tr.def.name + ', ' + tr.def.steps.length + ' stops. ' + stepRes(tr).text, links: stepRes(tr).links, note: 'a guided tour. Say next to continue.' };
  } });
})();
