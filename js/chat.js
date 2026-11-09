/* Tinker, Jonnel's bot assistant, for jldechavezworks.com
   - Runs entirely in the browser: no server, no API key, no cost, nothing is sent anywhere.
   - It is a rule-based assistant, not a large AI model: every answer below is written from the site's content.
   - It understands plurals, small typos and several ways of asking, remembers the last topic, and can ask
     visitors about their business and connect the answer to Jonnel's experience.
   - To change an answer or add a topic, edit INTENTS (questions) or BUSINESSES (what visitors say they run). */
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

  var ASK_BUSINESS = 'Tell Tinker about my business';

  // ---------------------------------------------------------------------------------------------
  // Tools that are confirmed on Jonnel's profile. Tinker never names a tool that is not in this list.
  // ---------------------------------------------------------------------------------------------
  var TOOLS = [
    { n: 'Salesforce', cat: 'CRM and customer support', al: ['salesforce'] },
    { n: 'Avaya', cat: 'CRM and customer support', al: ['avaya'] },
    { n: 'Five9', cat: 'communication and contact center', al: ['five9', 'five 9'] },
    { n: 'ServiceNow', cat: 'CRM and customer support', al: ['servicenow', 'service now'] },
    { n: 'Oracle', cat: 'ERP and business systems', al: ['oracle'] },
    { n: 'Workday', cat: 'ERP and business systems', al: ['workday'] },
    { n: 'Kronos', cat: 'ERP and business systems', al: ['kronos'] },
    { n: 'E2open', cat: 'TMS and supply chain', al: ['e2open'] },
    { n: 'BluJay', cat: 'TMS and supply chain', al: ['blujay', 'blu jay'] },
    { n: 'OpenDock', cat: 'TMS and supply chain', al: ['opendock', 'open dock'] },
    { n: 'Slack', cat: 'communication and collaboration', al: ['slack'] },
    { n: 'Lark', cat: 'communication and collaboration', al: ['lark'] },
    { n: 'Confluence', cat: 'communication and collaboration', al: ['confluence'] },
    { n: 'Microsoft 365', cat: 'communication and collaboration', al: ['microsoft 365', 'office 365', 'm365', 'outlook', 'teams'] },
    { n: 'Google Workspace', cat: 'communication and collaboration', al: ['google workspace', 'gsuite', 'g suite', 'gmail', 'google sheets', 'google docs', 'google drive'] },
    { n: 'Citrix Workspace', cat: 'communication and collaboration', al: ['citrix'] },
    { n: 'VMware Horizon', cat: 'communication and collaboration', al: ['vmware', 'horizon'] },
    { n: 'Excel (PivotTables, basic VBA)', cat: 'productivity and documentation', al: ['excel', 'vba', 'pivottable', 'pivot'] },
    { n: 'Word', cat: 'productivity and documentation', al: ['word', 'ms word'] },
    { n: 'Access', cat: 'productivity and documentation', al: ['access', 'ms access'] },
    { n: 'Power Platform / Power Automate', cat: 'automation and AI', al: ['power platform', 'power automate', 'power apps', 'powerapps'] },
    { n: 'Copilot Studio', cat: 'automation and AI', al: ['copilot studio'] },
    { n: 'Google Apps Script', cat: 'automation and AI', al: ['apps script', 'appscript', 'google apps script'] },
    { n: 'Claude, ChatGPT, Gemini and Copilot', cat: 'automation and AI', al: ['claude', 'chatgpt', 'chat gpt', 'gemini', 'copilot', 'openai'] },
    { n: 'JavaScript, HTML/CSS and VS Code', cat: 'building small tools', al: ['javascript', 'html', 'css', 'vs code', 'vscode', 'visual studio code', 'notepad'] },
    { n: 'C++ and Laravel (basic level)', cat: 'building small tools', al: ['c++', 'laravel', 'php'] },
    { n: 'Telegram Bot API', cat: 'automation and AI', al: ['telegram'] }
  ];

  var namesByCategoryHtml =
    '<strong>CRM and customer support:</strong> Salesforce, Avaya, ServiceNow.<br>' +
    '<strong>ERP and business systems:</strong> Oracle, Workday, Kronos.<br>' +
    '<strong>TMS and supply chain:</strong> E2open, BluJay, OpenDock.<br>' +
    '<strong>Communication and collaboration:</strong> Five9 (contact center), Slack, Lark, Confluence, Microsoft 365, Google Workspace, Citrix and VMware Horizon.<br>' +
    '<strong>Productivity and documentation:</strong> Excel (PivotTables, basic VBA), Word, Access.<br>' +
    '<strong>Automation and AI:</strong> Power Platform, Copilot Studio, Google Apps Script, Claude, ChatGPT, Gemini, Copilot.<br>' +
    '<strong>Small tools:</strong> JavaScript, HTML/CSS, VS Code; C++ and Laravel at a basic level.';

  // ---------------------------------------------------------------------------------------------
  // Topics. keys: words / phrases that trigger the topic (plurals and small typos are handled).
  // a: answer (trusted HTML). next: follow-up chips. set: conversation state to remember.
  // ---------------------------------------------------------------------------------------------
  var INTENTS = [
    { id: 'hello', keys: ['hello', 'hi', 'hey', 'hiya', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'musta'],
      a: 'Hi! I&rsquo;m Tinker, Jonnel&rsquo;s bot assistant. Ask me about his services, experience, projects or tools, or tell me about your business and I&rsquo;ll show you where his experience fits.',
      next: ['What services do you offer?', 'Tell me about your experience', ASK_BUSINESS] },

    { id: 'who', keys: ['who are you', 'what are you', 'your name', 'tinker', 'are you a bot', 'are you real', 'are you human', 'are you ai', 'real person', 'live chat', 'chatgpt'],
      a: 'I&rsquo;m Tinker, Jonnel&rsquo;s bot assistant. I&rsquo;m an automated helper, not a live person and not a general AI model, so I only answer from what&rsquo;s on this site. If I can&rsquo;t answer something, I&rsquo;ll point you to Jonnel directly.',
      next: ['What services do you offer?', 'What tools do you use?', ASK_BUSINESS] },

    { id: 'services', keys: ['service', 'offer', 'help with', 'what do you do', 'what can you do', 'support', 'virtual assistant', 'admin', 'assist', 'can you help', 'how can you help'],
      a: 'Jonnel helps with: administrative and virtual assistance; data management and documentation; order and supply chain coordination; due diligence, credentialing and risk review; customer, sales and stakeholder support; digital tools, AI and automation; and healthcare and insurance claims support. Details are in the <a href="/#services">Services</a> section. Tell me what your business does and I can point to the part that fits.',
      next: [ASK_BUSINESS, 'Do you do data entry?', 'Supply chain experience?'] },

    { id: 'experience', keys: ['experience', 'background', 'years', 'career', 'history', 'worked', 'work history', 'resume', 'cv', 'confidential', 'employer', 'company', 'previous', 'where did you work', 'current role', 'current job', 'currently', 'seasoned', 'senior'],
      a: 'Jonnel has 6+ years in BPO and shared services, mostly with US clients, across healthcare, supply chain, logistics and telecom: data encoding, data assistance, customer support, supply chain coordination, and now due diligence, credentialing and risk review. The detailed history involves past employers and clients, so it&rsquo;s confidential and shared on request. <a href="/experience">Request to view it</a>.',
      next: ['What tools do you use?', ASK_BUSINESS] },

    { id: 'supply', keys: ['supply chain', 'logistic', 'order', 'warehouse', 'pod', 'bol', 'bill of lading', 'proof of delivery', 'coordinator', 'shipping', 'shipment', 'delivery', 'supplier', 'freight', '3pl', 'tms'],
      a: 'Yes. Jonnel has worked as a supply chain coordinator: tracking bulk orders end to end, coordinating retailers, warehouses and logistics partners, chasing delays, and securing PODs and BOLs so suppliers and customers get accurate information on time.',
      next: ['What tools do you use?', ASK_BUSINESS] },

    { id: 'data', keys: ['data entry', 'data', 'encoding', 'encoder', 'spreadsheet', 'record', 'documentation', 'clean', 'proofread', 'scan', 'paperwork'],
      a: 'Yes. Jonnel started in data encoding and later worked as a data assistant reviewing insurance claims: entering, validating and proofreading data, and turning scanned paper into clean digital records. He also builds Excel reports with PivotTables.',
      next: ['Tell me about your experience', 'What tools do you use?'] },

    { id: 'risk', keys: ['risk', 'compliance', 'due diligence', 'credentialing', 'verification', 'verify', 'audit', 'discrepancy'],
      a: 'Due diligence and credentialing are his current line of work, supporting sales teams: verifying documents, researching background information, checking compliance, and using available validation tools to spot discrepancies, so records stay accurate and audit-ready.',
      next: ['Can I see your work history?', 'How can I contact you?'] },

    // ---- tools: conversational, grouped by category, bigger picture, no tool names ----
    { id: 'tools', keys: ['tools', 'tool', 'software', 'system', 'tech', 'skills', 'skill', 'platform', 'stack', 'what do you use', 'what tools', 'erp', 'crm', 'tms', 'ai', 'application', 'programs'],
      set: { askBusiness: true },
      a: 'Short version: Jonnel has worked across the main kinds of business systems, which are CRM and customer-support platforms, ERP and back-office systems, TMS and supply chain tools, plus the communication, collaboration and productivity tools around them.<br><br>' +
         'In practice that has meant customer management (billing and order questions, status updates), order processing, logistics coordination (chasing delays, securing POD and BOL paperwork), documentation, and keeping daily operations moving. The software matters less than knowing how the pieces connect and getting a clean result. When a task keeps repeating, he also builds small tools and automations for it.<br><br>' +
         'What kind of business do you run? I&rsquo;ll show you where that experience fits.',
      next: ['Which specific systems?', 'Retail or shop', 'Logistics or supply chain', 'Healthcare or clinic'] },

    { id: 'toolnames', keys: ['which specific', 'specific system', 'specific tool', 'specific software', 'name the tools', 'list of tools', 'full list', 'exact tools', 'which tools', 'which systems', 'what software', 'what systems', 'names'],
      a: 'These are the ones confirmed on his profile, by category:<br>' + namesByCategoryHtml + '<br><br>The full list is confidential and shared on request: <a href="/tools">see the tools page</a>.',
      next: ['Tell me about your projects', ASK_BUSINESS] },

    { id: 'projects', keys: ['project', 'portfolio', 'built', 'build', 'app', 'pdf merger', 'template', 'docx', 'generator', 'extractor', 'telegram', 'receipt', 'dashboard', 'power automate', 'merger', 'merge', 'bot', 'outlook', 'automation', 'integration', 'finance', 'financial', 'workshop', 'smart document'],
      a: 'Jonnel built <a href="/projects/anyjuanpos">AnyJuanPOS</a>, a web-based point-of-sale and business management app that works offline, syncs, and tracks income and expenses. In the workshop: a working business receipt tracker (a Telegram bot plus web dashboard: send a receipt photo and it is read, saved to a database, and totalled on the dashboard), a Smart Document Processor that reads PDFs, photos and scans and fills reusable templates, an Outlook email template generator (Excel and VBA), a PDF merger planned to grow into a universal document merger, and a Power Automate integration tool. See <a href="/#projects">Projects</a>.',
      next: ['Can I try AnyJuanPOS?', ASK_BUSINESS, 'How can I contact you?'] },

    { id: 'pos', keys: ['anyjuanpos', 'any juan', 'pos', 'point of sale', 'trial', 'demo', 'test', 'testing', 'try', 'offline', 'pwa', 'install', 'tablet', 'mobile', 'customize', 'customise', 'modify', 'different business', 'any business', 'cashier'],
      a: 'AnyJuanPOS is a web application that can also be installed as an app (PWA) and keeps working offline. It isn&rsquo;t only for retailers: it can be modified to fit your business. You can use it on mobile, tablet, PC or laptop. A trial or testing is available on request: email <a href="mailto:' + EMAIL + '?subject=AnyJuanPOS%3A%20trial%20or%20question">' + EMAIL + '</a>. More on the <a href="/projects/anyjuanpos">project page</a>.',
      next: [ASK_BUSINESS, 'How can I contact you?'] },

    // ---- "what slows you down" answers, used after a business is described (and any time) ----
    { id: 'pain-receipts', keys: ['receipt', 'expense', 'bookkeeping', 'accounting', 'sales report', 'receipts and expenses', 'tax'],
      a: 'For receipts and expenses, the business receipt tracker is the match: send a receipt photo through Telegram and the details are read, saved to a database, and totalled on a dashboard. <a href="/#projects">See Projects</a>.',
      next: ['Can I try AnyJuanPOS?', 'How can I contact you?'] },
    { id: 'pain-sales', keys: ['inventory', 'stock', 'sales and stock', 'selling', 'cashier', 'point of sale', 'checkout'],
      a: 'For sales and stock, AnyJuanPOS is built for that: it works offline, syncs when you&rsquo;re back online, and tracks income and expenses. <a href="/projects/anyjuanpos">Project page</a>.',
      next: ['Can I try AnyJuanPOS?', 'How can I contact you?'] },
    { id: 'pain-docs', keys: ['paperwork and documents', 'documents', 'letters', 'forms', 'pdf', 'scans', 'filing', 'typing', 'retype'],
      a: 'For paperwork, Jonnel has years of hands-on document work, and he is planning a Smart Document Processor that reads PDFs, photos and scans and fills reusable templates, plus a PDF merger. <a href="/#projects">See Projects</a>.',
      next: ['Tell me about your experience', 'How can I contact you?'] },
    { id: 'pain-email', keys: ['repeated emails', 'emails', 'email templates', 'replies', 'same email', 'canned'],
      a: 'For repeated emails, he is planning an Outlook email template generator: fill in a few details and get a consistent, ready-to-send message. It can be built around your own workflow with Excel and VBA.',
      next: ['Tell me about your projects', 'How can I contact you?'] },
    { id: 'pain-followup', keys: ['follow ups', 'follow up', 'follow-up', 'followups', 'follow-ups with customers or suppliers', 'customers and suppliers', 'chasing', 'delays', 'late orders', 'complaints', 'disputes'],
      a: 'Following things through is his habit: when an order is delayed or a document is missing, he takes ownership, follows up and escalates to the right people until it&rsquo;s closed. That is the order and supply chain coordination and customer support part of his work.',
      next: ['Supply chain experience?', 'How can I contact you?'] },

    // ---- about Jonnel as a person (third person, grounded in "My approach" and "How I can help") ----
    { id: 'person', keys: ['personality', 'character', 'what kind of person', 'what is he like', 'what is jonnel like', 'what are you like', 'describe him', 'describe jonnel', 'describe yourself', 'who is jonnel', 'tell me about jonnel', 'tell me about him', 'tell me about yourself', 'about the person', 'about him', 'strength', 'best quality', 'qualities', 'quality', 'traits', 'trait', 'work habit', 'work style', 'work ethic', 'how does he work', 'how do you work', 'working with him', 'working with you', 'what is it like to work', 'soft skill', 'values', 'mindset', 'attitude', 'team player', 'good fit', 'why hire', 'why should i', 'stand out', 'different from', 'what makes him'],
      a: 'Jonnel is someone who sees things through. When an order is delayed or a document is missing, he takes ownership, follows up, and escalates to the right people until it&rsquo;s closed. He&rsquo;s also curious: he learns how a system works, sees how the pieces connect, then looks for what would make the work simpler, which is why he sometimes ends up building a small tool for it. And after years of reviewing claims and running due diligence checks, he reads documents closely and flags what doesn&rsquo;t add up.<br><br>Want a closer look at one side of him?',
      next: ['How does he learn new systems?', 'How does he handle problems?', 'How does he communicate?', 'Is he detail-oriented?'] },

    { id: 'p-learn', keys: ['learn', 'learner', 'learning', 'curious', 'curiosity', 'adapt', 'adaptable', 'adaptability', 'new system', 'new tool', 'new software', 'pick up', 'quick learner', 'fast learner', 'grow', 'training', 'keep up', 'ai enthusiast', 'how does he learn'],
      a: 'He learns by using things. He has worked in many business systems (CRM, ERP, TMS, ticketing) and picked up AI tools to speed up routine work, and he keeps up with AI and automation through courses and videos, then tests what he learns on real tasks so it turns into something useful. With his IT background, when a task keeps coming back he&rsquo;ll build a small tool for it. <a href="/#projects">AnyJuanPOS and the receipt tracker</a> are examples.',
      next: ['What tools do you use?', 'Tell me about your projects', 'How does he handle problems?'] },

    { id: 'p-detail', keys: ['detail', 'detail oriented', 'detail-oriented', 'attention to detail', 'careful', 'accurate', 'accuracy', 'mistake', 'error', 'thorough', 'meticulous', 'proofread', 'quality of work'],
      a: 'Yes, and it comes from the work. Reviewing insurance claims, tracking paperwork, and running due diligence checks taught him to read a document closely and flag what doesn&rsquo;t add up before it becomes a problem. He also proofreads his own work before it goes out.',
      next: ['Is he reliable?', 'Tell me about your experience', 'How does he handle problems?'] },

    { id: 'p-owner', keys: ['reliable', 'dependable', 'accountable', 'accountability', 'ownership', 'responsible', 'responsibility', 'follow through', 'follow-through', 'initiative', 'proactive', 'trust', 'trustworthy', 'integrity', 'honest', 'is he reliable'],
      a: 'When an order is delayed or a document is missing, he takes ownership: he follows up, tries to resolve it, and escalates to the right people instead of assuming someone else will. He also handles sensitive information (claims, invoices, credentials, client records) with care, which is why details about past employers and clients are shared on request, not posted.',
      next: ['Is he detail-oriented?', 'How does he handle problems?', 'How can I contact you?'] },

    { id: 'p-challenge', keys: ['challenge', 'pressure', 'stress', 'problem solving', 'problem-solving', 'solve problems', 'difficult', 'tough', 'conflict', 'angry customer', 'upset customer', 'under pressure', 'how does he handle', 'handle problems', 'handle issues', 'deadline', 'busy'],
      a: 'His habit is to find out where something is stuck, update the people waiting, and escalate to the right team instead of letting it sit. He has handled disputes calmly in customer support, and coordinating retailers, warehouses and 3PLs taught him that one late step affects the next, so he looks for where work slows down and what would make it smoother.',
      next: ['How does he communicate?', 'Supply chain experience?', 'Is he reliable?'] },

    { id: 'p-comm', keys: ['communicate', 'communicates', 'communication', 'communicator', 'soft skills', 'english', 'talk to clients', 'customer handling', 'tone', 'how does he communicate', 'how does he talk', 'explain things'],
      a: 'Plainly and professionally. Years of calls, chats and emails with US customers, onshore and offshore teams, and partners such as retailers, suppliers, landlords, 3PLs, hospitals and doctors taught him to read different communication styles, adjust his tone, set expectations, and keep everyone updated until the issue is resolved.',
      next: ['How does he handle problems?', 'Tell me about your experience', 'How can I contact you?'] },

    { id: 'p-process', keys: ['process', 'improve', 'improvement', 'efficient', 'efficiency', 'streamline', 'simplify', 'better way', 'think in processes', 'workflow'],
      a: 'He thinks in processes. Coordinating with retailers, warehouses and 3PLs showed him how each step connects to and affects the next, so he looks for where the work slows down and what would make it simpler. Sometimes the answer is a better routine, and sometimes it&rsquo;s a small tool or automation built for the job.',
      next: ['Tell me about your projects', 'What services do you offer?', ASK_BUSINESS] },

    { id: 'p-weak', keys: ['weakness', 'weaknesses', 'flaw', 'flaws', 'weak point', 'bad at', 'not good at', 'areas to improve', 'improve on', 'downside', 'limitation', 'limitations'],
      a: 'I only know what&rsquo;s on this site, and it doesn&rsquo;t list weaknesses. One honest data point: some skills are still at a basic level, such as Laravel and VBA, and he says so. He keeps learning, but for a straight answer about how he sees his own growth areas, ask him directly: <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.',
      next: ['How does he learn new systems?', 'How can I contact you?'] },

    { id: 'hire', keys: ['hire', 'hiring', 'available', 'availability', 'freelance', 'remote', 'full time', 'part time', 'in-house', 'team', 'job', 'opportunity', 'work with you', 'work together', 'start', 'engage', 'recruit'],
      a: 'Yes. Jonnel is looking for remote work, either in-house with a company or directly with a client, and is open to freelance projects. For availability and start dates, the quickest route is email or a call.',
      next: ['How can I contact you?', ASK_BUSINESS] },

    { id: 'rates', keys: ['rate', 'price', 'pricing', 'cost', 'how much', 'salary', 'fee', 'budget', 'quote', 'cheap', 'expensive'],
      a: 'Rates aren&rsquo;t listed on the site because they depend on the work. Send a short description of what you need to <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> and Jonnel will reply.',
      next: ['How can I contact you?'] },

    { id: 'contact', keys: ['contact', 'email', 'phone', 'call', 'number', 'reach', 'linkedin', 'message', 'talk', 'text', 'speak', 'meet'],
      a: contactHtml,
      next: ['Are you open to freelance work?', 'What services do you offer?'] },

    { id: 'where', keys: ['where', 'location', 'based', 'live', 'country', 'philippines', 'antipolo', 'timezone', 'time zone', 'hours', 'schedule'],
      a: 'Jonnel is based in Antipolo, Philippines, and has worked mainly with US clients. For working hours and time-zone overlap, please ask by email.',
      next: ['How can I contact you?'] },

    { id: 'education', keys: ['education', 'degree', 'school', 'college', 'studied', 'icct', 'graduate', 'study'],
      a: 'Associate&rsquo;s degree in Information Technology from ICCT Colleges (2016&ndash;2019).',
      next: ['Tell me about your experience'] },

    { id: 'thanks', keys: ['thanks', 'thank you', 'thank', 'salamat', 'great', 'awesome', 'cool', 'nice', 'perfect'],
      a: 'You&rsquo;re welcome! If you&rsquo;d like to talk it through, you can reach Jonnel at <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.',
      next: [ASK_BUSINESS] }
  ];

  // ---------------------------------------------------------------------------------------------
  // What visitors say they run. Answers connect only to things that are on Jonnel's profile.
  // ---------------------------------------------------------------------------------------------
  var BUSINESSES = [
    { id: 'retail', label: 'a retail business',
      keys: ['retail', 'store', 'shop', 'sari sari', 'sari-sari', 'grocery', 'boutique', 'convenience', 'mini mart', 'minimart', 'market', 'merchandise', 'tindahan', 'pharmacy store', 'hardware'],
      a: 'Retail lives on orders, stock and suppliers showing up on time. Jonnel has coordinated retailers, warehouses and logistics partners and chased late orders to the finish, so he knows where retail operations slip. For the daily work, <a href="/projects/anyjuanpos">AnyJuanPOS</a> (works offline, tracks sales, income and expenses) and the receipt tracker were built with small shops in mind.' },
    { id: 'food', label: 'a food business',
      keys: ['restaurant', 'cafe', 'karinderia', 'carinderia', 'eatery', 'canteen', 'bakery', 'catering', 'food', 'coffee', 'bar', 'resto', 'milk tea', 'diner'],
      a: 'Jonnel hasn&rsquo;t worked inside a restaurant (that&rsquo;s not on his profile), but the daily problems are familiar ones: sales, supplier deliveries, receipts and expenses, and knowing whether the business is thriving. <a href="/projects/anyjuanpos">AnyJuanPOS</a> and the receipt tracker are built for exactly that kind of small, busy operation.' },
    { id: 'logistics', label: 'a logistics or supply chain business',
      keys: ['logistics', 'trucking', 'freight', '3pl', 'warehouse', 'shipping', 'courier', 'supply chain', 'distribution', 'wholesale', 'import', 'export', 'forwarder', 'cargo', 'delivery service', 'distributor'],
      a: 'This is the closest match to his background. Jonnel has worked as a supply chain coordinator: tracking bulk orders end to end, coordinating retailers, warehouses, 3PLs and logistics partners, chasing delays, and securing POD and BOL documents in TMS and supply chain platforms. Many parties touch one order, and he is the person who follows it through.' },
    { id: 'health', label: 'a healthcare or insurance business',
      keys: ['clinic', 'hospital', 'doctor', 'medical', 'dental', 'dentist', 'pharmacy', 'health', 'healthcare', 'insurance', 'claims', 'hmo', 'laboratory', 'therapy', 'nursing', 'patient'],
      a: 'Healthcare and insurance are a big part of his background. He has coordinated with hospitals, doctors and internal teams, handled claims filing and validation, and reviewed claim forms and invoices for completeness, justification and authenticity. He also treats sensitive information, including HIPAA-protected data, with care, so confidentiality isn&rsquo;t a worry.' },
    { id: 'property', label: 'a property or rental business',
      keys: ['landlord', 'property', 'real estate', 'rental', 'apartment', 'tenant', 'lease', 'condo', 'realty', 'broker', 'boarding house', 'dorm'],
      a: 'Landlords are among the parties Jonnel has worked with, and the work around property is paperwork-heavy: notices, records, follow-ups and clear communication. He is good at keeping documents organized and every request followed up, and the planned Smart Document Processor and email template tools are aimed at repeated letters and notices.' },
    { id: 'online', label: 'an online selling business',
      keys: ['online', 'ecommerce', 'e-commerce', 'dropship', 'dropshipping', 'reseller', 'online shop', 'online store', 'shopee', 'lazada', 'shopify', 'facebook seller', 'tiktok shop', 'seller', 'live selling'],
      a: 'Online selling comes down to orders, customer messages and shipments that don&rsquo;t get lost. Jonnel has years of handling order status questions, delays and delivery paperwork, and following up until an issue is closed. (Specific selling platforms aren&rsquo;t on his profile, so I won&rsquo;t claim them.) For sales, stock and expenses, <a href="/projects/anyjuanpos">AnyJuanPOS</a> and the receipt tracker can help.' },
    { id: 'office', label: 'an office, agency or service business',
      keys: ['agency', 'consulting', 'consultant', 'accounting firm', 'law', 'lawyer', 'office', 'bpo', 'call center', 'startup', 'start up', 'admin', 'freelancer', 'solo', 'small business', 'company', 'service business', 'coach', 'studio', 'school', 'ngo', 'nonprofit'],
      a: 'For office and service businesses, his strengths are the work behind the work: administrative and virtual assistance, clean records and documentation, due diligence and verification, and customer and stakeholder follow-up. He also builds small tools and automations when a task keeps repeating, such as templates for letters and emails.' }
  ];

  var STARTERS = ['What services do you offer?', 'Tell me about your experience', 'What tools do you use?', ASK_BUSINESS];
  var BUSINESS_CHIPS = ['Retail or shop', 'Food business', 'Logistics or supply chain', 'Healthcare or clinic', 'Online selling', 'Office or services'];
  var PAIN_CHIPS = ['Receipts and expenses', 'Sales and stock', 'Paperwork and documents', 'Repeated emails', 'Follow-ups with customers or suppliers'];

  // ---------------------------------------------------------------------------------------------
  // Matching: plurals, small typos, phrases, and a little memory of the conversation.
  // ---------------------------------------------------------------------------------------------
  var state = { askBusiness: false, askPain: false, business: null, last: null };

  function clean(t) { return ' ' + t.toLowerCase().replace(/[^a-z0-9+&\- ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; }
  function stem(w) { return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w; }
  function stemmed(t) { return ' ' + clean(t).trim().split(' ').map(stem).join(' ') + ' '; }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) { d[0][j] = j; }
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  function scoreKeys(q, tokens, keys) {
    var score = 0;
    keys.forEach(function (k) {
      var sk = stemmed(k);
      if (q.indexOf(sk) !== -1) { score += sk.trim().indexOf(' ') !== -1 ? 3 : 1.2; return; }
      // typo tolerance for single words of 5+ letters
      var kw = sk.trim();
      if (kw.length >= 5 && kw.indexOf(' ') === -1) {
        for (var i = 0; i < tokens.length; i++) {
          var t = tokens[i];
          if (t.length >= 5 && lev(t, kw) <= (kw.length >= 8 ? 2 : 1)) { score += 1; break; }
        }
      }
    });
    return score;
  }

  function bestOf(list, text) {
    var q = stemmed(text), tokens = q.trim().split(' '), best = null, bestScore = 0;
    list.forEach(function (it) {
      var s = scoreKeys(q, tokens, it.keys);
      if (it.id === state.last && s > 0) s += 0.2; // tiny nudge towards the current topic
      if (s > bestScore) { best = it; bestScore = s; }
    });
    return { item: best, score: bestScore };
  }

  var YES = /^(yes|yeah|yep|yup|sure|ok|okay|go ahead|please|oo|sige|of course)\b/;
  var NO = /^(no|nope|nah|not now|later|skip|hindi)\b/;

  function emailAbout(text) {
    var body = encodeURIComponent('Hi Jonnel,\n\n' + text + '\n');
    return 'mailto:' + EMAIL + '?subject=Question%20from%20your%20website&amp;body=' + body;
  }

  // Returns { html, next }
  function reply(raw) {
    var text = raw.trim(), c = clean(text).trim();

    // 1. Is the visitor asking about one specific tool? Only confirm what is on the profile.
    var m = c.match(/(?:do you (?:know|use|have experience (?:with|in|on)|work with)|experience (?:with|in|on)|familiar with|have you (?:used|worked with)|can you use|does he (?:know|use))\s+(.+)$/);
    if (m) {
      var subj = ' ' + m[1].replace(/[?!.]+$/, '').trim() + ' ';
      var hit = TOOLS.filter(function (t) { return t.al.some(function (a) { return subj.indexOf(' ' + a + ' ') !== -1 || (a.length > 4 && subj.indexOf(a) !== -1); }); });
      if (hit.length) {
        var line = hit.map(function (t) { return '<strong>' + t.n + '</strong> (' + t.cat + ')'; }).join(', ');
        return { html: 'Yes, that&rsquo;s on his profile: ' + line + '. More detail is shared on request: <a href="/tools">tools page</a>.', next: ['Which specific systems?', ASK_BUSINESS] };
      }
      if (subj.trim().split(' ').length <= 3 && !/\b(any|some|other|more|anything|the|a|an|this|that|data|excel|customers?|orders?|logistics|claims?|admin|sales|support|projects?|bpo|remote|freelance|tools?|systems?|software|experience|background|skills?|team|clients?|me|us|you|him|jonnel)\b/.test(subj)) {
        return { html: 'I can&rsquo;t confirm that one from Jonnel&rsquo;s profile, so I won&rsquo;t guess. He picks new tools up quickly, though. You can ask him directly: <a href="' + emailAbout(text) + '">email this question</a>.', next: ['Which specific systems?', 'How can I contact you?'] };
      }
    }

    // 2. Visitor is answering "what kind of business do you run?"
    var businessTalk = /\b(i|we)\b.{0,12}\b(run|own|have|manage|operate|work|am in|are in|sell|start|started|do)\b|\bmy (business|shop|store|company|clinic|restaurant|startup|office|team)\b|\bour (business|shop|store|company|clinic|restaurant|office)\b|\bi'?m a\b/.test(c);
    if (state.askBusiness || businessTalk || BUSINESS_CHIPS.indexOf(text) !== -1) {
      var b = bestOf(BUSINESSES, text);
      // a clear question about something else wins over a weak business guess
      if (b.item && !businessTalk && BUSINESS_CHIPS.indexOf(text) === -1 && bestOf(INTENTS, text).score >= b.score) b = { item: null, score: 0 };
      if (b.item && b.score >= 1) {
        state.askBusiness = false; state.askPain = true; state.business = b.item.id;
        return { html: 'Thanks, that helps. ' + b.item.a + '<br><br>What slows you down the most right now? Pick one or tell me in your own words.', next: PAIN_CHIPS };
      }
      if (state.askBusiness && !YES.test(c) && c.split(' ').length >= 2 && !bestOf(INTENTS, text).item) {
        state.askBusiness = false;
        return { html: 'Thanks for sharing. I don&rsquo;t have a direct match for that kind of business, but Jonnel&rsquo;s strengths carry over: keeping orders, records and follow-ups organized, clear communication with customers and partners, and building small tools for repetitive work. Tell him a little more and he can say how he&rsquo;d help: <a href="' + emailAbout('My business: ' + text) + '">email Jonnel</a>.', next: ['What services do you offer?', 'How can I contact you?'] };
      }
    }

    // 3. Yes / no to Tinker's own question
    if (state.askBusiness && YES.test(c)) {
      return { html: 'Great. What kind of business is it?', next: BUSINESS_CHIPS };
    }
    if (state.askBusiness && NO.test(c)) {
      state.askBusiness = false;
      return { html: 'No problem. What else would you like to know?', next: STARTERS };
    }

    // 4. Chips that start the business conversation
    if (text === ASK_BUSINESS || /\b(my business|about my business|about my company|i have a business)\b/.test(c)) {
      state.askBusiness = true;
      return { html: 'Happy to. What kind of business do you run? Pick one, or just describe it in a few words.', next: BUSINESS_CHIPS };
    }

    // 5. Normal topics
    var r = bestOf(INTENTS, text);
    if (r.item && r.score >= 1) {
      var it = r.item;
      state.last = it.id;
      if (it.set && it.set.askBusiness) { state.askBusiness = true; }
      return { html: it.a, next: it.next && it.next.length ? it.next : STARTERS };
    }

    // 6. Short follow-ups that rely on the last topic
    if (state.last && /^(more|tell me more|go on|and|what else|how so|why|really|explain)\b/.test(c)) {
      var prev = INTENTS.filter(function (i) { return i.id === state.last; })[0];
      if (prev) return { html: prev.a + '<br><br>For anything beyond this, email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.', next: prev.next || STARTERS };
    }

    // 7. Not sure
    state.last = null;
    return {
      html: 'I&rsquo;m not sure I got that. I can help with Jonnel&rsquo;s services, experience, projects and tools, or you can tell me about your business. For anything else, <a href="' + emailAbout(text) + '">email this question to Jonnel</a> or call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>.',
      next: STARTERS
    };
  }

  // ---------- build the widget ----------
  var root = document.createElement('div');
  root.className = 'chat';
  root.innerHTML =
    '<button class="chat-launch" type="button" aria-expanded="false" aria-controls="chat-panel">' +
      '<span class="chat-launch-label">Chat with Tinker</span>' +
    '</button>' +
    '<section class="chat-panel" id="chat-panel" role="dialog" aria-label="Tinker, Jonnel&rsquo;s bot assistant" hidden>' +
      '<header class="chat-head">' +
        '<div><strong>Tinker</strong><span>Jonnel&rsquo;s bot assistant &middot; automated</span></div>' +
        '<button class="chat-close" type="button" aria-label="Close chat">&times;</button>' +
      '</header>' +
      '<div class="chat-log" role="log" aria-live="polite"></div>' +
      '<div class="chat-chips"></div>' +
      '<form class="chat-form" autocomplete="off">' +
        '<label class="visually-hidden" for="chat-input">Type your message</label>' +
        '<input id="chat-input" type="text" maxlength="300" placeholder="Ask Tinker&hellip;" enterkeyhint="send">' +
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
    // long bot answers: show them from the first line; everything else: stay at the bottom
    if (who === 'bot' && el.offsetHeight > log.clientHeight * 0.6) log.scrollTop = Math.max(el.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - 10, 0); else log.scrollTop = log.scrollHeight;
    return el;
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
    chips.textContent = '';
    var typing = addMsg('bot typing', 'Tinker is typing…', false);
    var out = reply(text);
    window.setTimeout(function () {
      typing.remove();
      addMsg('bot', out.html, true);
      setChips(out.next && out.next.length ? out.next : STARTERS);
    }, 350);
  }

  function open() {
    panel.hidden = false;
    launch.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    if (!started) {
      started = true;
      addMsg('bot', 'Hi, I&rsquo;m Tinker, Jonnel&rsquo;s bot assistant. I answer from what&rsquo;s on this site: services, experience, projects and tools. I&rsquo;m an automated bot, not a live person. Tell me what kind of business you have and I&rsquo;ll show you where Jonnel&rsquo;s experience fits.', true);
      setChips([ASK_BUSINESS, 'What services do you offer?', 'What tools do you use?', 'Tell me about your projects']);
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
