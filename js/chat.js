/* Mini FAQ chat for jldechavezworks.com
   - Runs entirely in the browser: no server, no API key, no cost.
   - Answers come from the list below, written from the portfolio content.
   - To change an answer or add a topic, edit the INTENTS array. */
(function () {
  'use strict';

  var EMAIL = 'jonnel@jldechavezworks.com';
  var PHONE_DISPLAY = '0946 130 1672';
  var PHONE_TEL = '+639461301672';
  var LINKEDIN = 'https://www.linkedin.com/in/nhe1l';

  var contactHtml =
    'Email: <a href="mailto:' + EMAIL + '">' + EMAIL + '</a><br>' +
    'Phone: <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a><br>' +
    'LinkedIn: <a href="' + LINKEDIN + '" target="_blank" rel="noopener">linkedin.com/in/nhe1l</a>';

  // keys: words/phrases that trigger the topic. a: answer (trusted HTML). next: suggested follow-up chips.
  var INTENTS = [
    { id: 'hello', keys: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      a: 'Hi! I can answer quick questions about Jonnel&rsquo;s background, services, and projects. What would you like to know?',
      next: ['What services do you offer?', 'Tell me about your experience', 'How can I contact you?'] },

    { id: 'services', keys: ['service', 'services', 'offer', 'help with', 'what do you do', 'what can you do', 'support', 'virtual assistant', 'admin'],
      a: 'Jonnel helps with: administrative and virtual assistance; data management and documentation; order and supply chain coordination; due diligence, credentialing and risk review; customer, sales and stakeholder support; digital tools, AI and automation; and healthcare and insurance claims support. Details are in the <a href="/#services">Services</a> section.',
      next: ['Do you do data entry?', 'Supply chain experience?', 'Are you open to freelance work?'] },

    { id: 'experience', keys: ['experience', 'background', 'years', 'career', 'history', 'worked', 'work history', 'resume', 'cv', 'confidential', 'employer', 'employers', 'company', 'companies', 'previous', 'where did you work', 'current role', 'current job', 'currently'],
      a: 'Jonnel has 6+ years in BPO and shared services, mostly with US clients, across healthcare, supply chain, logistics and telecom: data encoding, data assistance, customer support, supply chain coordination, and now due diligence, credentialing and risk review. The detailed history involves past employers and clients, so it&rsquo;s confidential and shared on request. <a href="/experience">Request to view it</a>.',
      next: ['Can I see your work history?', 'What tools do you use?'] },

    { id: 'supply', keys: ['supply chain', 'logistics', 'orders', 'order', 'warehouse', 'pod', 'bol', 'coordinator', 'shipping', 'delivery'],
      a: 'Yes. Jonnel has worked as a supply chain coordinator: tracking bulk orders end to end, coordinating retailers, warehouses and logistics partners, and securing PODs and BOLs so suppliers and customers get accurate information on time.',
      next: ['Do you do data entry?', 'What tools do you use?'] },

    { id: 'data', keys: ['data', 'data entry', 'encoding', 'encoder', 'excel', 'spreadsheet', 'records', 'documentation', 'clean'],
      a: 'Yes. Jonnel started in data encoding and later worked as a data assistant reviewing insurance claims: entering, validating and proofreading data, and turning scanned paper into clean digital records. He also builds Excel reports with PivotTables.',
      next: ['Tell me about your experience', 'What tools do you use?'] },

    { id: 'risk', keys: ['risk', 'compliance', 'due diligence', 'credentialing', 'verification', 'verify'],
      a: 'Due diligence and credentialing are his current focus: document verification, compliance checks, finding risks and discrepancies, and keeping accurate records.',
      next: ['Can I see your work history?', 'How can I contact you?'] },

    { id: 'tools', keys: ['tools', 'tool', 'software', 'systems', 'tech', 'skills', 'salesforce', 'oracle', 'slack', 'microsoft', 'google workspace', 'ai', 'claude', 'chatgpt', 'copilot', 'gemini', 'erp', 'crm', 'tms', 'power platform', 'apps script', 'javascript', 'vba'],
      a: 'Microsoft 365 and Power Platform, Google Workspace and Apps Script, Slack and Confluence; business systems such as Salesforce, Oracle, E2open, ServiceNow and Workday; AI assistants like Claude, ChatGPT, Gemini and Copilot; plus JavaScript, HTML/CSS and VS Code. Laravel and VBA are basic-level. The full list by category is confidential and shared on request: <a href="/tools">request access</a>.',
      next: ['Tell me about your projects', 'What services do you offer?'] },

    { id: 'projects', keys: ['project', 'projects', 'pos', 'point of sale', 'portfolio', 'built', 'build', 'app', 'retailer', 'anyjuanpos', 'any juan', 'pdf merger', 'template', 'docx', 'generator', 'extractor', 'telegram', 'receipt', 'receipts', 'dashboard', 'power automate', 'merger', 'merge', 'inventory', 'bot', 'outlook', 'automation', 'integration', 'finance', 'financial'],
      a: 'Jonnel built <a href="/projects/anyjuanpos">AnyJuanPOS</a>, a web-based point-of-sale and business management app that works offline, syncs, and tracks income and expenses. In the workshop: a Telegram business bot with a receipt tracker and web dashboard (receipt photos are read, saved to a database, and totalled on the dashboard), a document reader, data cleaner &amp; DOCX generator, an Outlook email template generator (Excel and VBA), a PDF merger that is planned to grow into a universal document merger, and a Power Automate integration tool. See <a href="/#projects">Projects</a>.',
      next: ['Can I try AnyJuanPOS?', 'What services do you offer?', 'How can I contact you?'] },

    { id: 'pos', keys: ['anyjuanpos', 'any juan', 'pos', 'point of sale', 'trial', 'demo', 'test', 'testing', 'try', 'offline', 'pwa', 'install', 'tablet', 'mobile', 'customize', 'customise', 'modify', 'different business', 'any business'],
      a: 'AnyJuanPOS is a web application that can also be installed as an app (PWA) and keeps working offline. It isn&rsquo;t only for retailers: it can be modified to fit your business. You can use it on mobile, tablet, PC or laptop. A trial or testing is available on request: email <a href="mailto:' + EMAIL + '?subject=AnyJuanPOS%3A%20trial%20or%20question">' + EMAIL + '</a>. More on the <a href="/projects/anyjuanpos">project page</a>.',
      next: ['Tell me about your projects', 'How can I contact you?'] },

    { id: 'hire', keys: ['hire', 'hiring', 'available', 'availability', 'freelance', 'remote', 'full time', 'full-time', 'part time', 'part-time', 'in-house', 'team', 'job', 'opportunity', 'work with you', 'start'],
      a: 'Yes. Jonnel is looking for remote work, either in-house with a company or directly with a client, and is open to freelance projects. For availability and start dates, the quickest route is email or a call.',
      next: ['How can I contact you?', 'Tell me about your experience'] },

    { id: 'rates', keys: ['rate', 'rates', 'price', 'pricing', 'cost', 'how much', 'salary', 'fee', 'budget', 'quote'],
      a: 'Rates aren&rsquo;t listed on the site because they depend on the work. Send a short description of what you need to <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> and Jonnel will reply.',
      next: ['How can I contact you?'] },

    { id: 'contact', keys: ['contact', 'email', 'phone', 'call', 'number', 'reach', 'linkedin', 'message', 'talk', 'text'],
      a: contactHtml,
      next: ['Are you open to freelance work?', 'What services do you offer?'] },

    { id: 'where', keys: ['where', 'location', 'based', 'live', 'country', 'philippines', 'antipolo', 'timezone', 'time zone', 'hours', 'schedule'],
      a: 'Jonnel is based in Antipolo, Philippines, and has worked mainly with US clients. For working hours and time-zone overlap, please ask by email.',
      next: ['How can I contact you?'] },

    { id: 'education', keys: ['education', 'degree', 'school', 'college', 'studied', 'icct', 'graduate'],
      a: 'Associate&rsquo;s degree in Information Technology from ICCT Colleges (2016&ndash;2019).',
      next: ['Tell me about your experience'] },

    { id: 'thanks', keys: ['thanks', 'thank you', 'thank', 'ok thanks', 'great', 'awesome'],
      a: 'You&rsquo;re welcome! If you&rsquo;d like to talk it through, you can reach Jonnel at <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.',
      next: [] }
  ];

  var STARTERS = ['What services do you offer?', 'Tell me about your experience', 'Tell me about your projects', 'How can I contact you?'];

  function normalize(t) { return ' ' + t.toLowerCase().replace(/[^a-z0-9&\- ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; }

  function match(text) {
    var q = normalize(text), best = null, bestScore = 0;
    INTENTS.forEach(function (it) {
      var score = 0;
      it.keys.forEach(function (k) {
        if (q.indexOf(' ' + k + ' ') !== -1) score += k.indexOf(' ') !== -1 ? 2 : 1;
      });
      if (score > bestScore) { best = it; bestScore = score; }
    });
    return best;
  }

  // ---------- build the widget ----------
  var root = document.createElement('div');
  root.className = 'chat';
  root.innerHTML =
    '<button class="chat-launch" type="button" aria-expanded="false" aria-controls="chat-panel">' +
      '<span class="chat-launch-label">Ask a question</span>' +
    '</button>' +
    '<section class="chat-panel" id="chat-panel" role="dialog" aria-label="Ask about Jonnel" hidden>' +
      '<header class="chat-head">' +
        '<div><strong>Ask about Jonnel</strong><span>Automated answers from this site</span></div>' +
        '<button class="chat-close" type="button" aria-label="Close chat">&times;</button>' +
      '</header>' +
      '<div class="chat-log" role="log" aria-live="polite"></div>' +
      '<div class="chat-chips"></div>' +
      '<form class="chat-form" autocomplete="off">' +
        '<label class="visually-hidden" for="chat-input">Type your question</label>' +
        '<input id="chat-input" type="text" maxlength="300" placeholder="Type a question&hellip;" enterkeyhint="send">' +
        '<button type="submit">Send</button>' +
      '</form>' +
    '</section>';
  document.body.appendChild(root);

  var launch = root.querySelector('.chat-launch');
  var panel = root.querySelector('.chat-panel');
  var closeBtn = root.querySelector('.chat-close');
  var log = root.querySelector('.chat-log');
  var chips = root.querySelector('.chat-chips');
  var form = root.querySelector('.chat-form');
  var input = root.querySelector('#chat-input');
  var started = false;

  function addMsg(who, content, isHtml) {
    var el = document.createElement('div');
    el.className = 'chat-msg ' + who;
    if (isHtml) el.innerHTML = content; else el.textContent = content;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function setChips(list) {
    chips.textContent = '';
    list.forEach(function (label) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', function () { ask(label); });
      chips.appendChild(b);
    });
  }

  function ask(text) {
    text = text.trim();
    if (!text) return;
    addMsg('user', text, false);
    var it = match(text);
    window.setTimeout(function () {
      if (it) {
        addMsg('bot', it.a, true);
        setChips(it.next && it.next.length ? it.next : STARTERS);
      } else {
        var body = encodeURIComponent('Hi Jonnel,\n\n' + text + '\n');
        addMsg('bot',
          'I don&rsquo;t have an answer for that one. Jonnel can answer it directly: ' +
          '<a href="mailto:' + EMAIL + '?subject=Question%20from%20your%20website&amp;body=' + body + '">email this question</a> ' +
          'or call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>.', true);
        setChips(STARTERS);
      }
    }, 250);
  }

  function open() {
    panel.hidden = false;
    launch.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    if (!started) {
      started = true;
      addMsg('bot', 'Hi! I&rsquo;m an automated assistant for this site. Ask me about Jonnel&rsquo;s services, experience, or projects. I&rsquo;m not a live chat, so for anything else I&rsquo;ll point you to email or phone.', true);
      setChips(STARTERS);
    }
    input.focus();
  }
  function close() {
    panel.hidden = true;
    launch.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    launch.focus();
  }

  launch.addEventListener('click', function () { panel.hidden ? open() : close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value; input.value = '';
    ask(v);
  });
})();
