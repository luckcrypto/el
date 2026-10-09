/* Elon, the memory (pri 50). "what did I ask" reads this tab's questions back, escaped; "where was I" reads the
   page trail and visit count kept in this browser only; "forget me" clears both. There is no server to tell. */
'use strict';
(function () {
  var S = window.ELON; if (!S) return;
  var U = S.u;
  S.register({ name: 'recall', pri: 50, try: function (q) {
    var ql = q.toLowerCase();
    if (/^\s*(forget me|forget everything|clear (my )?(history|trail|data)|delete my (history|data|trail)|wipe (my )?(history|data))\s*[!?.]*\s*$/.test(ql)) {
      try { localStorage.removeItem('elonTrail'); localStorage.removeItem('elonVisits'); sessionStorage.removeItem('elonSeen'); } catch (e) { /* nothing stored */ }
      S.state.hist = [];
      return { text: 'Done. Your question trail and visit count are gone from this browser, and this tab\u2019s questions with them.', links: [], note: 'kept in this browser only. No servers.' };
    }
    if (/what (?:did|have) i (?:ask|asked)|my (?:questions|history)|^\s*history of my questions\s*[?!.]*$/.test(ql)) {
      var h = S.state.hist.slice(0, -1).slice(-6);
      if (!h.length) return { text: 'Nothing yet in this tab. This is your first question, and the list goes when the tab closes.', links: [], note: 'kept in this tab only' };
      return { text: 'In this tab, most recent last: \u201c' + h.map(U.esc).join('\u201d \u00b7 \u201c') + '\u201d. Kept in this tab only, and gone when you leave.', links: [], note: 'kept in this tab only' };
    }
    if (/where was i|my trail|last visit|welcome back|visit count|pages i (visited|read)/.test(ql)) {
      var trail = [], visits = 0;
      try { trail = JSON.parse(localStorage.getItem('elonTrail') || '[]'); visits = parseInt(localStorage.getItem('elonVisits') || '0', 10) || 0; } catch (e) { /* no storage */ }
      if (!trail.length) return { text: 'No trail yet. Read a few pages and ask again. The trail stays in this browser.', links: S.HUBS.slice(0, 2), note: 'kept in this browser only. No servers.' };
      var recent = trail.slice(0, 4);
      return { text: 'Visit ' + visits + ' by this browser\u2019s own count. Your trail, newest first: ' + recent.map(function (x) { return U.esc(x.t); }).join(' \u00b7 ') + '. Nothing leaves this machine, and \u201cforget me\u201d clears it.', links: recent.slice(0, 3).map(function (x) { return { t: x.t, u: x.u }; }), note: 'kept in this browser only. No servers.' };
    }
    return null;
  } });
})();
