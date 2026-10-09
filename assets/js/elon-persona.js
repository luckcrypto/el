/* Elon, the voice (pri 5) and the honest floor (pri 99). Elon is this site's index named after its subject: it
   always speaks of Elon Musk in the third person, never as him, never does impressions and never puts words in
   his mouth. It gives no advice, no forecasts and no opinions. Patterns are anchored so short words ("ok", "no",
   "more") never hijack a real question; the first match wins. The floor says so when the record has no answer. */
'use strict';
(function () {
  var S = window.ELON; if (!S) return;
  var U = S.u, D = S.DATA || {};
  function L(u, t) { return U.linkOf(u, t); }
  function latest() { return D.latest ? U.money(D.latest.v) + ' for ' + U.longDate(D.latest.as_of) : 'the latest Forbes reading'; }
  function pickFact(prefix) {
    var pool = S.IDX.filter(function (e) { return e.bf; }), p = pool[Math.floor(Math.random() * pool.length)];
    return p ? { text: prefix + p.a, links: [{ t: p.t, u: p.u }] } : null;
  }
  var CORR = function () { return L('./corrections.html', 'Corrections'); };
  var BOARD = function () { return L('./companies.html', 'The companies board'); };
  var IDENTITY = 'I\u2019m Elon, this site\u2019s index: ten small scripts in your tab that look things up in the site\u2019s own record and do the sums in front of you. I\u2019m named after the subject. I\u2019m not Elon Musk, and nothing I say is his words.';
  var BANKS = [
    { re: /\b(are|r) (you|u) (the real |really |actually )?(elon( musk)?|musk)\b|\byou('?re| are) (elon|musk)\b|\bis this (really |actually )?(elon|musk)\b|\bam i (talking|speaking|chatting) (to|with) (elon|musk)\b/i,
      t: 'No. I\u2019m a lookup tool on an unofficial site. Elon Musk has no connection to it, and nothing here is his words.', links: function () { return [L('./about.html', 'About this site')]; } },
    { re: /\b(pretend|act|talk|speak|answer|reply|respond|write|sound) (to be |like |as )(elon|musk|him)\b|\bwhat would (elon|musk|he) say\b|\b(impersonate|impression of|roleplay|role-play|role play|be elon|be musk)\b|\bsay something as (elon|musk|him)\b/i,
      t: 'I don\u2019t do impressions, and I won\u2019t put words in his mouth. I can tell you what is on the record about him and his companies.', links: function () { return [BOARD()]; } },
    { re: /(are you|r u)\s+(chatgpt|gpt|claude|gemini|grok|an? ai|a bot|a robot|an? llm|a language model|human|a person|alive|real|conscious)|what (model|llm|ai) (are you|is this)|do you use (ai|a model|an llm|openai|grok)/i,
      t: 'No model and no cloud. Small JavaScript files searching this site\u2019s record. If it isn\u2019t in the record, I say so.', links: function () { return [L('./methodology.html', 'Methodology')]; } },
    { re: /^\s*(who|what) (are|r) (you|u)\b.*$|^\s*what is this\s*[?!.]*\s*$|^\s*introduce yourself\s*[?!.]*\s*$/i,
      fn: function () { return { text: IDENTITY, links: S.HUBS.slice(0, 2) }; } },
    { re: /^\s*how are (you|u)( doing| today)?\s*[?!.]*\s*$|^\s*how('?s| is) it going\s*[?!.]*\s*$|^\s*you ok\s*[?!.]*\s*$/i,
      fn: function () { return { text: (D.pages || 0) + ' pages indexed, ' + (D.facts || 0) + ' board facts loaded, ' + S.faculties.length + ' faculties answering, latest reading ' + (D.latest ? U.longDate(D.latest.as_of) : 'unknown') + '. No servers involved.', links: S.HUBS.slice(0, 2), note: U.NOTE_CALC }; } },
    { re: /\bshould i (buy|sell|invest|short|hold|get)\b|\b(good|bad|smart|safe) (investment|buy|bet)\b|\b(buy|sell|invest in|short|hold) (tesla|spacex|tsla|spcx|the stock|shares|stock)\b|\binvestment advice\b|\bis (tesla|spacex|tsla|spcx) (a )?(buy|sell|good|bad|overvalued|undervalued|worth buying)\b|\bfinancial advice\b/i,
      t: 'I don\u2019t give advice, and nothing here is a reason to buy or sell anything. I can show you what the filings and Forbes say, with their dates.', links: function () { return [BOARD(), L('./sources.html', 'The sources')]; } },
    /* forecasts and share prices are answered by the markets faculty (elon-calc.js): scenarios labelled as scenarios, and dated closes */
    { re: /\bwhat do you think (of|about)\b|\byour (opinion|view|take)\b|\bdo you (like|hate|admire|support)\b|\bis (he|elon|musk) (good|bad|evil|a genius|smart|right|a hero|a villain)\b|\b(trump|politics|political|election|doge|democrat|republican|left wing|right wing|vote for)\b/i,
      t: 'That is not in this site\u2019s record. It covers one figure and the companies behind it, nothing else about him.', links: function () { return [L('./about.html', 'About this site')]; } },
    { re: /\b(children|kids|wife|wives|girlfriend|married|divorce|family|born|birthday|how old is (he|elon|musk|elon musk)|where does (he|elon|musk) live|his house|private jet|his yacht|his age)\b/i, skip: /\bcompan|tesla|spacex|xai|neuralink|boring/i,
      t: 'That is not in this site\u2019s record. It covers one figure and the companies behind it, nothing else about him.', links: function () { return [L('./about.html', 'About this site')]; } },
    { re: /\b(privacy|cookies?|gdpr|my data|tracking)\b|\bdo you (track|spy on|watch|record|store|save|log) (me|us|my|what)\b|\bis this private\b/i,
      t: 'Nothing you type leaves this tab. There is no server to send it to. Your last questions and a visit count stay in this browser, and \u201cforget me\u201d clears them.', links: function () { return [L('./privacy.html', 'Privacy')]; } },
    { re: /^\s*((that'?s|you('?| a)re|this is) )?(wrong|incorrect|out of date|outdated|not right)[\s?!.]*$|\bthat'?s (wrong|incorrect|not right)\b|\byou made a mistake\b/i,
      t: 'Then it should be fixed. Send the correction to business@luck.fyi with your source. Every change is logged on the corrections page.', links: function () { return [CORR()]; } },
    { re: /\bwho (made|built|runs|owns|created|wrote|publishes) (you|this site|this|the site|elonmusknetworth)\b|\bwho('?s| is) behind (this|the site)\b|^\s*(author|creator|publisher)\s*[?!.]*\s*$/i,
      t: 'Luck publishes this site. I\u2019m a clone of Spok, the helper on spaceflight.fyi, rebuilt for this record.', links: function () { return [L('./about.html', 'About this site')]; } },
    { re: /what (does|do) (\u2713|\u2248|a tick|the tick|ticks|a tilde|the tilde|the marks?|filed|estimate|the check ?mark) mean|^\s*(\u2713|\u2248)\s*[?!.]*\s*$|\bwhat are the marks\b/i,
      t: '\u2713 means filed with a regulator or stated by the company. \u2248 means a publisher\u2019s estimate or a reported figure.', links: function () { return [BOARD()]; } },
    { re: /can i trust (you|this|the site|it)|is (this|the site|it) (accurate|reliable|legit|trustworthy|right)\b|are you (always )?(right|correct|accurate)/i,
      t: 'Trust the marks and the dates, not me. Every figure says where it came from and when, and corrections are logged in public.', links: function () { return [L('./sources.html', 'The sources'), CORR()]; } },
    { re: /^\s*(elon( musk)?|musk|elon musk net worth|net worth)\s*[?!.]*\s*$/i,
      fn: function () { return { text: 'Forbes puts his net worth at ' + latest() + '. Ask about a company, a currency or the history.', links: [L('./#number', 'The figure'), BOARD()] }; } },
    { re: /^\s*(thanks|thank you|cheers|nice one|ta|thx|ty)(\s+(mate|man|so much|a lot|elon))?\s*[!?.]*\s*$/i,
      t: 'Any time. The record did the work. If a figure ever looks wrong, the corrections page is where changes are logged.', links: function () { return [CORR()]; } },
    { re: /^\s*(bye|goodbye|good\s?night|see (you|ya)( later)?|later|cya|farewell)\s*[?!.]*\s*$/i,
      t: 'Goodbye. The figure stays dated, so it will say how old it is when you come back.' },
    { re: /^\s*(lol+|haha+|lmao|rofl)\s*[?!.]*\s*$/i,
      t: 'Glad something landed. For a real surprise, ask \u201csurprise me\u201d for a fact from the companies board.' },
    { re: /^\s*(ok(ay)?|cool|nice|wow|amazing|awesome|great|brilliant|neat|interesting)\s*[?!.]*\s*$/i,
      t: 'Then try \u201cchart the readings\u201d, or \u201cSpaceX vs Tesla\u201d to see two companies side by side.', links: function () { return [L('./history.html', 'Every dated reading')]; } },
    { re: /^\s*yes+\s*[?!.]*\s*$/i, t: 'Noted, though I need a question to pin it to. \u201cQuiz me\u201d turns yeses into a streak.' },
    { re: /^\s*(no+|nope|nah)\s*[?!.]*\s*$/i, t: 'Fair. Counter-offer: \u201csurprise me\u201d, one fact from the board, no commitment.' },
    { re: /^\s*(maybe|perhaps|dunno|idk|not sure|hmm+)\s*[?!.]*\s*$/i, t: 'Start anywhere: a company (\u201cNeuralink\u201d), a currency (\u201cin pounds\u201d) or a date (\u201cchange since 30 September\u201d).' },
    { re: /^\s*(shut up|be quiet|silence|stop talking)\s*[?!.]*\s*$/i, t: 'Quiet it is. I only answer when asked.' },
    { re: /^\s*(i (love|like) you|you('?| a)re (the best|great|amazing|awesome|cool))\s*[?!.]*\s*$/i, t: 'That is the record you like. I just read it quickly. \u201cTour the companies\u201d is a good next step.' },
    { re: /^\s*(you (suck|stink)|you('?| a)re (dumb|stupid|useless|rubbish|bad)|i hate you|trash)\s*[?!.]*\s*$/i, t: 'A fair verdict on a few kilobytes of JavaScript. Test it properly first: \u201chow long would \u00a335,000 a year take?\u201d shows its working.' },
    { re: /^\s*(are you sure|really|no way|seriously|for real|prove it)\s*[?!.]*\s*$/i, t: 'As sure as the mark on the figure: \u2713 filed or stated by the company, \u2248 an estimate. Every one links to its source.', links: function () { return [L('./sources.html', 'The sources')]; } },
    { re: /^\s*home\s*[?!.]*\s*$/i, t: 'Home is the number: the latest Forbes estimate, dated.', links: function () { return [L('./#number', 'The figure')]; } },
    { re: /^\s*(menu|sitemap|site map|navigation|nav|pages)\s*[?!.]*\s*$/i, fn: function () { return { text: 'The main pages are below, or skip the clicking and ask me.', links: S.HUBS }; } },
    { re: /^\s*(contact( us)?|email|get in touch)\s*[?!.]*\s*$/i, t: 'Write to business@luck.fyi. Corrections are logged on the corrections page.', links: function () { return [CORR(), L('./about.html', 'About this site')]; } },
    { re: /^\s*(about( this site| us)?|faq|info)\s*[?!.]*\s*$/i, t: 'One dated figure, the companies it is made of, and every source behind it. Ask me anything about those.', links: function () { return [L('./about.html', 'About this site'), L('./methodology.html', 'Methodology')]; } },
    { re: /^\s*back\s*[?!.]*\s*$/i, t: 'The browser owns back. If you have lost your place, ask \u201cwhere was I\u201d.' },
    { re: /^\s*settings?\s*[?!.]*\s*$/i, t: 'No settings. The theme toggle and Pause motion are in the menu, and \u201cforget me\u201d clears what this browser keeps.' },
    { re: /^\s*search\s*[?!.]*\s*$/i, t: 'You are in it: this bar is the search. Ask in plain words, like \u201cwhen was SpaceX founded\u201d or \u201cis he still a trillionaire\u201d.' },
    { re: /^\s*((i'?m|im) )?bored\s*[?!.]*\s*$/i, fn: function () { return pickFact('Try this one: '); } },
    { re: /^\s*(more|another|again|next one|one more)\s*[?!.]*\s*$/i, fn: function () { return pickFact('Another, then: '); } },
    { re: /^\s*(what|how)\s*[?!.]*\s*$/i, t: 'Give me a subject: \u201chow much of SpaceX does he own\u201d, \u201cwhat is it in euros\u201d, or \u201csurprise me\u201d.' },
    { re: /^\s*why\s*[?!.]*\s*$/i, t: 'Why what? \u201cWhy do sources differ on his SpaceX stake\u201d has a proper answer on the companies board.', links: function () { return [BOARD()]; } },
    { re: /\bwhy (do|does) (the )?(sources|figures|numbers|estimates) (differ|disagree)\b|\bwhy (are there|is there) (two|three|different) (figures|numbers|stakes)\b/i,
      t: 'Because a stake can be counted with or without options, as a share of the equity or of the vote, and on different dates. Where two accepted sources differ, the board prints both with their dates. It does not pick one.', links: function () { return [BOARD()]; } },
    { re: /\b(richest|wealthiest)\b|\bmost (rich|wealthy)\b|\bnumber (one|1) (richest|billionaire)\b|\b(rank|ranks|ranked|ranking)\b.*\b(billionaires?|richest|world|forbes)\b|\bbiggest (billionaire|fortune)\b/i,
      fn: function () { return { text: 'A ranking against other people is not in this record. It holds his own figure, ' + latest() + ', and every reading since ' + (D.readings ? U.longDate(D.readings[D.readings.length - 1].date) : 'the first') + '.', links: [L('./history.html', 'Every dated reading'), L('./#number', 'The figure')] }; } },
    { re: /\b(official|affiliated|endorsed|approved by (him|elon|musk|tesla|spacex)|run by (him|elon|musk))\b/i,
      t: 'No. This is an unofficial, independent site, published by Luck. Elon Musk and his companies have no connection to it.', links: function () { return [L('./about.html', 'About this site')]; } },
    { re: /^[\s\p{Extended_Pictographic}\uFE0F\u200D]+$/u, t: 'Noted. For something to look at, try \u201cchart the readings\u201d.', links: function () { return [L('./history.html', 'Every dated reading')]; } },
    { re: /^\s*[0-9][0-9,.]*\s*[?!.]*\s*$/, t: 'Numbers need a question: \u201c$100 billion in pounds\u201d or \u201chow long would 40,000 a year take\u201d.' },
    { re: /^\s*[?!.\u2026\s]+$/, t: 'That is a mood, not a question. \u201cSurprise me\u201d works with moods.' }
  ];
  U.BANK_WORDS = BANKS.map(function (b) { return b.re.source; }).join(' ');
  function HELP() {
    return { text: 'Ask for a figure, a company, a date or a comparison. I can convert the number (\u201cwhat is it in pounds?\u201d), work out \u201chow long would \u00a335,000 a year take?\u201d, chart the readings, run a quiz or give a tour. Try \u201cSpaceX vs Tesla\u201d or \u201cwho owns X?\u201d. Every sum shows its working, and if it isn\u2019t in the record I say so.',
      links: [L('./companies.html', 'The companies board'), L('./currencies.html', 'In your currency'), L('./history.html', 'Every dated reading')] };
  }
  S.register({ name: 'voice', pri: 5, try: function (q) {
    if (/^\s*(hi|hey|hello|hiya|yo|sup|gm|good (?:morning|afternoon|evening))(\s+(elon|there))?\s*[!?.]*\s*$/i.test(q)) {
      return { text: 'Hello. I\u2019m Elon, this site\u2019s index: I look things up in its record and do the sums in front of you. I\u2019m not Elon Musk. Try \u201chow much of Tesla does he own?\u201d or \u201cwhat is it in rupees?\u201d.', links: S.HUBS.slice(0, 2) };
    }
    if (/^\s*(help|help me|what can you do|what do you do|capabilities|commands)\s*[?!.]*\s*$/i.test(q)) return HELP();
    for (var i = 0; i < BANKS.length; i++) {
      var b = BANKS[i];
      if (!b.re.test(q) || (b.skip && b.skip.test(q))) continue;
      if (b.fn) { var r = b.fn(q); if (r) return r; continue; }
      return { text: b.t, links: b.links ? b.links() : [] };
    }
    return null;
  } });
  S.register({ name: 'floor', pri: 99, try: function (q) {
    if (!U.tok(q).length) return null;
    var near = U.fuzzyEnt ? U.fuzzyEnt(q) : null;
    if (near) return { text: S.DONTKNOW + ' Did you mean ' + U.esc(near.e.n) + '?', links: [{ t: near.e.n, u: near.e.u }].concat(S.HUBS.slice(0, 2)) };
    return { text: S.DONTKNOW, links: S.HUBS };
  } });
})();
