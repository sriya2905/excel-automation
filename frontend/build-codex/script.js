/**
 * Material Test Report Generator — SGIL
 * Flow: Setup (once) → Login → Upload → Entry → Preview → Download
 */
/** Backend root — no trailing slash. Login: POST {root}/login */
function apiRootCandidates() {
  const configured =
    typeof window !== 'undefined' && window.MTR_API_ROOT
      ? String(window.MTR_API_ROOT).replace(/\/$/, '')
      : '';
  const list = [
    configured,
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    // CRA dev server (package.json proxy / setupProxy.js)
    typeof window !== 'undefined' ? window.location.origin : '',
  ].filter(Boolean);
  return [...new Set(list)];
}

function apiBase(root) {
  return `${root.replace(/\/$/, '')}/api`;
}

const API_ROOT = apiRootCandidates()[0];
const API_BASE = apiBase(API_ROOT);
const REQ_MS = 300000;

const AUTH_USERS = [
  'Mahesh Chavan',
  'Rahul Karpe',
  'Digember',
  'Quality Assurance',
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

const BASIC_FIELDS = [
  { key: 'customer', label: 'Customer Name', cell: 'D6' },
  { key: 'material_grade', label: 'Material Grade', cell: 'D7' },
  { key: 'casting_name', label: 'Casting Name', cell: 'D8' },
  { key: 'drawing_no', label: 'Drawing No', cell: 'D9' },
  { key: 'heat_no', label: 'Heat No', cell: 'D10' },
  { key: 'casting_sl_no', label: 'Casting Sl No', cell: 'K10' },
  { key: 'invoice_no_date', label: 'Invoice No / Date', cell: 'D11' },
];

const state = {
  token: localStorage.getItem('mtr_token') || '',
  username: localStorage.getItem('mtr_username') || '',
  templateFilename: '',
  metallurgyFilename: '',
  specFilename: '',
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

function saveSession(token, username) {
  state.token = token;
  state.username = username;
  localStorage.setItem('mtr_token', token);
  localStorage.setItem('mtr_username', username);
  $('header-username').textContent = username;
}

function clearSession() {
  state.token = '';
  state.username = '';
  localStorage.removeItem('mtr_token');
  localStorage.removeItem('mtr_username');
}

function renderSetupForm(users) {
  const form = $('setup-form');
  form.innerHTML = users
    .map(
      (u) => `
    <div class="form-group">
      <label for="setup-pw-${u.replace(/\W/g, '_')}">${u}</label>
      <input type="password" id="setup-pw-${u.replace(/\W/g, '_')}" data-user="${u}" autocomplete="new-password" />
    </div>`,
    )
    .join('');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary btn-block';
  btn.id = 'btn-save-setup';
  btn.textContent = 'Save Passwords';
  form.appendChild(btn);
  btn.addEventListener('click', submitSetup);
}

async function submitSetup() {
  const st = $('setup-status');
  setStatus(st, '');
  const passwords = {};
  $('setup-form').querySelectorAll('input[data-user]').forEach((inp) => {
    passwords[inp.dataset.user] = inp.value;
  });
  try {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwords }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.message || 'Setup failed');
    setStatus(st, 'Setup complete. Passwords saved to backend/.env — please log in.', false);
    setTimeout(() => initApp(), 800);
  } catch (e) {
    setStatus(st, e.message, true);
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
      renderSetupForm(status.users || AUTH_USERS);
      showScreen('setup');
      return;
    }
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
  let lastErr = null;
  for (const root of apiRootCandidates()) {
    try {
      const res = await fetch(`${root}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      let data = {};
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        lastErr = new Error(`Invalid response from ${root}`);
        continue;
      }
      if (res.status === 404) {
        lastErr = new Error(data.detail || 'Not Found');
        continue;
      }
      if (!res.ok) {
        const detail = data.detail;
        setStatus(
          st,
          typeof detail === 'string' ? detail : 'Invalid username or password',
          true,
        );
        return;
      }
      if (!data.token) {
        lastErr = new Error('No token returned');
        continue;
      }
      window.MTR_API_ROOT = root;
      saveSession(data.token, data.username);
      $('login-password').value = '';
      showScreen('upload');
      setStatus(st, '');
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  const msg =
    lastErr?.message === 'Failed to fetch'
      ? 'Cannot reach API. Run start-backend.bat (port 8000), then refresh this page.'
      : lastErr?.message || 'Login failed. Start the backend on port 8000.';
  setStatus(st, msg, true);
}

function handleLogout() {
  clearSession();
  state.templateFilename = '';
  state.metallurgyFilename = '';
  state.specFilename = '';
  state.preview = null;
  showScreen('login');
}

function updateProceedButton() {
  const ok = state.templateFilename && state.metallurgyFilename;
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
      const data = await postFile(`${API_BASE}/upload_template`, file);
      state.templateFilename = data.template_filename;
      $('template-file-label').textContent = file.name;
    } else if (kind === 'actual') {
      const data = await postFile(`${API_BASE}/upload_metallurgy`, file);
      state.metallurgyFilename = data.metallurgy_actual_filename || data.metallurgy_filename;
      $('metal-file-label').textContent = file.name;
    } else if (kind === 'spec') {
      const data = await postFile(`${API_BASE}/upload_specification`, file);
      state.specFilename = data.specification_filename || data.metallurgy_spec_filename;
      $('spec-file-label').textContent = file.name;
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
      <input type="text" data-basic="${f.key}" value="${(basic[f.key] || '').replace(/"/g, '&quot;')}" />
    </div>`,
  ).join('');
}

function renderChemicalTable(chemAct, chemSpec) {
  const tbody = $('table-chemical').querySelector('tbody');
  tbody.innerHTML = CHEM_ELEMENTS.map(
    (el) => `
    <tr>
      <td><strong>${el}</strong></td>
      <td><input type="text" data-chem-spec="${el}" value="${(chemSpec?.[el] || '').replace(/"/g, '&quot;')}" /></td>
      <td><input type="text" data-chem-act="${el}" value="${(chemAct?.[el] || '').replace(/"/g, '&quot;')}" /></td>
    </tr>`,
  ).join('');
}

function renderMechanicalTable(mechAct, mechSpec) {
  const tbody = $('table-mechanical').querySelector('tbody');
  tbody.innerHTML = MECH_ROWS.map(
    (row) => `
    <tr>
      <td>${row.label}</td>
      <td><input type="text" data-mech-spec="${row.key}" value="${(mechSpec?.[row.key] || '').replace(/"/g, '&quot;')}" /></td>
      <td><input type="text" data-mech-act="${row.key}" value="${(mechAct?.[row.key] || '').replace(/"/g, '&quot;')}" /></td>
    </tr>`,
  ).join('');
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
    renderMechanicalTable(data.mechanical_actual, data.mechanical_specified || {});
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
    basic_info: payload.basic_info,
    chemical_actual: payload.chemical_actual,
    chemical_specified: payload.chemical_specified,
    mechanical_actual: payload.mechanical_actual,
    mechanical_specified: payload.mechanical_specified,
  };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQ_MS);
    const res = await fetch(`${API_BASE}/generate_report`, {
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
    a.click();
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
  wireUploadZone('zone-spec', 'input-spec', 'spec');
  wireUploadZone('zone-template', 'input-template', 'template');

  initApp();
});
