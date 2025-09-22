import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import winston from 'winston';
import { fileURLToPath } from 'url';

// Load env
// Resolve paths relative to this server file to avoid process.cwd() issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env (same folder as this file)
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Logger
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'app.log'), maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Configs
const featuresPath = path.join(__dirname, 'config', 'features.json');
const rolesPath = path.join(__dirname, 'config', 'roles.json');
let FEATURES = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
let ROLES = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Helpers
const sanitize = (s = '') => String(s).replace(/[^\w@.\-\s]/g, '').trim();
const systems = [
  'ping-directory',
  'ping-federate',
  'cyberark',
  'saviynt',
  'azure-ad',
  'ping-mfa',
];

const loadMock = (file) => {
  try {
    const p = path.join(__dirname, 'mocks', file);
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return null;
  }
};

function getRole(email) {
  const lower = (email || '').toLowerCase();
  if (lower.startsWith('ops@')) return 'ops';
  if (lower.startsWith('management@')) return 'management';
  return 'employee';
}

function featureEnabled(system) {
  return !!(FEATURES.systems && FEATURES.systems[system]);
}

function hasPermission(role, system, perm) {
  const roleObj = ROLES[role] || ROLES['employee'];
  return !!(roleObj && roleObj[system] && roleObj[system][perm]);
}

// Auth middleware
function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Access log middleware
app.use((req, _res, next) => {
  const redactedAuth = req.headers.authorization ? '[REDACTED]' : undefined;
  logger.info({ msg: 'request', method: req.method, url: req.originalUrl, auth: redactedAuth });
  next();
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Expose features for frontend config
app.get('/config/features', (_req, res) => {
  try {
    const fresh = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
    FEATURES = fresh; // refresh in-memory copy
    return res.json(fresh);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load features' });
  }
});

// Auth (mock or real toggle, but only mock implemented)
app.post('/auth/login', (req, res) => {
  if (!FEATURES.useMockAuth) {
    return res.status(501).json({ error: 'Real auth not implemented in this demo' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const role = getRole(email);
  const token = jwt.sign({ email, role }, JWT_SECRET, { expiresIn: '24h' });
  logger.info({ msg: 'login', role, email });
  return res.json({ token, role, email });
});

// Feature/RBAC gate helpers
function gateOwn(system) {
  return (req, res, next) => {
    if (!featureEnabled(system)) return res.status(404).json({ error: 'Feature not enabled' });
    const role = (req.user && req.user.role) || 'employee';
    if (!hasPermission(role, system, 'own')) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function gateAll(system) {
  return (req, res, next) => {
    if (!featureEnabled(system)) return res.status(404).json({ error: 'Feature not enabled' });
    const role = (req.user && req.user.role) || 'employee';
    if (!hasPermission(role, system, 'all')) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// System routes (mocks)
systems.forEach((system) => {
  // own initial
  app.get(`/api/own-${system}`, authRequired, gateOwn(system), (req, res) => {
    if (!FEATURES.useMocks) return res.status(501).json({ error: 'Real API not implemented' });
    const data = loadMock(`${system}-initial.json`);
    if (!data) return res.status(500).json({ error: 'Mock not found' });
    return res.json({ system, scope: 'own', data });
  });
  // own details
  app.get(`/api/own-${system}/details`, authRequired, gateOwn(system), (req, res) => {
    if (!FEATURES.useMocks) return res.status(501).json({ error: 'Real API not implemented' });
    const data = loadMock(`${system}-details.json`);
    if (!data) return res.status(500).json({ error: 'Mock not found' });
    return res.json({ system, scope: 'own', data });
  });
});

// All users (ops): combined across systems at a summary level
app.get('/api/all-users', authRequired, (req, res) => {
  const role = (req.user && req.user.role) || 'employee';
  // require at least one system 'all' permission, typically ops has many
  const allowed = systems.some((s) => hasPermission(role, s, 'all'));
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  if (!FEATURES.useMocks) return res.status(501).json({ error: 'Real API not implemented' });
  const list = loadMock('all-users.json') || [];
  // pagination
  const limit = Math.min(parseInt(req.query.limit) || 50, 50);
  const offset = parseInt(req.query.offset) || 0;
  const paged = list.slice(offset, offset + limit);
  return res.json({ total: list.length, limit, offset, results: paged });
});

// Search employees (limited: ping-directory + ping-mfa)
app.get('/api/search-employee/:query', authRequired, (req, res) => {
  const q = sanitize(req.params.query);
  const role = (req.user && req.user.role) || 'employee';
  const pdEnabled = featureEnabled('ping-directory');
  const mfaEnabled = featureEnabled('ping-mfa');
  const pdAllowed = hasPermission(role, 'ping-directory', 'search');
  const mfaAllowed = hasPermission(role, 'ping-mfa', 'search');

  if (!pdEnabled && !mfaEnabled) return res.status(404).json({ error: 'Feature not enabled' });
  if (!pdAllowed && !mfaAllowed) return res.status(403).json({ error: 'Forbidden' });

  const pd = pdEnabled && pdAllowed ? loadMock('ping-directory-search.json') : [];
  const mfa = mfaEnabled && mfaAllowed ? loadMock('ping-mfa-search.json') : [];

  // Simple filter by substring match on name/email/userId
  const filter = (arr) =>
    (arr || []).filter((u) => {
      const hay = `${u.name || ''} ${u.email || ''} ${u.userId || ''} ${(u.status || '')}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });

  const results = {
    'ping-directory': filter(pd).map((u) => ({ name: u.name, email: u.email, userId: u.userId })),
    'ping-mfa': filter(mfa).map((u) => ({ userId: u.userId, status: u.status, lastEvent: u.lastEvent })),
  };

  return res.json(results);
});

// NEW: Mock ServiceNow incidents endpoint
app.get('/api/snow/incidents', authRequired, (req, res) => {
  if (!FEATURES.useMocks) return res.status(501).json({ error: 'Real ServiceNow API not implemented' });

  const requester = req.user || {};
  const role = requester.role || 'employee';
  const selfEmail = String(requester.email || '').toLowerCase();
  const queryEmail = sanitize(String(req.query.email || '')).toLowerCase();

  // Enforce access: non-ops can only view their own incidents
  if (role !== 'ops' && queryEmail && queryEmail !== selfEmail) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const targetEmail = (role === 'ops' ? (queryEmail || selfEmail) : selfEmail) || '';
  if (!targetEmail) return res.status(400).json({ error: 'Target email required' });

  const incidents = loadMock('snow-incidents.json') || [];
  let items = (incidents || []).filter((it) => String(it.assigned_to || '').toLowerCase() === targetEmail);

  // Fallback: synthesize demo incidents for any user with no records in mocks (helps employee role tests)
  if (!items || items.length === 0) {
    const now = new Date();
    const iso = (d) => new Date(d).toISOString();
    items = [
      {
        number: 'INC-DEMO-' + Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0'),
        short_description: 'Demo: Access issue with corporate app',
        state: 'open',
        priority: '3 - Moderate',
        updatedAt: iso(now),
        assigned_to: targetEmail,
      },
      {
        number: 'INC-DEMO-' + Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0'),
        short_description: 'Demo: MFA verification pending',
        state: 'in_progress',
        priority: '2 - High',
        updatedAt: iso(now.getTime() - 60 * 60 * 1000),
        assigned_to: targetEmail,
      },
      {
        number: 'INC-DEMO-' + Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0'),
        short_description: 'Demo: Password reset completed',
        state: 'closed',
        priority: '4 - Low',
        updatedAt: iso(now.getTime() - 24 * 60 * 60 * 1000),
        assigned_to: targetEmail,
      },
    ];
  }

  const counts = items.reduce(
    (acc, it) => {
      const st = String(it.state || '').toLowerCase();
      if (st === 'open') acc.open += 1;
      else if (st === 'in_progress' || st === 'in progress') acc.in_progress += 1;
      else if (st === 'closed' || st === 'resolved') acc.closed += 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, open: 0, in_progress: 0, closed: 0 }
  );

  return res.json({ email: targetEmail, ...counts, items });
});

// Start server
app.listen(PORT, () => {
  logger.info({ msg: `backend listening on ${PORT}` });
});