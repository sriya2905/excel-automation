/**
 * Material Test Report Generator â€” SGIL
 * Flow: Setup (once) â†’ Login â†’ Upload â†’ Entry â†’ Preview â†’ Download
 */
/** Backend root: same host in cloud, local backend when opened as a file. */
function resolveApiRoot() {
  const configured = typeof window !== 'undefined' && window.MTR_API_ROOT
    ? String(window.MTR_API_ROOT).trim()
    : '';
  const origin = typeof window !== 'undefined' && window.location?.protocol !== 'file:'
    ? window.location.origin
    : '';
  return (configured || origin || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

const API_ROOT = resolveApiRoot();
const API_BASE = `${API_ROOT}/api`;
const REQ_MS = 300000;
const SETUP_FLAG_KEY = 'mtr_setup_complete';
const PERSIST_TOKEN_KEY = 'mtr_token_persist';
const PERSIST_USERNAME_KEY = 'mtr_username_persist';

const AUTH_USERS = [
  'Mahesh Chavan',
  'Rahul Karape',
  'Digember',
  'Q/A Lab',
];

const CHEM_ELEMENTS = ['C', 'Si', 'Mn', 'P', 'S', 'Cu', 'Ni', 'Mg'];
const MECH_ROWS = [
  { key: 'tensile', label: 'Tensile Strength' },
  { key: 'proof_stress', label: '0.2% Proof Stress' },
  { key: 'elongation', label: '% Elongation' },
  { key: 'hardness_bhn', label: 'Hardness BHN' },
  { key: 'impact_individual', label: 'Impact Individual (J)' },
  { key: 'impact_mean', label: 'Impact Mean (J)' },
];

const SOURCE_LABELS = {
  metallurgy: 'Metallurgy',
  requirements: 'Requirements',
  edited: 'Edited',
};

const BASIC_FIELDS = [
  { key: 'customer', label: 'Customer Name', cell: 'D6' },
  { key: 'material_grade', label: 'Material Grade', cell: 'K6' },
  { key: 'casting_name', label: 'Casting Name', cell: 'D8' },
  { key: 'drawing_no', label: 'Drawing No', cell: 'K8' },
  { key: 'heat_no', label: 'Heat No', cell: 'D10' },
  { key: 'casting_sl_no', label: 'Casting Sl No', cell: 'K10' },
  { key: 'invoice_no_date', label: 'Invoice No / Date', cell: 'K12' },
  { key: 'doc_ref', label: 'Doc Ref', cell: 'L2' },
  { key: 'issue_no_dt', label: 'Issue No / Date', cell: 'L3' },
  { key: 'rev_no_dt', label: 'Rev No / Date', cell: 'L4' },
];

const state = {
  token: localStorage.getItem(PERSIST_TOKEN_KEY) || sessionStorage.getItem('mtr_token') || '',
  username: localStorage.getItem(PERSIST_USERNAME_KEY) || sessionStorage.getItem('mtr_username') || '',
  templateFilename: '',
  metallurgyFilename: '',
  specFilename: '',
  mechReqFilename: '',
  preview: null,
};

function $(id) {
  return document.getElementById(id);
}

function authHeaders(json = true) {
  const h = { Authorization: `Bearer ${state.token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function showScreen(name) {
  const screens = ['setup', 'login', 'upload', 'entry', 'preview'];
  screens.forEach((s) => {
    const el = $(`screen-${s}`);
    if (el) el.classList.toggle('hidden', s !== name);
  });
  const showHeader = name !== 'setup' && name !== 'login';
  $('app-header').classList.toggle('hidden', !showHeader);
}

function setStatus(el, msg, isError) {
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('error', !!isError);
}

function sourceBadgeClass(source) {
  return `source-badge source-${source}`;
}

function sourceBadgeLabel(source) {
  return SOURCE_LABELS[source] || source;
}

function applyEditedBadge(input) {
  const badge = input.closest('.preview-field, td')?.querySelector('.source-badge');
  if (badge) {
    badge.className = sourceBadgeClass('edited');
    badge.textContent = sourceBadgeLabel('edited');
  }
}

function attachSourceTracking(input) {
  input.addEventListener('input', () => {
    applyEditedBadge(input);
  });
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(false) });
  return res.json();
}

async function apiPost(path, body, isJson = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(isJson),
    body: isJson ? JSON.stringify(body) : body,
  });
  return res;
}

async function checkAuthStatus() {
  const res = await fetch(`${API_BASE}/auth/status`);
  return res.json();
}

function saveSession(token, username, remember = true) {
  state.token = token;
  state.username = username;
  if (remember) {
    localStorage.setItem(PERSIST_TOKEN_KEY, token);
    localStorage.setItem(PERSIST_USERNAME_KEY, username);
    sessionStorage.removeItem('mtr_token');
    sessionStorage.removeItem('mtr_username');
  } else {
    sessionStorage.setItem('mtr_token', token);
    sessionStorage.setItem('mtr_username', username);
    localStorage.removeItem(PERSIST_TOKEN_KEY);
    localStorage.removeItem(PERSIST_USERNAME_KEY);
  }
  $('header-username').textContent = username;
}

function clearSession() {
  state.token = '';
  state.username = '';
  localStorage.removeItem(PERSIST_TOKEN_KEY);
  localStorage.removeItem(PERSIST_USERNAME_KEY);
  sessionStorage.removeItem('mtr_token');
  sessionStorage.removeItem('mtr_username');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[ch]));
}

function renderSetupForm(users) {
  const form = $('setup-form');
  form.innerHTML = users
    .map((u) => {
      const safeUser = escapeHtml(u);
      const id = `setup-pw-${String(u || '').replace(/\W/g, '_')}`;
      return `
    <div class="form-group">
      <label for="${id}">${safeUser}</label>
      <div class="password-field">
        <input type="password" id="${id}" data-user="${safeUser}" autocomplete="new-password" />
        <button type="button" class="password-toggle" data-target="${id}" aria-label="Show password for ${safeUser}">Show</button>
      </div>
    </div>`;
    })
    .join('');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary btn-block';
  btn.id = 'btn-save-setup';
  btn.textContent = 'Save Passwords';
  form.appendChild(btn);
  form.querySelectorAll('.password-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = $(toggle.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} password for ${input.dataset.user}`);
    });
  });
  btn.addEventListener('click', submitSetup);
}

async function submitSetup() {
  const st = $('setup-status');
  const btn = $('btn-save-setup');
  if (btn?.disabled) return;
  setStatus(st, 'Saving passwords...', false);
  const passwords = {};
  const missing = [];
  $('setup-form').querySelectorAll('input[data-user]').forEach((inp) => {
    const value = inp.value.trim();
    passwords[inp.dataset.user] = value;
    if (value.length < 4) missing.push(inp.dataset.user);
  });
  if (missing.length) {
    setStatus(st, `Password must be at least 4 characters for: ${missing.join(', ')}`, true);
    return;
  }
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwords }),
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
    if (!res.ok) throw new Error(data.detail || data.message || 'Setup failed');
    setStatus(st, 'Setup complete. Passwords saved. Opening login...', false);
    clearSession();
    setTimeout(() => initApp(), 800);
  } catch (e) {
    const msg = e.message === 'Failed to fetch'
      ? 'Cannot reach backend. Refresh the page and make sure the cloud service is running.'
      : e.message || 'Setup failed.';
    setStatus(st, msg, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Passwords';
    }
  }
}
async function initApp() {
  populateUserSelect(AUTH_USERS);
  try {
    const status = await checkAuthStatus();
    if (status.users && status.users.length) {
      populateUserSelect(status.users);
    }
    if (status.configured === false) {
      if (localStorage.getItem(SETUP_FLAG_KEY) === '1') {
        showScreen('login');
        return;
      }
      renderSetupForm(status.users || AUTH_USERS);
      showScreen('setup');
      return;
    }
    localStorage.setItem(SETUP_FLAG_KEY, '1');
  } catch {
    /* keep hardcoded AUTH_USERS */
  }
  if (state.token) {
    showScreen('upload');
    $('header-username').textContent = state.username;
  } else {
    showScreen('login');
  }
}

function populateUserSelect(users) {
  const sel = $('login-user');
  sel.innerHTML = users.map((u) => `<option value="${u}">${u}</option>`).join('');
}

async function handleLogin() {
  const st = $('login-status');
  setStatus(st, '');
  const username = $('login-user').value;
  const password = $('login-password').value;
  if (!password) {
    setStatus(st, 'Enter your password.', true);
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    let data = {};
    const text = await res.text();
    try { data = text ? JSON.parse(text) : {}; } catch { /* ignore */ }
    if (res.status === 401) {
      setStatus(st, 'Invalid username or password.', true);
      return;
    }
    if (!res.ok) {
      setStatus(st, data.detail || data.message || 'Login failed.', true);
      return;
    }
    if (!data.token) {
      setStatus(st, 'No token returned from server.', true);
      return;
    }
    saveSession(data.token, data.username || username);
    $('login-password').value = '';
    showScreen('upload');
    setStatus(st, '');
  } catch (e) {
    const msg = e.message === 'Failed to fetch'
      ? 'Cannot reach backend. Refresh the page and make sure the cloud service is running.'
      : e.message || 'Login failed.';
    setStatus(st, msg, true);
  }
}

function handleLogout() {
  clearSession();
  state.templateFilename = '';
  state.metallurgyFilename = '';
  state.specFilename = '';
  state.mechReqFilename = '';
  state.preview = null;
  showScreen('login');
}

function updateProceedButton() {
  const ok = state.templateFilename && state.metallurgyFilename && state.mechReqFilename;
  $('btn-proceed-upload').disabled = !ok;
}

async function postFile(url, file) {
  const fd = new FormData();
  fd.append('file', file);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQ_MS);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${state.token}` },
    body: fd,
    signal: ctrl.signal,
  });
  clearTimeout(t);
  if (res.status === 401) {
    handleLogout();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

async function handleFileUpload(kind, file) {
  const statusEl = $('upload-status');
  setStatus(statusEl, '');
  if (!file) return;
  try {
    if (kind === 'template') {
      const data = await postFile(`${API_BASE}/upload/template`, file);
      state.templateFilename = data.template_filename;
      $('template-file-label').textContent = file.name;
    } else if (kind === 'actual') {
      const data = await postFile(`${API_BASE}/upload/metallurgy`, file);
      state.metallurgyFilename = data.metallurgy_actual_filename || data.metallurgy_filename;
      $('metal-file-label').textContent = file.name;
    } else if (kind === 'mech') {
      const data = await postFile(`${API_BASE}/upload/mechanical`, file);
      state.mechReqFilename = data.mechanical_requirements_filename || '';
      $('mech-file-label').textContent = file.name;
    }
    setStatus(statusEl, 'File saved on server.', false);
  } catch (e) {
    setStatus(statusEl, e.message || 'Upload failed', true);
  }
  updateProceedButton();
}

function wireUploadZone(zoneId, inputId, kind) {
  const zone = $(zoneId);
  const input = $(inputId);
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    if (f) handleFileUpload(kind, f);
    input.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
  });
  zone.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFileUpload(kind, f);
  });
}

function renderBasicInfoGrid(basic) {
  const grid = $('basic-info-grid');
  grid.innerHTML = BASIC_FIELDS.map(
    (f) => `
    <div class="form-group preview-field">
      <label>${f.label} <span class="cell-ref">${f.cell}</span></label>
      <input type="text" data-basic="${f.key}" value="${String(basic[f.key] || '').replace(/"/g, '&quot;')}" />
      <div class="field-source"><span class="${sourceBadgeClass('metallurgy')}">${sourceBadgeLabel('metallurgy')}</span></div>
    </div>`,
  ).join('');
  grid.querySelectorAll('input[data-basic]').forEach(attachSourceTracking);
}

function renderChemicalTable(chemAct, chemSpec) {
  const tbody = $('table-chemical').querySelector('tbody');
  tbody.innerHTML = CHEM_ELEMENTS.map(
    (el) => `
    <tr>
      <td><strong>${el}</strong></td>
      <td>
        <div class="value-stack">
          <input type="text" id="chem_spec_${el}" data-chem-spec="${el}" value="${String(chemSpec?.[el] || '').replace(/"/g, '&quot;')}" />
          <span class="${sourceBadgeClass(chemSpec?.[el] ? 'requirements' : 'requirements')}">${sourceBadgeLabel('requirements')}</span>
        </div>
      </td>
      <td>
        <div class="value-stack">
          <input type="text" data-chem-act="${el}" value="${String(chemAct?.[el] || '').replace(/"/g, '&quot;')}" />
          <span class="${sourceBadgeClass('metallurgy')}">${sourceBadgeLabel('metallurgy')}</span>
        </div>
      </td>
    </tr>`,
  ).join('');
  tbody.querySelectorAll('input[data-chem-spec], input[data-chem-act]').forEach(attachSourceTracking);
}

function renderMechanicalTable(mechAct, mechSpec) {
  const idMap = {
    'tensile': 'spec_tensile',
    'proof_stress': 'spec_proof',
    'elongation': 'spec_elongation',
    'hardness_bhn': 'spec_hardness',
    'impact_individual': 'spec_impact_ind',
    'impact_mean': 'spec_impact_mean'
  };
  const tbody = $('table-mechanical').querySelector('tbody');
  tbody.innerHTML = MECH_ROWS.map(
    (row) => `
    <tr>
      <td>${row.label}</td>
      <td>
        <div class="value-stack">
          <input type="text" id="${idMap[row.key] || ''}" data-mech-spec="${row.key}" value="${String(mechSpec?.[row.key] || '').replace(/"/g, '&quot;')}" />
          <span class="${sourceBadgeClass('requirements')}">${sourceBadgeLabel('requirements')}</span>
        </div>
      </td>
      <td>
        <div class="value-stack">
          <input type="text" data-mech-act="${row.key}" value="${String(mechAct?.[row.key] || '').replace(/"/g, '&quot;')}" />
          <span class="${sourceBadgeClass('metallurgy')}">${sourceBadgeLabel('metallurgy')}</span>
        </div>
      </td>
    </tr>`,
  ).join('');
  tbody.querySelectorAll('input[data-mech-spec], input[data-mech-act]').forEach(attachSourceTracking);
}

function collectPreviewFromDom() {
  const basic = {};
  document.querySelectorAll('[data-basic]').forEach((inp) => {
    basic[inp.dataset.basic] = inp.value.trim();
  });
  const chemical_actual = {};
  const chemical_specified = {};
  document.querySelectorAll('[data-chem-act]').forEach((inp) => {
    chemical_actual[inp.dataset.chemAct] = inp.value.trim();
  });
  document.querySelectorAll('[data-chem-spec]').forEach((inp) => {
    chemical_specified[inp.dataset.chemSpec] = inp.value.trim();
  });
  const mechanical_actual = {};
  const mechanical_specified = {};
  document.querySelectorAll('[data-mech-act]').forEach((inp) => {
    mechanical_actual[inp.dataset.mechAct] = inp.value.trim();
  });
  document.querySelectorAll('[data-mech-spec]').forEach((inp) => {
    mechanical_specified[inp.dataset.mechSpec] = inp.value.trim();
  });
  return {
    heat_no: basic.heat_no || $('field-heat').value.trim(),
    casting_name: basic.casting_name || $('field-casting').value.trim(),
    basic_info: basic,
    chemical_actual,
    chemical_specified,
    mechanical_actual,
    mechanical_specified,
  };
}

async function runSearch() {
  const st = $('entry-status');
  setStatus(st, '');
  const heat = $('field-heat').value.trim();
  const casting = $('field-casting').value.trim();
  if (!heat || !casting) {
    setStatus(st, 'Heat No and Casting Name are required.', true);
    return;
  }
  if (!state.metallurgyFilename) {
    setStatus(st, 'Upload the metallurgy sheet first.', true);
    return;
  }
  try {
    const res = await apiPost('/search', {
      heat_no: heat,
      casting_name: casting,
      metallurgy_filename: state.metallurgyFilename,
      specification_filename: state.specFilename || undefined,
      mechanical_requirements_filename: state.mechReqFilename || undefined,
    });
    const data = await res.json();
    if (res.status === 401) {
      handleLogout();
      return;
    }
    if (!res.ok) throw new Error(data.detail || data.message || 'Search failed');
    if (!data.success) {
      setStatus(st, data.message || 'Heat No / Casting Name not found.', true);
      return;
    }
    state.preview = data;
    const basic = { ...data.basic_info, heat_no: heat, casting_name: casting };
    renderBasicInfoGrid(basic);
    renderChemicalTable(data.chemical_actual, data.chemical_specified || {});
    const chemSpec = data.chemical_specified || {}
    const elements = ['C','Si','Mn','P','S','Cu','Ni','Mg']
    elements.forEach(el => {
        const el_id = 'chem_spec_' + el
        const input = document.getElementById(el_id)
        if(input) input.value = chemSpec[el] !== undefined && chemSpec[el] !== null ? String(chemSpec[el]) : ''
    })
    renderMechanicalTable(data.mechanical_actual, data.mechanical_specified || {});
    const spec = data.mechanical_specified || {};
    document.getElementById('spec_tensile').value = spec.tensile || '';
    document.getElementById('spec_proof').value = spec.proof_stress || '';
    document.getElementById('spec_elongation').value = spec.elongation || '';
    document.getElementById('spec_hardness').value = spec.hardness || '';
    document.getElementById('spec_impact_ind').value = spec.impact_individual || '';
    document.getElementById('spec_impact_mean').value = spec.impact_mean || '';
    showScreen('preview');
    setStatus(st, '');
  } catch (e) {
    setStatus(st, e.message || 'Search failed', true);
  }
}

async function downloadFinalReport() {
  const st = $('preview-status');
  setStatus(st, '');
  if (!state.templateFilename || !state.metallurgyFilename) {
    setStatus(st, 'Missing uploaded files.', true);
    return;
  }
  const payload = collectPreviewFromDom();
  const body = {
    heat_no: payload.heat_no,
    casting_name: payload.casting_name,
    template_filename: state.templateFilename,
    metallurgy_actual_filename: state.metallurgyFilename,
    specification_filename: state.specFilename || null,
    mechanical_requirements_filename: state.mechReqFilename || null,
    customer: payload.basic_info.customer || '',
    material_grade: payload.basic_info.material_grade || '',
    drawing_no: payload.basic_info.drawing_no || '',
    casting_sl_no: payload.basic_info.casting_sl_no || '',
    invoice_no_date: payload.basic_info.invoice_no_date || '',
    doc_ref: payload.basic_info.doc_ref || '',
    issue_no_dt: payload.basic_info.issue_no_dt || '',
    rev_no_dt: payload.basic_info.rev_no_dt || '',
    basic_info: payload.basic_info,
    chemical_actual: payload.chemical_actual,
    chemical_specified: payload.chemical_specified,
    mechanical_actual: payload.mechanical_actual,
    mechanical_specified: payload.mechanical_specified,
  };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQ_MS);
    const res = await fetch(`${API_BASE}/download_report`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 401) {
      handleLogout();
      return;
    }
    const ctype = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || ctype.includes('json')) {
      const text = await res.text();
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j.detail || j.message || text;
      } catch {
        /* keep */
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Material_Test_Report.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus(st, 'Report downloaded.', false);
  } catch (e) {
    setStatus(st, e.name === 'AbortError' ? 'Request timed out.' : e.message, true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('btn-login').addEventListener('click', handleLogin);
  $('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  $('btn-logout').addEventListener('click', handleLogout);
  $('btn-proceed-upload').addEventListener('click', () => showScreen('entry'));
  $('btn-back-entry').addEventListener('click', () => showScreen('upload'));
  $('btn-search').addEventListener('click', runSearch);
  $('btn-back-preview').addEventListener('click', () => showScreen('entry'));
  $('btn-final-download').addEventListener('click', downloadFinalReport);

  wireUploadZone('zone-metallurgy', 'input-metallurgy', 'actual');
  wireUploadZone('zone-mech', 'input-mech', 'mech');
  wireUploadZone('zone-template', 'input-template', 'template');

  initApp();
});




