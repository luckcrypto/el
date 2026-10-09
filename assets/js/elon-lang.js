/* Elon, the ears: prehooks that run before any faculty sees a question. Pronoun memory ("it" means the last
   company named) and typo forgiveness over a curated vocabulary of entity names and trigger words only, never
   the index text: an over-eager fixer once turned "tall" into "wall" on spaceflight.fyi. Every word a voice bank
   or a calc route listens for is protected here, or the ears would eat it first. Exports fuzzyEnt for the floor. */
'use strict';
(function () {
  var S = window.ELON; if (!S) return;
  var EXTRA = ['ether','ethereum','eth','roubles','rouble','rubles','ruble','kroner','krone','lira','whats','thats','hows','wheres','whos','dont','doesnt','isnt','cant','wont','youre','theyre','figure','figures','number','numbers','data','list','listed','listing','lists','wealth','richer','money','percent','holding','holdings','older','younger','newer','between','difference','compared','biggest','latest','earliest','recent','current','live','true','right','today','tesla','spacex','neuralink','boring','paypal','openai','solarcity','twitter','grok','zip2','sats','satoshi','satoshis','bitcoin','bitcoins','ounce','ounces','troy','gold','bullion','grams','kilograms','tonnes','plaid','bullish','scenario','scenarios','trajectory','advertising','advert','sponsor','sponsorship','forever','banner','estimate','closed','close','closing','stock','stocks','shares','price','prices','predict','forecast','fortune'];
  var VOCAB = null;
  function vocab() {
    if (VOCAB) return VOCAB;
    var v = {}, add = function (w) { if (w && w.length >= 4) v[w] = 1; };
    S.u.ENT.forEach(function (x) { x.toks.forEach(add); x.al.forEach(add); });
    EXTRA.forEach(add);
    var src = S.faculties.map(function (f) { return String(f.try); }).join(' ') + ' ' + (S.u.INTENT_WORDS || '') + ' ' + (S.u.BANK_WORDS || '') + ' ' + (S.u.WORDS || '') + ' ' + S.u.CATS.map(function (x) { return x.words.source; }).join(' ');
    (src.toLowerCase().match(/[a-z]{4,}/g) || []).forEach(add);
    VOCAB = Object.keys(v);
    return VOCAB;
  }
  S.prehook(function (q) {
    if (S.state.lastEnt && /\b(it|its|that one|this one|that company|this company)\b/i.test(q) && !/\b(worth|figure|number|reading|estimate|changed?|since|trillion|rupees?|pounds?|euros?|dirhams?|riyals?|francs?|pesos?|rand|kronor|krona|kroner|krone|roubles?|rubles?|lira|ether|ethereum|eth|reais|yen|yuan|gold|ounces?|oz|bitcoins?|btc|sats?|dollars?|usd|plaid|bullish|base case|convert|accurate|true|right|wrong|live|current|up to date|mean)\b/i.test(q)) {
      q = q.replace(/\b(?:its|it|that one|this one|that company|this company)\b/gi, S.state.lastEnt.n);
    }
    return q;
  });
  S.prehook(function (q) {
    var changed = false;
    var out = q.split(/(\s+)/).map(function (p) {
      var w = p.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (w.length < 4 || /^[0-9.,]+$/.test(w) || /[0-9]/.test(w) || vocab().indexOf(w) !== -1) return p;
      var cap = w.length <= 5 ? 1 : 2, best = null, bd = cap + 1;
      var V = vocab();
      for (var i = 0; i < V.length; i++) {
        var c = V[i];
        if (c.length < 4 || Math.abs(c.length - w.length) > cap) continue;
        var d = S.u.edist(w, c, cap);
        if (d < bd) { bd = d; best = c; if (d === 1) break; }
      }
      if (best) { changed = true; return p.toLowerCase().replace(w, best); }
      return p;
    }).join('');
    return changed ? out : q;
  });
  S.u.fuzzyEnt = function (q) {
    var qts = S.u.tok(q), best = null, bd = 3;
    for (var i = 0; i < S.u.ENT.length; i++) {
      var x = S.u.ENT[i], keys = x.toks.concat(x.al);
      if (x.cat.key !== 'companies') continue;
      for (var j = 0; j < qts.length; j++) for (var k = 0; k < keys.length; k++) {
        if (keys[k].length < 4 || qts[j].length < 4) continue;
        var cap = keys[k].length <= 6 ? 1 : 2, d = S.u.edist(qts[j], keys[k], cap);
        if (d <= cap && d < bd) { bd = d; best = x; }
      }
    }
    return best;
  };
})();
