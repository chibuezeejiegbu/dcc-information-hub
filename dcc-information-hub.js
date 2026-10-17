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
  forms: [],
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
    const res = await fetch('/api/contact-events', {
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
  

function formsMenu() {
  const forms = [...(state.forms || [])]
    .filter(form =>
      form.status === 'active' &&
      form.name &&
      form.form_id &&
      form.link &&
      form.button_label
    )
    .sort((a, b) => a.menu_order - b.menu_order);

  addBot(
    '<strong>Forms & Registration</strong><br>' +
    'Select the form you need.'
  );

  if (!forms.length) {
    addBot(
      'Forms are temporarily unavailable. Please try again later.'
    );
    addUtilityButtons();
    return;
  }

  addMenu(
    forms.map(form => ({
      label: form.name,
      action: () => formDetails(form.form_id)
    }))
  );

  addUtilityButtons();
}
  

function formDetails(formId) {
  const form = (state.forms || []).find(
    item => item.form_id === formId
  );

  if (!form) {
    return missing();
  }

  const purpose = (form.purpose || '').trim();
  const deadlineRule = (form.deadline_rule || '').trim();

  const noDeadline =
    /^(not stated(?: on the accessible page)?|none|n\/a|na|not applicable|nil|none stated)\.?$/i;

  const deadline =
    deadlineRule && !noDeadline.test(deadlineRule)
      ? deadlineRule
      : '';

  let html =
    `<strong>${escapeHtml(form.name)}</strong>`;

  if (purpose) {
    html +=
      `<div class="md-result">${escapeHtml(purpose)}</div>`;
  }

  if (deadline) {
    html +=
      `<div class="notice"><strong>Note:</strong> ` +
      `${escapeHtml(deadline)}</div>`;
  }

  html +=
    `<div class="link-row">` +
    `${link(form.button_label, form.link)}` +
    `</div>`;

  addBot(html);
  addUtilityButtons();
}  

let givingAccountsCache = null;

async function giving() {
  try {
    const response = await fetch('/api/giving-accounts', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Giving accounts API returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.givingAccounts)) {
      throw new Error('Invalid giving accounts API response');
    }

    givingAccountsCache = result.givingAccounts.filter(account =>
      account.bank &&
      account.account_name &&
      account.account_number &&
      account.currency
    );

    const banks = [
      ...new Set(givingAccountsCache.map(account => account.bank))
    ];

    if (!banks.length) {
      throw new Error('No giving banks are available');
    }

    addBot(
      '<strong>Giving</strong><div class="md-result">' +
      'Choose a bank to view its giving account details.' +
      '</div>'
    );

    addMenu(
      banks.map(bank => ({
        label: bank,
        action: () => givingBankDetails(bank)
      }))
    );

    addUtilityButtons();

  } catch (error) {
    console.error('Could not load giving banks:', error);

    addBot(
      '<strong>Giving information is currently unavailable.</strong><br>' +
      'Please visit the official DCC giving page for assistance.' +
      `<div class="link-row">${link(
        'Open official Giving page',
        'https://www.davidschristiancentre.org/give'
      )}</div>`
    );

    addUtilityButtons();
  }
}

function givingBankDetails(bankName) {
  if (!Array.isArray(givingAccountsCache)) {
    return giving();
  }

  const accounts = givingAccountsCache
    .filter(account => account.bank === bankName)
    .sort((a, b) => {
  const currencyOrder = {
    NGN: 1,
    USD: 2,
    GBP: 3,
    EUR: 4
  };

  return (currencyOrder[a.currency] ?? 99) -
         (currencyOrder[b.currency] ?? 99);
});

  if (!accounts.length) {
    addBot(
      '<strong>No account details found for this bank.</strong>'
    );
    addUtilityButtons();
    return;
  }

  let html = `<strong>${escapeHtml(bankName)}</strong>`;

  for (const account of accounts) {
    html += '<div class="md-result">';
    html += `<strong>${escapeHtml(account.currency)}</strong><br>`;
    html += `<strong>Account Name:</strong> ${escapeHtml(account.account_name)}<br>`;
    html += `<strong>Account Number:</strong> ${escapeHtml(account.account_number)}`;

    if (account.swift_bic) {
      html += `<br><strong>SWIFT/BIC:</strong> ${escapeHtml(account.swift_bic)}`;
    }

    if (account.sort_code) {
      html += `<br><strong>Sort Code:</strong> ${escapeHtml(account.sort_code)}`;
    }

    html += '</div>';
  }

  html +=
    '<div class="notice">' +
    'Please use the account details for the currency you wish to give in. ' +
    'Verify the details on the official DCC giving page before making a transfer.' +
    '</div>';

  html +=
    `<div class="link-row">${link(
      'Open official Giving page',
      'https://www.davidschristiancentre.org/give'
    )}</div>`;

  addBot(html);
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
  
let workforceDepartmentsCache = null;

async function parseWorkforceDepartments(branch) {
  if (!workforceDepartmentsCache) {
    try {
      const response = await fetch('/api/departments');

      if (!response.ok) {
        throw new Error(`Departments API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !Array.isArray(result.departments)) {
        throw new Error('Invalid departments API response');
      }

      workforceDepartmentsCache = result.departments;
    } catch (error) {
      console.error('Failed to load departments:', error);
      return [];
    }
  }

  return workforceDepartmentsCache
    .filter(department =>
      department.centre?.toLowerCase() === branch.toLowerCase() &&
      department.status === 'active'
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(department => {
      const assignments = [];

      assignments.push({
        role: 'HOD',
        name: department.hod?.name || 'Not available'
      });

      const assistants = Array.isArray(department.assistant_hods)
        ? department.assistant_hods
        : [];

      if (assistants.length) {
        assistants.forEach(assistant => {
          assignments.push({
            role: 'Assistant HOD',
            name: assistant?.name || 'Not available'
          });
        });
      } else {
        assignments.push({
          role: 'Assistant HOD',
          name: 'Not available'
        });
      }

      return {
        name: department.name,
        assignments
      };
    });
}

async function workforceDepartments(branch) {
  const departments = await parseWorkforceDepartments(branch);

  if (!departments.length) {
    addBot(
      '<strong>Workforce department information unavailable.</strong><br>' +
      'The department list could not be loaded. Please try again later.'
    );
    addUtilityButtons();
    return;
  }

  addBot(
    `<strong>DCC ${escapeHtml(branch)} Workforce Leaders</strong><br>` +
    'Select a department to view its HOD and Assistant HOD assignments.'
  );

  addMenu(departments.map(department => ({
    label: department.name,
    action: () => workforceDepartmentDetails(branch, department.name)
  })));

  addUtilityButtons();
}

async function workforceDepartmentDetails(branch, departmentName) {
  const departments = await parseWorkforceDepartments(branch);

  const department = departments.find(
    item => item.name === departmentName
  );

  if (!department) {
    addBot('<strong>Department information unavailable.</strong>');
    addUtilityButtons();
    return;
  }

  const list = department.assignments.map(item =>
    `<li><strong>${escapeHtml(item.role)}:</strong> ` +
    `${escapeHtml(item.name || 'Not available')}</li>`
  ).join('');

  addBot(
    `<strong>${escapeHtml(department.name)}</strong>` +
    `<div class="md-result"><ol>${list}</ol></div>`
  );

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

  addBot(
    '<strong>Here are the currently scheduled upcoming DCC events.</strong><br>' +
    'Which event would you like to know more about?'
  );

  if (!events.length) {
    addBot('There are no upcoming events listed at the moment. Please check again later or contact DCC for updates.');
    addUtilityButtons();
    return;
  }

  addMenu(events.map(event => ({
    label: event.title,
    action: () => eventDetails(event)
  })));

  addUtilityButtons();
}

  function getUpcomingEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (state.events || [])
    .filter(event => {
      if (!event.start_date || event.status === 'cancelled') return false;
      const startDate = new Date(`${event.start_date}T00:00:00`);
      if (Number.isNaN(startDate.getTime())) return false;
      const endDate = event.end_date
        ? new Date(`${event.end_date}T23:59:59`)
        : new Date(`${event.start_date}T23:59:59`);
      if (Number.isNaN(endDate.getTime())) return false;
      return endDate >= today;
    })
    .sort((a, b) => new Date(`${a.start_date}T00:00:00`) - new Date(`${b.start_date}T00:00:00`))
    .slice(0, 20);
}

  function formatEventDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

  function formatEventDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

  function formatServiceTime(timeValue) {
  if (!timeValue) return '';
  const [hour, minute] = String(timeValue).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return String(timeValue);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return minute === 0
    ? `${displayHour} ${period}`
    : `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

  function getMonthlyTopicBranchSchedule(event) {
  const centres = Array.isArray(state.worshipCentres) ? state.worshipCentres : [];
  const isMidweek = /mid.?week/i.test(event.title || event.service_period || '');
  const branchDefinitions = [
    { label: 'Mainland', centreName: 'DCC Mainland (Victory Dome)' },
    { label: 'Island', centreName: 'DCC Island (DCC Lekki)' }
  ];

  return branchDefinitions.map(branch => {
    const centre = centres.find(item => item.name === branch.centreName);
    if (!centre || !Array.isArray(centre.services)) {
      return { label: branch.label, times: 'Service times unavailable' };
    }

    const services = centre.services.filter(service => {
      const day = String(service.day || '').toLowerCase();
      const serviceLabel = String(service.label || '').toLowerCase();
      if (isMidweek) {
        return day === 'tuesday' || day === 'wednesday' ||
          serviceLabel.includes('mid-week') || serviceLabel.includes('midweek');
      }
      return day === 'sunday' || serviceLabel.includes('sunday');
    });

    const times = services.map(service => {
      const start = formatServiceTime(service.start_time);
      const end = formatServiceTime(service.end_time);
      return start && end ? `${start} – ${end}` : (start || end);
    }).filter(Boolean);

    return {
      label: branch.label,
      times: times.length ? times.join('; ') : 'Service times unavailable'
    };
  });
}

  function eventDetails(event) {
  // Monthly service topics reuse the live worship-centre service data.
  if (event.event_type === 'monthly_service_topic') {
    let html = `<strong>Topic: ${escapeHtml(event.topic || event.title || 'Service topic')}</strong>`;
    const displayDate = event.display_date ||
      (event.start_date && event.end_date
        ? `${formatEventDate(event.start_date)} – ${formatEventDate(event.end_date)}`
        : '');

    if (displayDate) {
      html += `<div class="md-result"><strong>Date:</strong> ${escapeHtml(displayDate)}</div>`;
    }

    const branches = getMonthlyTopicBranchSchedule(event);
    html += `<div class="md-result"><strong>Branch schedule</strong><ul>` +
      branches.map(branch =>
        `<li><strong>${escapeHtml(branch.label)}:</strong> ${escapeHtml(branch.times)}</li>`
      ).join('') +
      `</ul></div>`;

    if (event.note) html += `<div class="notice">${escapeHtml(event.note)}</div>`;
    addBot(html);
    addUtilityButtons();
    return;
  }

  let html = `<strong>${escapeHtml(event.title || 'DCC Event')}</strong>`;

  if (event.start_date) {
    const start = formatEventDate(event.start_date);
    const end = event.end_date && event.end_date !== event.start_date ? formatEventDate(event.end_date) : '';
    html += `<div class="md-result"><strong>Date:</strong> ${escapeHtml(start)}${end ? ` – ${escapeHtml(end)}` : ''}</div>`;
  }

  const hasProgrammeSchedule = Array.isArray(event.schedule) && event.schedule.length > 0;
  if (event.recurrence && !hasProgrammeSchedule) {
    const recurrence = typeof event.recurrence === 'string' ? event.recurrence : JSON.stringify(event.recurrence);
    html += `<div class="md-result"><strong>Schedule:</strong> ${escapeHtml(recurrence)}</div>`;
  }

  if (event.start_time) {
    html += `<div class="md-result"><strong>Time:</strong> ${escapeHtml(event.start_time)}`;
    if (event.end_time) html += ` – ${escapeHtml(event.end_time)}`;
    html += `</div>`;
  }

  if (hasProgrammeSchedule) {
    const scheduleItems = event.schedule.map(item => {
      const parts = [];
      if (item.title) parts.push(`<strong>${escapeHtml(item.title)}:</strong>`);
      if (item.start_date) {
        let dateText = formatEventDate(item.start_date);
        if (item.end_date && item.end_date !== item.start_date) dateText += ` – ${formatEventDate(item.end_date)}`;
        parts.push(escapeHtml(dateText) + (item.time ? ',' : ''));
      }
      if (item.time) parts.push(escapeHtml(item.time));
      if (item.venue) {
        const venueText = String(item.venue).replace(/\s+branch$/i, '');
        parts.push(`at ${escapeHtml(venueText)}${item.format === 'In person' ? ' branch' : ''}`);
      } else if (item.format) {
        parts.push(escapeHtml(item.format === 'Virtual' ? 'via Zoom' : item.format));
      }
      return `<li>${parts.join(' ')}</li>`;
    }).join('');
    html += `<div class="md-result"><strong>Programme schedule</strong><ul>${scheduleItems}</ul></div>`;
  } else if (event.venue) {
    html += `<div class="md-result"><strong>Venue:</strong> ${escapeHtml(event.venue)}</div>`;
  }

  if (event.speakers) {
    const speakers = Array.isArray(event.speakers) ? event.speakers.join(', ') : event.speakers;
    html += `<div class="md-result"><strong>Speakers:</strong> ${escapeHtml(speakers)}</div>`;
  }

  if (event.description) html += `<div class="md-result">${escapeHtml(event.description)}</div>`;
  if (event.entry_fee) {
    html += `<div class="md-result"><strong>Entry fee:</strong> ${escapeHtml(typeof event.entry_fee === 'string' ? event.entry_fee : JSON.stringify(event.entry_fee))}</div>`;
  }
  if (event.registration_link) html += `<div class="link-row">${link(event.registration_label || 'Register', event.registration_link)}</div>`;
  if (event.related_site) html += `<div class="link-row">${link('Related website', event.related_site)}</div>`;
  if (event.note) html += `<div class="notice">${escapeHtml(event.note)}</div>`;

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
    addBot('<strong>DCC Schools / Resources</strong><br>Choose a resource.');
    addMenu([
      {label:'Audio Messages', action:() => resourceLink('Audio Messages','Click here to listen to audio messages and ministrations from our pastors, ministers, and guest ministers.','https://www.davidschristiancentre.org/resources/audio-messages')},
      {label:'Podcast', action:() => resourceLink('Podcast','Click here to listen to our podcasts.','https://www.davidschristiancentre.org/resources/podcasts')},
      {label:'Devotional', action:() => resourceLink('Devotional','Click here to listen to our devotionals.','https://www.davidschristiancentre.org/resources/devotional')},
      {label:'DCC Online App', action:() => resourceLink('DCC Online App','Click here to download the DCC Online mobile application. Available on Google Play and the Apple App Store.','https://www.davidschristiancentre.org/resources/download-app')},
      {label:'DCC Schools Website', action:() => resourceLink('DCC Schools Website','Click here to visit the DCC Schools Website.','https://schools.davidschristiancentre.org/')}
    ]);
    addUtilityButtons();
  }

  function schoolDetails(title) {
    const sec = findSection('06-schools-resources.md', title);
    if (!sec) return missing();
    addBot(`<strong>${escapeHtml(title)}</strong><div class="md-result">${formatLines(sectionText(sec))}</div><div class="link-row">${link('Open DCC Schools','https://schools.davidschristiancentre.org/')}</div>`);
    addUtilityButtons();
  }

  function resourceLink(title, description, url) {
    addBot(
      `<strong>${escapeHtml(title)}</strong>` +
      `<div class="md-result">${escapeHtml(description)}</div>` +
      `<div class="link-row">${link(title, url)}</div>`
    );
    addUtilityButtons();
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
    const res = await fetch('/api/contact-requests', {
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
  const res = await fetch('/api/events', {
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
  const res = await fetch('/api/worship-centres', {
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

  
async function loadFormsFromApi() {
  const res = await fetch('/api/forms', {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Could not load forms: ${res.status}`);
  }

  const result = await res.json();

  if (!result.success || !Array.isArray(result.forms)) {
    throw new Error(result.message || 'Invalid forms response');
  }

  state.forms = result.forms.filter(
    form => form.status === 'active' && form.name && form.link
  );

  console.log('Forms loaded from MongoDB:', state.forms);

  return state.forms;
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
  await loadFormsFromApi();

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
