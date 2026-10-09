/* DCC Information Hub — Version 1
 * Deterministic JavaScript/Markdown prototype. No AI API.
 * HTML = presentation | CSS = existing design | JS = interaction | MD = source of truth
 */
(() => {
  'use strict';

  const CONFIG = {
    dataFiles: [
      '01-faqs-identity.md',
      '02-events-calendar.md',
      '03-forms-registration.md',
      '04-ministries-fellowships-interest-groups.md',
      '05-leadership-workforce.md',
      '06-schools-resources.md',
      '07-external-ecosystem-socials.md'
    ],
    eventsUrl: 'https://www.davidschristiancentre.org/events',
    sermonsUrl: 'https://www.davidschristiancentre.org/resources/sermons/victory-celebrations',
    mainSite: 'https://www.davidschristiancentre.org/'
  };

  const state = {
  history: [],
  stack: [],
  isMainMenu: false,
  data: {},
  events: [],
  worshipCentres: [],
  ready: false,
  loading: true,
  awaitingWhatsApp: false,
  sessionId: crypto.randomUUID(),
  currentContext: null
};

  const els = {
    body: document.body,
    chat: document.querySelector('.chat-body'),
    input: document.querySelector('.input-box input'),
    send: document.querySelector('.send'),
    quickStart: document.querySelector('.quick-start'),
    status: document.querySelector('.bot-status'),
    privacy: document.querySelector('.privacy')
  };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }

  function cleanMarkdown(md) {
    return md
      .replace(/^---\s*$/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\s+$/gm, '')
      .trim();
  }

  function parseSections(md) {
    const lines = md.split(/\r?\n/);
    const sections = [];
    let current = null;
    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (match) {
        if (current) sections.push(current);
        current = { level: match[1].length, title: match[2].trim(), lines: [] };
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (current) sections.push(current);
    return sections;
  }

  function findSection(file, title) {
    const sections = parseSections(state.data[file] || '');
    const wanted = title.toLowerCase();
    return sections.find(s => s.title.toLowerCase() === wanted) ||
      sections.find(s => s.title.toLowerCase().includes(wanted));
  }

  function sectionText(section) {
    return section ? cleanMarkdown(section.lines.join('\n')) : '';
  }

  function allText() {
    return Object.entries(state.data).map(([file, md]) => ({ file, text: cleanMarkdown(md) }));
  }

  function link(label, url) {
    return `<a class="hub-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  }

  function addBot(html, label = 'Information Hub') {
    const wrap = document.createElement('div');
    wrap.className = 'hub-entry bot-entry';
    wrap.innerHTML = `<div class="welcome-label">${escapeHtml(label)}</div><div class="message">${html}</div>`;
    els.chat.appendChild(wrap);
    scrollChat();
  }

  function addUser(text) {
    const wrap = document.createElement('div');
    wrap.className = 'hub-entry user-entry';
    wrap.innerHTML = `<div class="user-message">${escapeHtml(text)}</div>`;
    els.chat.appendChild(wrap);
    scrollChat();
  }

  function scrollChat() {
    els.chat.scrollTop = els.chat.scrollHeight;
  }

  function addMenu(items, options = {}) {
  const box = document.createElement('div');
  box.className = 'hub-menu';

  if (options.title) {
    const title = document.createElement('div');
    title.className = 'hub-menu-title';
    title.textContent = options.title;
    box.appendChild(title);
  }

  items.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'hub-option';
    btn.type = 'button';
    btn.innerHTML =
      `<span class="hub-number">${i + 1}</span><span>${escapeHtml(item.label)}</span>`;

    btn.addEventListener('click', () => {

      // Only save the current screen when moving deeper
      // from an existing submenu/result screen.
      if (!state.isMainMenu) {
        state.stack.push({
          nodes: Array.from(els.chat.children),
          isMainMenu: state.isMainMenu
        });
      }

      els.chat.innerHTML = '';
      state.isMainMenu = false;
      state.currentContext = item.label;

      item.action();
    });

    box.appendChild(btn);
  });

  els.chat.appendChild(box);
  scrollChat();
}

async function recordContactEvent(entryPoint, context = null) {
  try {
    const res = await fetch('https://dcc-information-hub.onrender.com/api/contact-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: state.sessionId,
        entry_point: entryPoint,
        context: context
      })
    });

    const result = await res.json();

    if (!result.success) {
      console.error('Contact event was not recorded:', result);
    } else {
      console.log('Contact event recorded:', result);
    }

  } catch (error) {
    console.error('Could not record contact event:', error);
  }
}

  function addUtilityButtons(options = {}) {
  const box = document.createElement('div');
  box.className = 'hub-utility';

  const buttons = [
    ['← Back', goBack]
  ];

  // Only show Main menu when Back has a previous submenu
  // to return to.
  if (state.stack.length > 0) {
    buttons.push(['⌂ Main menu', showMainMenu]);
  }

  // Dedicated Contact the Team screens can hide this button.
  if (options.showContact !== false) {
    buttons.push([
      'Contact Our Team',
      () => {
        state.stack.push({
          nodes: Array.from(els.chat.children),
          isMainMenu: state.isMainMenu
        });

        els.chat.innerHTML = '';
        state.isMainMenu = false;

        recordContactEvent('contextual', state.currentContext);
        help(false);
      }
    ]);
  }

  buttons.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hub-utility-btn';
    b.textContent = label;
    b.addEventListener('click', fn);
    box.appendChild(b);
  });

  els.chat.appendChild(box);
}

  function navigate(label, action) {
  state.stack.push(Array.from(els.chat.children));

  els.chat.innerHTML = '';
  addUser(label);
  action();
}

  function showMainMenu() {
  els.chat.innerHTML = '';
  state.stack = [];
  state.isMainMenu = true;

  addBot('<strong>Welcome! Please choose an option below to get started.</strong>');

  addMenu([
    {label:'Church Information / Services', action:() => churchMenu()},
    {label:'Upcoming Events', action:() => eventsMenu()},
    {label:'Sermons & Media', action:() => sermonsMenu()},
    {label:'Forms & Registration', action:() => formsMenu()},
    {label:'Giving', action:() => giving()},
    {label:'Pastors & Ministers / Workforce Leaders', action:() => leadershipMenu()},
    {label:'DCC Schools / Resources', action:() => resourcesMenu()},
    {
  label:'Contact the Team',
  action:() => {
    recordContactEvent('main_menu', null);
    help(true);
  }
}
  ]);
}

  function restart() {
    els.chat.innerHTML = '';
    state.stack = [];
state.currentContext = null;
    state.history = [];
    addBot('<strong>Hello 👋</strong><br>Welcome to the DCC Information Hub. What would you like to know?');
    showMainMenu();
  }

  function goBack() {
  if (state.stack.length === 0) {
    showMainMenu();
    return;
  }

  const previousScreen = state.stack.pop();

  els.chat.innerHTML = '';

  previousScreen.nodes.forEach(node => {
    els.chat.appendChild(node);
  });

  state.isMainMenu = previousScreen.isMainMenu;

  scrollChat();
}

  function faqSection(title) {
    return findSection('01-faqs-identity.md', title);
  }

  function churchMenu() {
    addBot('<strong>Church Information & Services</strong><br>What would you like to find out?');
    addMenu([
      {label:'Mainland — Victory Dome', action:() => branchDetails('Mainland — Victory Dome')},
      {label:'Island — DCC Lekki', action:() => branchDetails('Island — DCC Lekki')},
      {label:'About DCC', action:() => aboutDcc()}
    ]);
    addUtilityButtons();
  }

  function branchDetails(which) {
  const isMainland = which.includes('Mainland');

  const centre = state.worshipCentres.find(c => {
    if (isMainland) {
      return c.name === 'DCC Mainland (Victory Dome)';
    }

    return c.name === 'DCC Island (DCC Lekki)';
  });

  if (!centre) {
    addBot('<strong>Branch information unavailable.</strong><br>I could not find this worship centre in the DCC Information Hub database.');
    addUtilityButtons();
    return;
  }

  let html = `<strong>${escapeHtml(centre.name)}</strong>`;

  if (centre.address) {
    html += `<div class="md-result"><strong>Address:</strong><br>${escapeHtml(centre.address)}</div>`;
  }

  if (Array.isArray(centre.phones) && centre.phones.length) {
    html += `<div class="md-result"><strong>Phone:</strong> ${centre.phones.map(escapeHtml).join(' / ')}</div>`;
  }

  if (Array.isArray(centre.services) && centre.services.length) {
    html += `<div class="md-result"><strong>Service Times</strong><br>`;

    centre.services.forEach(service => {
      const formatServiceTime = (timeValue) => {
  if (!timeValue) return '';

  const [hour, minute] = timeValue.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return minute === 0
    ? `${displayHour} ${period}`
    : `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

let time = formatServiceTime(service.start_time);

if (service.end_time) {
  time += ` – ${formatServiceTime(service.end_time)}`;
}

      html += `${escapeHtml(service.day)} — ${escapeHtml(service.label)}: ${escapeHtml(time)}<br>`;
    });

    html += `</div>`;
  }

  addBot(html);
  addUtilityButtons();
}

  function aboutDcc() {
    const html =
      `<div class="md-result">` +
      `Welcome to David’s Christian Centre, which we fondly call DCC. We are the home of victorious people, and we are deeply committed to raising a victorious community by schooling and training everyone through the Word of Faith into a life of 100% victory, 100% of the time.` +
      `<br><br>` +
      `We get our name from a simple yet powerful scripture, <strong>(1 Chronicles 18:6b)</strong>: just as David never lost a battle, God's walk with us will be the exact same. Everything we do is built around raising victorious people through the Word of Faith and on taking Bible-based principles and actually living them out day by day in our everyday lives.` +
      `<br><br>` +
      `Our ministry began in a parlor in 1996, when one man chose to heed God's call to serve. In September 2026, we celebrated our 30th anniversary. We are so glad you are here to learn more about who we are.` +
      `</div>`;
    addBot(html);
    addUtilityButtons();
  }

  function formatLines(text) {
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return '';
    return `<ul>${lines.map(line => `<li>${escapeHtml(line.replace(/^•\s*/,''))}</li>`).join('')}</ul>`;
  }

  function extractHeadings(file, level = 3) {
    return parseSections(state.data[file] || '').filter(s => s.level === level);
  }

  function parseForms() {
    return extractHeadings('03-forms-registration.md', 3)
      .filter(s => /^\d+\./.test(s.title))
      .map(s => {
        const title = s.title.replace(/^\d+\.\s*/, '');
        const body = s.lines.join('\n');
        const url = (body.match(/https?:\/\/\S+/) || [])[0] || '';
        return {title, section:s, url:url.replace(/[)>.,]+$/g,'')};
      });
  }

  function formsMenu() {
    const forms = parseForms();
    addBot('<strong>Forms & Registration</strong><br>Select the form you need.');
    addMenu(forms.map(f => ({label:f.title, action:() => formDetails(f.title)})));
    addUtilityButtons();
  }

function getFormMessage(title) {
  const t = title.toLowerCase();

  if (t.includes('interest group')) {
    return {
      message:
        'Click the button below to register for an interest group.',
      button:
        'Register'
    };
  }

  if (t.includes('first timer')) {
    return {
      message:
        'Welcome to David’s Christian Centre. Please click the button below to fill the form, and a member of our team will reach out to welcome you warmly.',
      button:
        'Fill Welcome Form'
    };
  }

  if (t.includes('child naming')) {
    return {
      message:
        'Congratulations on the safe arrival of your baby! Please click the button below to complete the child naming form.',
      button:
        'Complete Naming Form'
    };
  }

  if (t.includes('facility usage')) {
    return {
      message:
        'Please click the button below to submit your facility usage request.',
      button:
        'Submit Facility Request'
    };
  }

  return {
    message:
      'Please click the button below to complete this form.',
    button:
      'Complete Form'
  };
}

function getFormMessage(title) {
  const t = title.toLowerCase();

  if (t.includes('interest group')) {
    return {
      message: 'Click the button below to register for an interest group.',
      button: 'Register'
    };
  }

  if (t.includes('first timer')) {
    return {
      message: 'Welcome to David’s Christian Centre. Please click the button below to fill the form, and a member of our team will reach out to welcome you warmly.',
      button: 'Fill Welcome Form'
    };
  }

  if (t.includes('child naming')) {
    return {
      message: 'Congratulations on the safe arrival of your baby! Please click the button below to complete the child naming form.',
      button: 'Complete Naming Form'
    };
  }

  if (t.includes('facility usage')) {
    return {
      message: 'Please click the button below to submit your facility usage request.',
      button: 'Submit Facility Request'
    };
  }

  return {
    message: 'Please click the button below to complete this form.',
    button: 'Complete Form'
  };
}

function extractDeadlineNote(text) {
  const cleaned = cleanMarkdown(text);

  // First, look specifically for an explicit "Deadline:" field.
  const deadlineMatch = cleaned.match(
    /\bdeadline\s*:\s*(.*?)(?=[.\n]|$)/i
  );

  if (deadlineMatch) {
    let note = deadlineMatch[1]
      .replace(/\*\*/g, '')
      .trim();

    // Ignore placeholders such as:
    // "Not stated."
    // "Not stated on the accessible page."
    // "N/A."
    // "None."
    // etc.
    if (
      /^(not stated|none|n\/a|na|not applicable|nil|none stated)\b/i.test(note)
    ) {
      return '';
    }

    if (/^must be filled/i.test(note)) {
      note = note.replace(
        /^must be filled/i,
        'You must fill this form'
      );
    }

    return note;
  }

  // If there is no explicit "Deadline:" field,
  // look for other natural deadline wording.
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const deadlineSentence = sentences.find(sentence =>
    /\b(must be (made|submitted|received|completed|filled)|submit(?:ted)?\s+(?:by|before)|no later than|at least \d+\s+(?:days?|weeks?|hours?)|before the (?:event|date)|prior to)\b/i.test(sentence)
  );

  if (!deadlineSentence) {
    return '';
  }

  let note = deadlineSentence
    .replace(/^[-•*]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();

  if (/^must be filled/i.test(note)) {
    note = note.replace(
      /^must be filled/i,
      'You must fill this form'
    );
  }

  return note;
}

  function formDetails(title) {
  const form = parseForms().find(
    f => f.title.toLowerCase() === title.toLowerCase()
  ) || parseForms().find(
    f => f.title.toLowerCase().includes(title.toLowerCase())
  );

  if (!form) return missing();

  const text = sectionText(form.section);
  const presentation = getFormMessage(form.title);
  const deadline = extractDeadlineNote(text);

  let html =
    `<strong>${escapeHtml(form.title)}</strong>` +
    `<div class="md-result">${escapeHtml(presentation.message)}</div>`;

  if (deadline) {
    html += `<div class="notice"><strong>Note:</strong> ${escapeHtml(deadline)}</div>`;
  }

  if (form.url) {
    html += `<div class="link-row">${link(presentation.button, form.url)}</div>`;
  }

  addBot(html);
  addUtilityButtons();
}

  function giving() {
    const section = faqSection('Giving');
    if (!section) return missing();
    const text = sectionText(section);
    addBot(`<strong>Giving</strong><div class="md-result">${formatLines(text)}</div><div class="notice">To make sure everything goes smoothly, please check our official giving page for our details before making a transfer.</div><div class="link-row">${link('Open official Giving page','https://www.davidschristiancentre.org/give')}</div>`);
    addUtilityButtons();
  }

  function parseRoster(kind) {
    const md = state.data['05-leadership-workforce.md'] || '';
    const sectionTitle = kind === 'pastors' ? '### Pastors' : '### Ministers';
    const start = md.indexOf(sectionTitle);
    if (start < 0) return [];
    const rest = md.slice(start + sectionTitle.length);
    const end = rest.search(/^### /m);
    const block = end >= 0 ? rest.slice(0, end) : rest;
    return block.split(/\r?\n/).map(l => l.trim()).filter(l => /^\d+\.\s+/.test(l)).map(l => l.replace(/^\d+\.\s+/,''));
  }

  function leadershipMenu() {
    addBot('<strong>Leadership</strong><br>What would you like to see?');
    addMenu([
      {label:'Pastors', action:() => rosterView('pastors')},
      {label:'Ministers', action:() => rosterView('ministers')},
      {label: 'Workforce Leaders', action: () => workforceLeadersMenu()}
    ]);
    addUtilityButtons();
  }

  function workforceLeadersMenu() {
  addBot(
    '<strong>Workforce Leaders</strong><br>' +
    'Which branch would you like to explore?'
  );

  addMenu([
    {
      label: 'DCC Mainland Workforce Leaders',
      action: () => workforceDepartments('Mainland')
    },
    {
      label: 'DCC Island Workforce Leaders',
      action: () => workforceDepartments('Island')
    }
  ]);

  addUtilityButtons();
}
  
  function parseWorkforceDepartments(branch) {
    const md = state.data['05-leadership-workforce.md'] || '';
    const sectionHeading = `## ${branch} departments`;
    const sectionStart = md.indexOf(sectionHeading);

    if (sectionStart < 0) return [];

    const nextSection = md.indexOf('\n## ', sectionStart + sectionHeading.length);
    const sectionText = md.slice(
      sectionStart + sectionHeading.length,
      nextSection >= 0 ? nextSection : md.length
    );
    const headings = [...sectionText.matchAll(/^###\s+(.+?)\s*$/gm)];

    return headings.map((heading, index) => {
      const bodyStart = heading.index + heading[0].length;
      const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : sectionText.length;
      const body = sectionText.slice(bodyStart, bodyEnd);
      const assignments = [];

      for (const line of body.split(/\r?\n/)) {
        const match = line.match(/^\s*[-*]\s*\*\*(HOD|Assistant HOD):\*\*\s*(.*?)\s*$/i);
        if (match) {
          assignments.push({
            role: match[1].toLowerCase() === 'hod' ? 'HOD' : 'Assistant HOD',
            name: match[2].trim() || 'Not available'
          });
        }
      }

      return { name: heading[1].trim(), assignments };
    });
  }

  function workforceDepartments(branch) {
    const departments = parseWorkforceDepartments(branch);

    if (!departments.length) {
      addBot('<strong>Workforce department information unavailable.</strong><br>I could not find the department list in the current knowledge base.');
      addUtilityButtons();
      return;
    }

    addBot(`<strong>DCC ${escapeHtml(branch)} Workforce Leaders</strong><br>Select a department to view its HOD and Assistant HOD assignments.`);
    addMenu(departments.map(department => ({
      label: department.name,
      action: () => workforceDepartmentDetails(branch, department.name)
    })));
    addUtilityButtons();
  }

  function workforceDepartmentDetails(branch, departmentName) {
    const department = parseWorkforceDepartments(branch)
      .find(item => item.name === departmentName);

    if (!department) {
      addBot('<strong>Department information unavailable.</strong>');
      addUtilityButtons();
      return;
    }

    const assignments = department.assignments.length
      ? department.assignments
      : [
          { role: 'HOD', name: 'Not available' },
          { role: 'Assistant HOD', name: 'Not available' }
        ];

    const list = assignments.map(item =>
      `<li><strong>${escapeHtml(item.role)}:</strong> ${escapeHtml(item.name || 'Not available')}</li>`
    ).join('');

    addBot(`<strong>${escapeHtml(department.name)}</strong><div class="md-result"><ol>${list}</ol></div>`);
    addUtilityButtons();
  }

  function rosterView(kind, count = null) {
    const roster = parseRoster(kind);
    if (!roster.length) return missing();
    const shown = count ? roster.slice(0,count) : roster;
    const title = kind === 'pastors' ? 'Pastors' : 'Ministers';
    addBot(`<strong>${escapeHtml(title)}</strong><div class="md-result"><ol>${shown.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></div>${count ? `<div class="muted-note">Showing ${count} from the official roster.</div>`:''}`);
    addUtilityButtons();
  }

  function leadershipAssignments() {
    const sec = findSection('05-leadership-workforce.md', 'Existing leadership assignments');
    const dept = findSection('05-leadership-workforce.md', 'Workforce hierarchy');
    let html = '';
    if (sec) html += `<strong>Documented leadership assignments</strong><div class="md-result">${formatLines(sectionText(sec))}</div>`;
    if (dept) html += `<strong>Workforce hierarchy</strong><div class="md-result">${formatLines(sectionText(dept))}</div>`;
    addBot(html || ''); addUtilityButtons();
  }

  function eventsMenu() {
  const events = getUpcomingEvents();

  const fixedEvents = [
    {
      label: 'All Sundays in October 2026',
      action: () => octoberSundayServices()
    },
    {
      label: 'All Mid-Week Services in October 2026',
      action: () => octoberMidweekServices()
    },
    {
      label: 'Career Prep 2026',
      action: () => careerPrep2026()
    }
  ];

  const databaseEvents = events.map(e => ({
    label: e.title,
    action: () => eventDetails(e)
  }));

  addBot(
    '<strong>Here are the currently scheduled upcoming DCC events.</strong><br>' +
    'Which event would you like to know more about?'
  );

  addMenu([...fixedEvents, ...databaseEvents]);

  addUtilityButtons();
}

  function octoberSundayServices() {
  addBot(
    '<strong>All Sundays in October 2026</strong>' +
    '<div class="md-result">' +
    '<strong>Topic:</strong> Kingdom Marriage<br><br>' +
    'The topic for all Sunday sermons in October 2026 is <strong>Kingdom Marriage</strong> for both the Mainland and Island branches.' +
    '</div>'
  );

  addUtilityButtons();
}

  function octoberMidweekServices() {
  addBot(
    '<strong>All Mid-Week Services in October 2026</strong>' +
    '<div class="md-result">' +
    '<strong>Topic:</strong> The 4 Dimensions of Love<br><br>' +
    'The topic for all Mid-Week Services in October 2026 is <strong>The 4 Dimensions of Love</strong> for both the Mainland and Island branches.' +
    '</div>'
  );

  addUtilityButtons();
}

  function careerPrep2026() {
  addBot(
    '<strong>Career Prep 2026</strong>' +
    '<div class="md-result">' +
    '<ol>' +
    '<li><strong>Theme:</strong> Workplace Evolution</li>' +
    '<li><strong>5-Day Virtual Training:</strong> 2–6 November, Monday–Friday, 9:00 AM–3:00 PM daily, live via Zoom</li>' +
    '<li><strong>Career Prep Conference:</strong> Saturday, 7 November at 9:00 AM at DCC Mainland</li>' +
    '<li><strong>At the Conference:</strong> Keynote speakers, networking session, panel session, certificates, 90-Day Career Action Plan</li>' +
    '<li><strong>Training Tracks:</strong> Digital Marketing, Business Analysis, Content Creation, Project Management, Data Analytics, Cybersecurity</li>' +
    '</ol>' +
    '</div>'
  );

  addMenu([
    {
      label: 'Register',
      action: () => window.open(
        'https://luma.com/careerprep2026',
        '_blank'
      )
    }
  ]);

  addUtilityButtons();
}
  
  function parseDateFromText(text) {
    const m = text.match(/(?:Date|Dates):\*?\*?\s*(?:[A-Za-z]+\s+)?(\d{1,2})[\s–-]+(?:\d{1,2}\s+)?([A-Za-z]+)\s+(\d{4})/i) ||
              text.match(/(?:Date|Dates):\*?\*?\s*(?:[A-Za-z]+,?\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
    if (!m) return null;
    const month = new Date(`${m[2]} 1, ${m[3]}`).getMonth();
    if (Number.isNaN(month)) return null;
    return new Date(Number(m[3]), month, Number(m[1]));
  }

  function getUpcomingEvents() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return state.events
    .filter(event => {
      if (!event.start_date) return false;

      const eventDate = new Date(event.start_date + 'T00:00:00');

      return eventDate >= now && event.status !== 'cancelled';
    })
    .sort((a, b) => {
      return new Date(a.start_date) - new Date(b.start_date);
    })
    .slice(0, 8);
}

  function eventDetails(event) {
  let html = `<strong>${escapeHtml(event.title || 'DCC Event')}</strong>`;

  if (event.start_date) {
    html += `<div class="md-result"><strong>Date:</strong> ${escapeHtml(event.start_date)}</div>`;
  }

  if (event.end_date && event.end_date !== event.start_date) {
    html += `<div class="md-result"><strong>End date:</strong> ${escapeHtml(event.end_date)}</div>`;
  }

  if (event.start_time) {
    html += `<div class="md-result"><strong>Time:</strong> ${escapeHtml(event.start_time)}`;

    if (event.end_time) {
      html += ` – ${escapeHtml(event.end_time)}`;
    }

    html += `</div>`;
  }

  if (event.venue) {
    html += `<div class="md-result"><strong>Venue:</strong> ${escapeHtml(event.venue)}</div>`;
  }

  if (event.audience) {
    html += `<div class="md-result"><strong>Audience:</strong> ${escapeHtml(event.audience)}</div>`;
  }

  if (event.description) {
    html += `<div class="md-result">${escapeHtml(event.description)}</div>`;
  }

  html += `<div class="notice">For cancellation, registration or last-minute logistics, please confirm with DCC.</div>`;

  addBot(html);
  addUtilityButtons();
}

  function sermonsMenu() {
    addBot('<strong>Which would you like to access?</strong>');
    addMenu([
      {label:'Sunday Sermon', action:() => sermonLocation('Sunday Sermon')},
      {label:'Mid-Week Sermon', action:() => sermonLocation('Mid-Week Sermon')}
    ]);
    addUtilityButtons();
  }

  function sermonLocation(type) {
    addBot(`<strong>${escapeHtml(type)}</strong><br>Which location?`);
    addMenu([
      {label:'Mainland', action:() => sermonLink(type,'Mainland')},
      {label:'Island', action:() => sermonLink(type,'Island')}
    ]);
    addUtilityButtons();
  }

  function sermonLink(type, location) {
    addBot(`<strong>${escapeHtml(type)} — ${escapeHtml(location)}</strong><br>Use the shared DCC Victory Celebrations sermon resource:<div class="link-row">${link('View sermons', CONFIG.sermonsUrl)}</div>`);
    addUtilityButtons();
  }

  function resourcesMenu() {
    addBot('<strong>DCC Schools & Resources</strong><br>Choose a resource.');
    addMenu([
      {label:'Audio Messages', action:() => resourceLink('Audio Messages','https://www.davidschristiancentre.org/resources/audio-messages')},
      {label:'Podcast', action:() => resourceLink('Podcast','https://www.davidschristiancentre.org/resources/podcasts')},
      {label:'Devotional', action:() => resourceLink('Devotional','https://www.davidschristiancentre.org/resources/devotional')},
      {label:'DCC Online App', action:() => resourceLink('DCC Online App','https://www.davidschristiancentre.org/resources/download-app')},
      {label:'DCC Schools website', action:() => resourceLink('DCC Schools website','https://schools.davidschristiancentre.org/')}
    ]);
    addUtilityButtons();
  }

  function schoolDetails(title) {
    const sec = findSection('06-schools-resources.md', title);
    if (!sec) return missing();
    addBot(`<strong>${escapeHtml(title)}</strong><div class="md-result">${formatLines(sectionText(sec))}</div><div class="link-row">${link('Open DCC Schools','https://schools.davidschristiancentre.org/')}</div>`);
    addUtilityButtons();
  }

  function resourceLink(title, url) {
    addBot(`<strong>${escapeHtml(title)}</strong><br>${link('Open resource', url)}`); addUtilityButtons();
  }

  function help(fromMainMenu = false) {
  state.awaitingWhatsApp = false;

  addBot(
    '<strong>Contact the Team</strong><br>' +
    'How would you like to connect?'
  );

  addMenu([
    {
      label:'A team member should contact me on WhatsApp',
      action:() => requestWhatsApp()
    },
    {
      label:'Official DCC Contact page',
      action:() => resourceLink(
        'DCC Contact page',
        'https://www.davidschristiancentre.org/forms/contact'
      )
    }
  ]);

  addUtilityButtons({ showContact: !fromMainMenu });
}

  function requestWhatsApp() {
  state.awaitingWhatsApp = false;

  addBot(`
    <strong>Contact an Information Hub Member</strong>
    <div class="contact-form">

      <div class="contact-field">
        <label for="contact-name">Name</label>
        <input
          id="contact-name"
          type="text"
          class="contact-input"
          autocomplete="name"
          placeholder="Enter your name"
        >
      </div>

      <div class="contact-field">
        <label for="contact-whatsapp">WhatsApp number</label>
        <input
          id="contact-whatsapp"
          type="tel"
          class="contact-input"
          autocomplete="tel"
          placeholder="080..."
          inputmode="tel"
        >
      </div>

      <div class="contact-field">
        <label>Are you a DCC worker?</label>

        <div class="contact-radio-group">
          <label class="contact-radio">
            <input type="radio" name="dcc-worker" value="yes">
            <span>Yes</span>
          </label>

          <label class="contact-radio">
            <input type="radio" name="dcc-worker" value="no">
            <span>No</span>
          </label>
        </div>
      </div>

      <div
        class="contact-field"
        id="department-field"
        style="display:none;"
      >
        <label for="contact-department">Department</label>
        <input
          id="contact-department"
          type="text"
          class="contact-input"
          placeholder="Enter your department"
        >
      </div>

      <button
        type="button"
        id="contact-submit"
        class="contact-submit"
        disabled
      >
        Submit
      </button>

    </div>
  `);

  const nameInput = document.getElementById('contact-name');
  const whatsappInput = document.getElementById('contact-whatsapp');
  const workerInputs = document.querySelectorAll('input[name="dcc-worker"]');
  const departmentField = document.getElementById('department-field');
  const departmentInput = document.getElementById('contact-department');
  const submitButton = document.getElementById('contact-submit');

  function countLetters(value) {
    return (value.match(/[A-Za-z]/g) || []).length;
  }

  function countDigits(value) {
    return (value.match(/\d/g) || []).length;
  }

  function validatePhoneCharacters(value) {
    return /^[+\d\s().-]*$/.test(value);
  }

  function validateForm() {
    const nameValid =
      countLetters(nameInput.value.trim()) >= 3;

    const whatsappValue = whatsappInput.value.trim();

    const whatsappValid =
      countDigits(whatsappValue) >= 4 &&
      validatePhoneCharacters(whatsappValue);

    const selectedWorker = document.querySelector(
      'input[name="dcc-worker"]:checked'
    );

    if (!selectedWorker) {
      departmentField.style.display = 'none';
      submitButton.disabled = true;
      return;
    }

    const isWorker = selectedWorker.value === 'yes';

    if (isWorker) {
      departmentField.style.display = '';

      const departmentValid =
        countLetters(departmentInput.value.trim()) >= 3;

      submitButton.disabled =
        !(nameValid && whatsappValid && departmentValid);
    } else {
      departmentField.style.display = 'none';
      departmentInput.value = '';

      submitButton.disabled =
        !(nameValid && whatsappValid);
    }
  }

  workerInputs.forEach(input => {
    input.addEventListener('change', validateForm);
  });

  nameInput.addEventListener('input', validateForm);
  whatsappInput.addEventListener('input', validateForm);
  departmentInput.addEventListener('input', validateForm);

  submitButton.addEventListener('click', () => {
    submitContactRequest();
  });

  addUtilityButtons();
  nameInput.focus();
}

async function submitContactRequest() {
  const nameInput = document.getElementById('contact-name');
  const whatsappInput = document.getElementById('contact-whatsapp');
  const selectedWorker = document.querySelector(
    'input[name="dcc-worker"]:checked'
  );
  const departmentInput = document.getElementById('contact-department');
  const submitButton = document.getElementById('contact-submit');

  if (!nameInput || !whatsappInput || !selectedWorker || !submitButton) {
    console.error('Contact form elements are missing.');
    return;
  }

  const isDccWorker = selectedWorker.value === 'yes';

  const payload = {
    session_id: state.sessionId,
    name: nameInput.value.trim(),
    whatsapp_number: whatsappInput.value.trim(),
    is_dcc_worker: isDccWorker,
    department: isDccWorker
      ? departmentInput.value.trim()
      : null,
    entry_point: 'whatsapp_form',
    context: state.currentContext
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    const res = await fetch('https://dcc-information-hub.onrender.com/api/contact-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(
        result.message || 'Could not submit contact request.'
      );
    }

    els.chat.innerHTML = '';

addBot(
  '<strong>Thank you!</strong><br>' +
  'Your request has been received. An Information Hub member will contact you on WhatsApp.'
);

addUtilityButtons();

  } catch (error) {
    console.error('Contact request failed:', error);

    addBot(
      '<strong>We could not submit your request.</strong><br>' +
      'Please check your details and try again, or use the official DCC Contact page.'
    );

    addUtilityButtons();

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }
}

function missing() {
  addBot(
    '<strong>I couldn\'t find that information.</strong><br>' +
    'Please try another menu option or connect with an Information Hub member for assistance.'
  );

  addUtilityButtons();
}

function tokenize(query) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
}

  function freeTextSearch(query) {
    const q = query.toLowerCase();
    const tokens = tokenize(query);
    const candidates = [];
    for (const {file, text} of allText()) {
      const sections = parseSections(state.data[file] || '');
      for (const sec of sections) {
        const hay = `${sec.title} ${sec.lines.join(' ')}`.toLowerCase();
        let score = 0;
        if (hay.includes(q)) score += 20;
        tokens.forEach(t => { if (hay.includes(t)) score += 2; });
        if (score > 0) candidates.push({score,file,sec});
      }
    }
    return candidates.sort((a,b)=>b.score-a.score).slice(0,5);
  }

  function answerFreeText(query) {
  const q = query.toLowerCase();

  if (
    (q.includes('service') && q.includes('time')) ||
    q.includes('service times') ||
    q.includes('when are the services')
  ) {
    return churchMenu();
  }

  if ((q.includes('island') || q.includes('lekki')) && (q.includes('midweek') || q.includes('mid-week') || q.includes('tuesday'))) return branchDetails('Island — DCC Lekki');

    const results = freeTextSearch(query);
    if (!results.length) return missing();
    const top = results[0];
    addBot(`<strong>${escapeHtml(top.sec.title)}</strong><div class="md-result">${formatLines(sectionText(top.sec))}</div>`);
    if (results.length > 1) {
      addBot('<span class="muted-note">I found related information in the knowledge base. If this did not answer your question, choose another menu option or connect with DCC.</span>');
    }
    addUtilityButtons();
  }

  async function loadKnowledgeBase() {
    const entries = await Promise.all(CONFIG.dataFiles.map(async file => {
      const res = await fetch(file, {cache:'no-store'});
      if (!res.ok) throw new Error(`Could not load ${file}: ${res.status}`);
      return [file, await res.text()];
    }));
    entries.forEach(([file, text]) => state.data[file] = text);
    state.ready = true;
    state.loading = false;
    els.status.innerHTML = '<span class="online"></span>Knowledge base loaded';
  }

async function loadEventsFromApi() {
  const res = await fetch('https://dcc-information-hub.onrender.com/api/events', {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Could not load events: ${res.status}`);
  }

  const result = await res.json();

  if (!result.success) {
    throw new Error(result.message || 'Could not load events');
  }

  state.events = result.events;

  console.log('Events loaded from MongoDB:', state.events);

  return state.events;
}

async function loadWorshipCentresFromApi() {
  const res = await fetch('https://dcc-information-hub.onrender.com/api/worship-centres', {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Could not load worship centres: ${res.status}`);
  }

  const result = await res.json();

  if (!result.success) {
    throw new Error(result.message || 'Could not load worship centres');
  }

  state.worshipCentres = result.worshipCentres;

  console.log('Worship centres loaded from MongoDB:', state.worshipCentres);

  return state.worshipCentres;
}

  function bind() {
    document.querySelectorAll('.quick').forEach(q => {
      q.setAttribute('role','button'); q.setAttribute('tabindex','0');
      const label = q.textContent.trim();
      const fn = () => {
        if (label.includes('services')) navigate('When are the services?', churchMenu);
        else if (label.includes('events')) navigate('What events are coming up?', eventsMenu);
        else if (label.includes('ministry')) navigate('Tell me about a ministry', resourcesMenu);
        else if (label.includes('form')) navigate('Where can I find a form?', formsMenu);
      };
      q.addEventListener('click', fn); q.addEventListener('keydown', e => {if(e.key==='Enter'||e.key===' ') {e.preventDefault(); fn();}});
    });
    els.send.addEventListener('click', submit);
    els.input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  function submit() {
  const q = els.input.value.trim();
  if (!q || !state.ready) return;
  els.input.value = '';
  addUser(q);
  answerFreeText(q);
}

  async function init() {
  bind();
  try {
  await loadKnowledgeBase();
  await loadEventsFromApi();
  await loadWorshipCentresFromApi();

  state.ready = true;
    state.loading = false;

    els.status.innerHTML = '<span class="online"></span>Connected to DCC Information Hub';

    restart();
  } catch (err) {
    console.error(err);

    els.status.innerHTML = '<span style="color:#e9a3a3">Information Hub unavailable</span>';

    addBot('<strong>The DCC Information Hub could not connect to the database.</strong><br>Please try again later.');
  }
}

  init();
})();
