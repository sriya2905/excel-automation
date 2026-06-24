import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import WizardDashboard from './WizardDashboard';

function apiRootCandidates() {
  const configured = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return [...new Set([origin, configured, 'http://127.0.0.1:8000', 'http://localhost:8000'].filter(Boolean))];
}

const TOKEN_KEY = 'mtr_token';
const USER_KEY = 'mtr_username';
const PERSIST_TOKEN_KEY = 'mtr_token_persist';
const PERSIST_USER_KEY = 'mtr_username_persist';

const AUTH_USERS = [
  'Mahesh Chavan',
  'Rahul Karape',
  'Digember',
  'Q/A Lab',
];

function readSavedSession() {
  if (typeof window === 'undefined') return { token: '', username: '' };
  const token =
    localStorage.getItem(PERSIST_TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY) ||
    '';
  const username =
    localStorage.getItem(PERSIST_USER_KEY) ||
    sessionStorage.getItem(USER_KEY) ||
    '';
  return { token, username };
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState(AUTH_USERS[0]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState(AUTH_USERS);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      for (const root of apiRootCandidates()) {
        try {
          const res = await axios.get(`${root}/api/auth/status`, { timeout: 10000 });
          const list = Array.isArray(res.data?.users) && res.data.users.length ? res.data.users : AUTH_USERS;
          if (!cancelled) {
            setUsers(list);
            setUsername((current) => (list.includes(current) ? current : list[0] || AUTH_USERS[0]));
          }
          return;
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setUsers(AUTH_USERS);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    let lastErr = null;
    for (const root of apiRootCandidates()) {
      try {
        const res = await axios.post(`${root}/login`, { username, password }, { timeout: 15000 });
        if (!res.data?.token) {
          lastErr = new Error('No token returned');
          continue;
        }
        onLogin(res.data.token, res.data.username);
        setPassword('');
        setBusy(false);
        return;
      } catch (err) {
        lastErr = err;
        if (err.response?.status === 401) break;
        if (err.response?.status === 404) continue;
      }
    }
    if (lastErr?.response?.status === 401) {
      setError('Invalid username or password.');
    } else if (!lastErr?.response) {
      setError('Cannot reach API. Run start-backend.bat (port 8000), then try again.');
    } else {
      setError(lastErr.response?.data?.detail || 'Login failed. Is the backend running on port 8000?');
    }
    setBusy(false);
  };

  return (
    <div style={loginPageStyle}>
      <div style={loginCardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={`${process.env.PUBLIC_URL || ''}/sgil-logo.png`}
            alt="Synergy Green Industries Ltd"
            style={{ width: '100%', maxWidth: 240, height: 'auto', objectFit: 'contain', marginBottom: 20 }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h1 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.4rem' }}>Material Test Report Generator</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Authorized access only</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>User</label>
          <select
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ ...selectStyle, marginBottom: 16 }}
          >
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, maxWidth: '100%', marginBottom: 20 }}
            autoComplete="current-password"
            placeholder="Enter password"
          />

          {error ? (
            <div role="alert" style={{ ...alertStyle, marginBottom: 16 }}>
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={busy} style={loginBtnStyle}>
            {busy ? 'Signing inâ€¦' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => readSavedSession().token);
  const [username, setUsername] = useState(() => readSavedSession().username);

  const handleLogin = (newToken, name, remember = true) => {
    if (remember) {
      localStorage.setItem(PERSIST_TOKEN_KEY, newToken);
      localStorage.setItem(PERSIST_USER_KEY, name);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, newToken);
      sessionStorage.setItem(USER_KEY, name);
      localStorage.removeItem(PERSIST_TOKEN_KEY);
      localStorage.removeItem(PERSIST_USER_KEY);
    }
    setToken(newToken);
    setUsername(name);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem(PERSIST_TOKEN_KEY);
    localStorage.removeItem(PERSIST_USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken('');
    setUsername('');
  }, []);

  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        const savedToken = localStorage.getItem(PERSIST_TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        if (err.response?.status === 401 && savedToken) {
          handleLogout();
        }
        return Promise.reject(err);
      },
    );
    return () => axios.interceptors.response.eject(id);
  }, [handleLogout]);

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <WizardDashboard username={username} onLogout={handleLogout} />;
}

export default App;

const labelStyle = { display: 'block', fontWeight: 600, color: '#334155', marginBottom: 6, fontSize: '0.9rem' };
const inputStyle = {
  width: '100%',
  maxWidth: 420,
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
};
const selectStyle = {
  ...inputStyle,
  maxWidth: '100%',
  minHeight: 42,
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
};
const alertStyle = {
  padding: '12px 14px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  borderRadius: 6,
};
const loginPageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
  fontFamily: 'system-ui, Arial, sans-serif',
};
const loginCardStyle = {
  width: '100%',
  maxWidth: 400,
  background: '#fff',
  borderRadius: 16,
  padding: '32px 28px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
};
const loginBtnStyle = {
  width: '100%',
  padding: '12px 20px',
  background: '#1e3a5f',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
};

