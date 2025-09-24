# Identity Portal (Next.js 15 + shadcn/ui)

## New Features (Sept 2025)

- Copy JSON everywhere
  - Added "Copy JSON" buttons to all places where JSON is rendered:
    - System tiles (initial data)
    - System Details dialog
    - Employee Search result dialogs (single and All Systems)
    - All Systems HTML/JSON views (per-system and global)
- Ops enhancements for All Systems view
  - Renamed button to: "View all system details JSON" (ops only)
  - Added adjacent: "View all system details HTML" (ops only)
  - HTML view renders a clean key/value layout for non-technical readability
- System tile header layout (employee view)
  - Buttons are now consistently aligned and wrap nicely on smaller screens
  - System name is more prominent and always visible (truncates gracefully)
- Configurable card order (deployment-time)
  - New optional `systemsOrder` array in backend/config/features.json controls the order of the six system cards on the dashboard.
  - Missing or invalid keys are ignored; any systems not listed are appended in the default order.
- Employee: Ping Federate quick actions (NEW)
  - On the Ping Federate card, employees now see three buttons next to "Copy JSON":
    - User Info → opens a popup with mocked Ping Federate UserInfo payload
    - OIDC → lists all mocked OIDC connections (5 key fields each)
    - SAML → lists all mocked SAML connections (5 key fields each)
  - Backed by lightweight mock API routes (see API Overview below)

## ServiceNow Incidents (SNOW) — Mock Integration

This app includes a mock ServiceNow incidents feature used by the header button "Show SNOW tickets". It works in all roles and respects access rules.

### Backend
- Endpoint: `GET http://localhost:3001/api/snow/incidents?email=<userEmail>`
- Auth: Bearer JWT required (issued by `/auth/login`)
- Mode: Uses mocks when `useMocks: true` in `backend/config/features.json`
- Mock file: `backend/mocks/snow-incidents.json`

Example mock (already provided):
```
[
  { "number": "INC0010001", "short_description": "Unable to sign in to VPN", "state": "open", "priority": "2 - High", "updatedAt": "2025-09-18T12:10:00Z", "assigned_to": "jane.doe@company.com" },
  { "number": "INC0010002", "short_description": "Password reset request", "state": "in_progress", "priority": "4 - Low", "updatedAt": "2025-09-18T14:55:00Z", "assigned_to": "john.smith@company.com" },
  { "number": "INC0010003", "short_description": "MFA push notifications not received", "state": "open", "priority": "3 - Moderate", "updatedAt": "2025-09-19T07:05:00Z", "assigned_to": "john.smith@company.com" },
  { "number": "INC0010004", "short_description": "Access denied to CyberArk safe", "state": "closed", "priority": "3 - Moderate", "updatedAt": "2025-09-17T09:30:00Z", "assigned_to": "jane.doe@company.com" },
  { "number": "INC0010005", "short_description": "Ping Federate SSO error for Salesforce", "state": "in_progress", "priority": "2 - High", "updatedAt": "2025-09-19T06:25:00Z", "assigned_to": "ops.engineer@company.com" },
  { "number": "INC0010006", "short_description": "Azure AD group membership issue", "state": "open", "priority": "3 - Moderate", "updatedAt": "2025-09-18T21:12:00Z", "assigned_to": "employee@company.com" },
  { "number": "INC0010007", "short_description": "Saviynt role not applied", "state": "closed", "priority": "4 - Low", "updatedAt": "2025-09-16T15:40:00Z", "assigned_to": "employee@company.com" },
  { "number": "INC0010008", "short_description": "Ping Directory attribute mismatch", "state": "open", "priority": "3 - Moderate", "updatedAt": "2025-09-19T08:02:00Z", "assigned_to": "ops@company.com" }
]
```
- States covered: `open`, `in_progress`, `closed` (frontend also treats `in progress`/`resolved` aliases)
- Filtering: Backend filters items where `assigned_to` equals the target email
- Counts returned: `{ total, open, in_progress, closed }` alongside `items`

### Role behavior
- Employee: can only view their own incidents; backend enforces this. Header button always visible and shows only self tickets.
- Ops: can view incidents for the current searched user only. Header button becomes visible only after a search resolves a target user (email query or first Ping Directory match). Clicking shows that user's incidents.

### Frontend usage
- Header button: "Show SNOW tickets"
  - Displays a count pill after first fetch (Open + In-Progress)
  - Opens a dialog with a professional table layout: Number, Summary, Status, Priority, Updated
  - Status shown with colored chips; content wraps and dialog scrolls for long content
  - Refresh button available inside the dialog
- Target resolution:
  - Employee: uses logged-in email
  - Ops: after Search, uses the typed email if it looks valid; else the exact/first Ping Directory match

### How to test
1) Start backend on 3001 and frontend on 3000.
2) Login as:
   - Employee: `employee@company.com` (any password in mock mode)
   - Ops: `ops@company.com` (or `ops.engineer@company.com`)
3) Employee: Click "Show SNOW tickets" → incidents for `employee@company.com` appear (open + closed examples in mock).
4) Ops:
   - Search for `john.smith@company.com` → header button appears → click to see John's incidents
   - Search for `jane.doe@company.com` → click again to see Jane's incidents

### Updating/adding mock data
- Edit `backend/mocks/snow-incidents.json` and add objects with fields:
  - `number`, `short_description`, `state` (open|in_progress|closed), `priority`, `updatedAt`, `assigned_to`
- Save and restart backend; reload the app.

## Mock Ticket Submission

The `/api/submit-snow-ticket` endpoint simulates ServiceNow ticket creation for demo purposes. It generates mock ticket numbers and logs details to the console.

### Configuration
- **Environment Variable**: Set `MOCK_FAILURE_SYSTEMS` in `.env.local` to comma-separated systems that should simulate ticket creation failures (e.g., `MOCK_FAILURE_SYSTEMS=cyberark`).
  - Default: `['cyberark']` (failure for CyberArk).
  - All other systems always succeed with detailed mock ticket data.

### Scenarios
- **Success (any system except CyberArk)**:
  - When submitting from a system card (e.g., Ping Directory, Ping MFA), it creates a mock ticket (e.g., `INC-ABC12345`).
  - Logs full mock ticket object to console, including payload excerpt, status, priority, etc.
  - Returns ticket details in response for frontend toast.

- **Failure (CyberArk)**:
  - When submitting from a CyberArk card, simulates failure (HTTP 500).
  - Logs error details to console with reason "Mock failure scenario".
  - Frontend shows error toast; useful for testing error handling.

### Testing
1. Login as employee/ops.
2. Load data for any system (e.g., Ping Directory) → Click "Submit SNOW ticket" → Check console for success log and toast "SNOW ticket submitted: INC-...".
3. Load data for CyberArk → Click "Submit SNOW ticket" → Check console for failure log and error toast.
4. To customize failures: Edit `.env.local` with `MOCK_FAILURE_SYSTEMS=system1,system2`, restart dev server.

This setup allows extending to real ServiceNow integration by replacing the mock logic while reusing the configurable failure simulation for testing.

## How to Use

### Copy JSON
- Click "Copy JSON" above any JSON block to copy the pretty-printed JSON to your clipboard.
- In the All Systems dialog (both JSON and HTML modes), use either the global Copy JSON (top-right) or the per-system Copy JSON.

### Ops: All Systems buttons
- In the search section (for ops role):
  - "View all system details JSON": Aggregates per-system details across all six systems into one dialog.
  - "View all system details HTML": Same data as JSON view, but rendered as a key/value layout for readability.

### HTML View on system tiles
- Each system tile includes an "HTML View" button that opens a key/value popup for the current system's data.
- If Details are already loaded, it uses those; otherwise it shows Initial data.

### Submit SNOW Ticket
- Each system tile includes a "Submit SNOW ticket" button.
- This posts to a Next.js API route that simulates ticket creation.
- Endpoint: `POST /api/submit-snow-ticket`
  - Request: `{ system: string, payload: any, userEmail: string }`
  - Response: `{ ticketNumber: string, ok: true }` on success, or error details on failure.
- Server will log the submission details (system, email, payload snippet) to console.
- CyberArk includes an additional "Test failure" button for error scenario testing.

## Employee "Educate me" guide

A lightweight user guide is available for employees to quickly learn which identity system to check based on common issue types (MFA, CyberArk Safe, Directory profile). The guide uses static mock data shared by all employees and opens in a professional popup dialog.

- Location: Header → "Educate me" (only visible for role = employee)
- Behavior: Opens a dialog with categorized cards (MFA, Safe/Vault, Directory)
  - Each card includes a short summary and a sample JSON snippet.

### Configure at deploy time

You can toggle the guide with either an environment variable (recommended for deployments) or a backend features flag. The environment variable takes precedence.

1) Environment variable (takes precedence)
- NEXT_PUBLIC_EDUCATE_GUIDE=true|false (case-insensitive; accepts 1/0, true/false, on/off, yes/no, enabled/disabled)

Examples:
- Enable: NEXT_PUBLIC_EDUCATE_GUIDE=true
- Disable: NEXT_PUBLIC_EDUCATE_GUIDE=false

2) Backend features flag
- Add/update employeeEducateGuideEnabled in features.json (served by GET /config/features)

Example features.json excerpt:
```
{
  "credentialSource": "env",
  "useMocks": true,
  "useMockAuth": true,
  "systems": {
    "ping-directory": true,
    "ping-federate": true,
    "cyberark": true,
    "saviynt": true,
    "azure-ad": true,
    "ping-mfa": true
  },
  "employeeEducateGuideEnabled": true
}
```

Resolution order at runtime:
- If NEXT_PUBLIC_EDUCATE_GUIDE is set → use it
- Else if features.employeeEducateGuideEnabled is set → use it
- Else default ON (visible for employees)

### What employees see

Categories currently included (all with shared mock data):
- MFA related issues → Check Ping MFA JSON logs (status, enrolled devices, last event)
- Safe/Vault access issues → Check CyberArk JSON (Safe membership, account status)
- Profile/directory issues → Check Ping Directory JSON (email, department, status)

Actions:
- Copy sample JSON: copies the rendered mock snippet

No per-user persistence or customization is stored; the guide is the same for all employees by design.

### Testing locally

- Start backend on :3001 and frontend on :3000
- Login with an employee account (any email not starting with ops@ or management@)
- Confirm the header shows the "Educate me" button; click to open the guide
- Click "Copy sample JSON" and verify your clipboard contents

### Notes

- The dialog uses Tailwind-based components (Shadcn UI) and respects light/dark/navy themes
- The guide does not depend on live system data and is safe in mock/real modes
- To hide for non-employee roles, no additional config is needed (it is already limited to role = employee)

## Configuration

### Environment Variables (.env)

Configure both frontend and backend from environment files. Frontend variables must be prefixed with NEXT_PUBLIC_.

- Frontend (Next.js) — create .env.local at repo root (copy from .env.example):
  - NEXT_PUBLIC_API_BASE — Base URL for backend API (default: http://localhost:3001)
  - NEXT_PUBLIC_EDUCATE_GUIDE=true|false — Toggle the employee "Educate me" guide (env takes precedence over backend features)
  - NEXT_PUBLIC_QA_PING_DIRECTORY=true|false — Enable/disable Ping Directory tab in Ops Quick Actions
  - NEXT_PUBLIC_QA_PING_FEDERATE=true|false — Enable/disable Ping Federate tab
  - NEXT_PUBLIC_QA_CYBERARK=true|false — Enable/disable CyberArk tab
  - NEXT_PUBLIC_QA_SAVIYNT=true|false — Enable/disable Saviynt tab
  - NEXT_PUBLIC_QA_AZURE_AD=true|false — Enable/disable Azure AD tab
  - NEXT_PUBLIC_QA_PING_MFA=true|false — Enable/disable Ping MFA tab
  - NEXT_PUBLIC_SPLUNK_URL — URL for "Take Me to Splunk" (default: https://splunk.company.com)
  - NEXT_PUBLIC_CLOUDWATCH_URL — URL for "Take Me to Cloud Watch" (default: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1)
  - MOCK_FAILURE_SYSTEMS — Comma-separated systems to simulate ticket creation failures (default: cyberark)

Notes:
- Only NEXT_PUBLIC_* variables are exposed to the browser.
- Update .env.local and rebuild/redeploy to apply changes in production builds.

- Backend (Express) — edit backend/.env:
  - PORT — Express server port (default: 3001)
  - JWT_SECRET — JWT signing secret for mock auth (change for production)
  - LOG_LEVEL — Winston log level (error|warn|info|http|verbose|debug|silly)

Getting started:
- cp .env.example .env.local (root) and adjust as needed
- Ensure backend/.env exists (sample already provided)

### Environment files: what goes where (Education)

- .env.local (frontend)
  - Path: ./ .env.local (repo root)
  - Used by: Next.js frontend
  - Exposure: Only variables starting with NEXT_PUBLIC_ are bundled into the browser. Never put secrets here without NEXT_PUBLIC_ intent.
  - Typical values: NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_* feature flags, public URLs (Splunk/CloudWatch)

- backend/.env (backend)
  - Path: ./backend/.env
  - Used by: Express server only (server-side)
  - Exposure: NOT exposed to the browser. Safe place for secrets.
  - Typical values: PORT, JWT_SECRET, LOG_LEVEL, and any system credentials (e.g., PING_DIR_API_KEY, service tokens)

- What goes where
  - Public config needed by the browser/UI → .env.local with NEXT_PUBLIC_ prefix
  - Secrets and server-only settings (API keys, tokens) → backend/.env without NEXT_PUBLIC_

- Deployment guidance
  - Frontend hosting (e.g., Vercel/Netlify): set NEXT_PUBLIC_* variables in the host's UI (build-time env)
  - Backend hosting (e.g., Node server/PM2/Docker): set backend/.env values on the server or secret manager
  - Keep prefixes consistent: if a value must be read in the browser, it must be prefixed NEXT_PUBLIC_

- Quick setup steps
  1) cp .env.example .env.local (at repo root)
  2) Edit .env.local → set NEXT_PUBLIC_API_BASE=http://localhost:3001 (or your backend URL)
  3) Edit backend/.env → set PORT, JWT_SECRET, etc.
  4) Restart frontend and backend for changes to take effect

### Example Scenario: Updating API_BASE Didn't Take Effect Until Backend Port Change

**Scenario**: You're viewing the dashboard at route `/` (logged in, seeing system cards). You update `NEXT_PUBLIC_API_BASE=http://localhost:3002` in `.env.local` but API calls (e.g., fetching system data) still fail or use the old port. It only works after editing `backend/.env` to `PORT=3002` and restarting the backend.

**Why This Happens** (Step-by-Step Explanation):
1. **Frontend Role (`.env.local`)**: This file tells your Next.js app (running on `localhost:3000`) where to send API requests. Updating `NEXT_PUBLIC_API_BASE=http://localhost:3002` changes the `API_BASE` constant in `src/app/page.tsx` to point to port 3002.
   - Effect: The browser now tries to `fetch("http://localhost:3002/api/own-ping-directory")` instead of 3001.
   - But: If nothing is listening on port 3002 (your backend is still on 3001), requests fail (e.g., "Failed to fetch" errors in console or "Error loading data" in UI).

2. **Backend Role (`backend/.env`)**: This controls your Express server (separate from frontend).
   - Default: `PORT=3001` means the backend listens on 3001.
   - Without changing it, your backend isn't running on 3002—requests to 3002 go nowhere.

3. **The Fix (What Made It Work)**: Editing `PORT=3002` in `backend/.env` and restarting the backend starts it listening on 3002, matching the frontend's new config. Now requests succeed.

**Steps to Reproduce/Test This Scenario**:
1. Start both servers normally:
   - Backend on 3001 (`cd backend && node server.js`).
   - Frontend on 3000 (`npm run dev`).
   - Login and view dashboard at `/`—API calls work (e.g., system cards load data).

2. Update frontend only:
   - Edit `.env.local`: `NEXT_PUBLIC_API_BASE=http://localhost:3002`.
   - Restart frontend (`npm run dev`).
   - Refresh `/` → System cards show "Error loading data" (requests to empty 3002 fail).

3. Update backend too:
   - Edit `backend/.env`: `PORT=3002`.
   - Restart backend (`cd backend && node server.js`—now on 3002).
   - Refresh `/` → Dashboard works again (frontend hits backend on 3002).

**Key Takeaways**:
- Frontend env (`.env.local`) = "Where to call" (client-side URLs).
- Backend env (`backend/.env`) = "Where I listen" (server port).
- Always match them: Frontend's `NEXT_PUBLIC_API_BASE` must point to backend's `PORT`.
- Restart *both* after env changes (no hot-reload).
- Check browser DevTools > Network tab: See exact URLs called and any 404/CORS errors.
- Production: Frontend deploys to a domain (e.g., Vercel); backend to another (e.g., Render). Set `NEXT_PUBLIC_API_BASE=https://your-backend.com`.

If issues persist (e.g., CORS, wrong URLs), check console logs, restart services, and ensure ports don't conflict (e.g., kill processes on used ports with `lsof -i :3001` on macOS/Linux).

### Support Configuration
- No per-system support email mapping is currently implemented. For support workflows, use the SNOW ticket submission feature.

### Card layout order (NEW)

Control the order of the six system cards from a single deployment-time setting.

1) Open `backend/config/features.json`
2) Add an optional `systemsOrder` array with any subset/sequence of system keys:
```
{
  // ... keep existing keys ...
  "systemsOrder": [
    "ping-directory",  // 1st
    "cyberark",        // 2nd
    "ping-federate",   // 3rd
    "saviynt",         // 4th
    "azure-ad",        // 5th
    "ping-mfa"         // 6th
  ]
}
```
3) Restart the backend (so `/config/features` serves the updated config)
4) Reload the frontend or log in again; the new order will be applied immediately on the dashboard

Notes
- Keys must be one of: `ping-directory`, `ping-federate`, `cyberark`, `saviynt`, `azure-ad`, `ping-mfa`.
- If you provide only a partial list, e.g. `["cyberark", "ping-directory"]`, the remaining systems are appended after these two in the default order.
- Invalid keys are ignored safely.
- This setting does not enable/disable systems; use `systems` flags for that (see below). Disabled systems still respect order but render as "Feature not enabled".

## Implementation Notes

- File: `src/app/page.tsx`
  - Added a new optional field to the `Features` type: `systemsOrder?: SystemKey[]`.
  - Compute `orderedSystems` with `useMemo` that:
    - takes `features.systemsOrder` when available,
    - filters out unknown keys,
    - appends any missing systems in the default order.
  - The card grid now renders by mapping over `orderedSystems`, using a `SYSTEM_LABELS` map for human-friendly names.
  - This is read from `GET http://localhost:3001/config/features` post-login, so changes take effect when users log in or refresh.
- No backend code change is required beyond supplying `systemsOrder` in `backend/config/features.json`.

- File: `src/app/page.tsx` (Ping Federate quick actions)
  - On Ping Federate card, for role = employee, three small buttons render next to "Copy JSON": User Info, OIDC, SAML
  - Each opens a dialog that displays either a key/value table (for connection arrays) or JSON
  - Uses new mock API routes below and includes a per-dialog "Copy JSON" button

## Local Dev
- Frontend: `npm run dev` (Next.js 15)
- Backend (mock API assumed at localhost:3001 per existing setup)

Notes:
- If your backend isn't running, the app provides sensible fallbacks/mocks for some views.
- Styled-JSX is not used anywhere (Tailwind only).

## TL;DR — Run Locally

1) Install deps at repo root
```
npm install
```

2) Start frontend (3000) + backend (3001) together
```
npm run dev:all
```

3) Sign in (mock auth)
- ops@company.com / any password
- management@company.com / any password
- any-other@company.com / any password

If you prefer running separately:
```
# Terminal A (backend)
cd backend && npm install && node server.js

# Terminal B (frontend)
npm run dev
```

## Prerequisites & Install
- Node.js 18+ (recommended 20.x) and npm 8+
- One-time install at repo root: `npm install`
  - The first run of `npm run dev:all` will auto-install backend deps (under `backend/`). You can also do `cd backend && npm install` manually.

## Features

Frontend (Next.js)
- Login (mock auth): Email/password form; role inferred from email prefix and persisted in localStorage
- Dashboard: Responsive cards per system with initial data + "View Details" for extended data
- Employee Search: Search by name/email/ID; shows Ping Directory and Ping MFA limited results (if enabled)
- Ops View: All users table (50/page) with row-click modal to inspect per-system data
- Feature-aware UI: If a system is disabled, shows "Feature not enabled" empty state
- Error + loading states: Friendly errors (403/404), loading indicators
- Employee PF quick actions: User Info, OIDC, SAML buttons with mock data popups

Backend (Express)
- JWT Auth: POST /auth/login issues 24h token (mock mode infers role from email)
- RBAC: Per-role permissions from config/roles.json
- Rate Limiting: 100 req/min per IP
- Structured Logging: Winston JSON logs (console + file), tokens redacted
- Config Endpoint: GET /config/features exposes runtime feature flags
- Identity Endpoints (read-only):
  - GET /api/own-:system
  - GET /api/own-:system/details
  - GET /api/all-users?limit=50&offset=0 (role with any "all" permission)
  - GET /api/search-employee/:query (limited attrs for Ping Directory + Ping MFA)
- Mock Data: Located under backend/mocks/* with initial/details/search JSON files

Supported systems
- Ping Directory, Ping Federate, CyberArk, Saviynt, Azure AD, Ping MFA


## Quickstart

One command (recommended)
- npm run dev:all
- Starts Next.js (3000) and Express (3001). First run also installs backend deps.

Run separately
- Backend: cd backend && npm install && node server.js
- Frontend: npm install && npm run dev

Health checks
- Backend: http://localhost:3001/health → { ok: true }
- Frontend: http://localhost:3000


## Test Logins (Mock Auth)
- ops role: ops@company.com (any password)
- management role: management@company.com (any password)
- employee role: anything-else@company.com (any password)
- In mock mode, role is inferred from email prefix and any password works.

## Mock test data & scenarios
- Mock mode is ON by default: backend/config/features.json → `{\"useMocks\": true, \"useMockAuth\": true}`
- Files (backend/mocks):
  - ping-directory-initial.json / ping-directory-details.json
  - ping-federate-initial.json / ping-federate-details.json
  - cyberark-initial.json / cyberark-details.json
  - saviynt-initial.json / saviynt-details.json
  - azure-ad-initial.json / azure-ad-details.json
  - ping-mfa-initial.json / ping-mfa-details.json
  - ping-directory-search.json / ping-mfa-search.json
  - all-users.json

What you can test
- Employee dashboard (any non-ops email)
  - System cards → Refresh / View Details
    - Ping Directory (Alice Johnson): name, email, department, groups, pwd policy, etc.
    - Ping Federate: lastLogin, activeSessions, tokenClaims, audit
    - CyberArk: accounts with lastRotation, compliance, policies
    - Saviynt: roles, entitlements, risk, certifications
    - Azure AD: licenses, groups, devices, conditional access
    - Ping MFA: status, enrolledDevices, policy, history
- Search (employees and ops)
  - Try queries (case-insensitive):
    - "Alice" → shows PD row for Alice Johnson and MFA status for u1001
    - "u1003" → shows PD row for Charlie Kim and MFA Disabled
    - "dana.lee@company.com" → shows PD row for Dana Lee and MFA Enabled
- Ops view (sign in as ops@company.com)
  - All Users table uses all-users.json (20 seeded users)
  - Click a row → modal shows per-system JSON (PD department/title, MFA status, etc.)
  - Pagination controls work with total/limit reported by API

Sample records (for quick reference)
- ping-directory-initial.json (own): Alice Johnson — Engineering, Senior Software Engineer, Active
- ping-mfa-initial.json (own): status Enabled; devices: iPhone 14, PingID
- ping-directory-search.json: u1001..u1010 (Alice, Bob, Charlie, Dana, ...)
- ping-mfa-search.json: MFA status per userId (Enabled/Disabled/Pending)
- all-users.json: u1001..u1020 with departments and MFA status

Tips
- To simulate a disabled system, set `systems["azure-ad"] = false` in backend/config/features.json → UI cards show "Feature not enabled" and relevant APIs return 404
- To test RBAC 403s, remove `all` permission for a role/system in backend/config/roles.json and retry the corresponding endpoint

## Feature updates

- Theme defaults and options
  - Light theme is now the default (ignores system preference on first load). Your last selection persists in localStorage.
  - Navy theme refined to a lighter, more professional gradient with smooth fade. Toggle cycles: Light → Dark → Navy.

- Ops view behavior
  - On login, the Ops dashboard no longer auto-loads the full employee list or show per-user details.
  - A new "Recent Failures" panel shows:
    - Ping Federate login failures in the last N minutes
    - Ping MFA verification failures in the last N minutes
  - The time window is configurable via an input (default 10 minutes); click Refresh to update.
  - The full All Users table is hidden by default. Load it on demand with the "Load all users" button.
  - Search behavior for Ops: when searching, results are reduced to the specific employee (exact match by userId/email), and full details are still shown via "View Details" dialogs.

- Clean, responsive UI
  - Layout scales across breakpoints (1/2/3-column grids), with improved spacing and overflow handling.
  - System details and user details open in dialogs to keep pages compact and professional.

### How to use

- Theme toggle: header button cycles Light/Dark/Navy; selection persists across reloads.
- Ops: adjust the minutes field in the Recent Failures card and hit Refresh.
- Ops: click "Load all users" to fetch the full list only when needed.
- Search: type name/email/ID and click Search; click "View Details" on a card or row to see expanded data.

### Notes

- If your backend does not implement `/api/ops-failures?system=<ping-federate|ping-mfa>&minutes=<n>`, the Recent Failures panel will show a friendly message; mocks can be added later to support it.
- Navy theme variables and gradient are defined under the `.navy` class in `src/app/globals.css`.

## How the App Works

- Frontend stores token/role/email in localStorage after POST /auth/login
- System cards call backend endpoints with Authorization: Bearer <token>
- Search calls GET /api/search-employee/:query and shows PD + MFA limited results
- Ops role additionally loads GET /api/all-users with pagination
- UI honors feature flags returned by GET /config/features


## Configuration and Behavior Toggles

All config lives in the backend folder. Changes require restarting the backend server.

1) backend/config/features.json
```
{
  "credentialSource": "env",              // env | cyberArkCcp (stubbed)
  "useMocks": true,                       // true = use backend/mocks/*, false = real integrations
  "useMockAuth": true,                    // true = mock email/pwd, false = (placeholder for real SSO)
  "systems": {
    "ping-directory": true,
    "ping-federate": true,
    "cyberark": true,
    "saviynt": true,
    "azure-ad": true,
    "ping-mfa": true
  },
  "systemsOrder": [
    "ping-directory",
    "cyberark",
    "ping-federate",
    "saviynt",
    "azure-ad",
    "ping-mfa"
  ]
}
```
- Flip behaviors:
  - Disable a system: set systems["<system>"] to false → UI shows "Feature not enabled" and APIs 404
  - Turn off mocks: set useMocks=false → backend will call real integrations where implemented
  - Switch auth mode: set useMockAuth=false → backend expects real SSO (placeholder), UI still posts to /auth/login
  - Credential source: set credentialSource=cyberArkCcp to fetch secrets from CCP (fallback to env if fails)
  - Card order: set `systemsOrder` as shown above to control dashboard tile order

2) backend/config/roles.json
- Define which roles can access own/all/search for each system. 403 when denied.
- Example shape:
```
{
  "employee": {
    "ping-directory": { "own": true, "all": false, "search": true },
    "ping-mfa": { "own": true, "all": false, "search": true }
    // other systems...
  },
  "ops": {
    "ping-directory": { "own": true, "all": true, "search": true },
    "ping-mfa": { "own": true, "all": true, "search": true }
    // other systems...
  }
}
```
- Add a role by key (e.g., "management") and define per-system permissions.
- Mock auth infers role from email prefix; unknown roles default to employee.

3) backend/.env
- Typical variables (names may vary by integration):
```
PORT=3001
JWT_SECRET=dev-secret
LOG_LEVEL=info
LOG_FILE=./logs/app.log

PING_DIR_URL=https://example/pd
PING_DIR_API_KEY=xxxx
# ... other system credentials
```
- Used when credentialSource=env or as fallback if CCP fails.

### Employee Search configuration (NEW)

These flags control exactly what an Employee can see in the Search UI, with different behavior for searching self vs. searching others. They are returned by `GET /config/features` and applied by the frontend.

Add the following optional keys to `backend/config/features.json`:

```
{
  // ... keep existing keys ...
  "employeeSearchSystems": {
    "ping-directory": true,   // show Ping Directory results when an employee searches other employees
    "ping-mfa": true,         // show Ping MFA results when an employee searches other employees
    "ping-federate": false,   // controls visibility in the "All Systems" dialog for employee→other searches
    "azure-ad": false,        // controls visibility in the "All Systems" dialog for employee→other searches
    "cyberark": false,        // controls visibility in the "All Systems" dialog for employee→other searches
    "saviynt": false          // controls visibility in the "All Systems" dialog for employee→other searches
  },
  "opsShowTilesAfterSearch": true // if true, Ops will only see the big system tiles AFTER they perform a search
}
```

What each flag does in the UI
- employeeSearchSystems
  - Applies ONLY when the logged-in role is "employee" AND they are searching for someone else (not themselves).
  - Self-search (employee searches their own email/ID): always shows all systems that are enabled globally, including in the "All Systems" dialog.
  - Searching others:
    - Ping Directory card: rendered only if `employeeSearchSystems["ping-directory"] !== false` (default true).
    - Ping MFA card: rendered only if `employeeSearchSystems["ping-mfa"] !== false` (default true).
    - "View all system details" dialogs: per-system panels are shown only if `employeeSearchSystems[system] !== false`. This is how you can also hide CyberArk/Azure AD/Saviynt/etc. from the aggregated details when an employee is viewing other employees.

- opsShowTilesAfterSearch
  - When `true`: On ops login, the large per-system tiles are hidden until a search has been performed. This keeps the ops dashboard focused on the Recent Failures panel and search-first workflows.
  - When `false` or omitted: Ops tiles behave like other roles (visible whenever the system is enabled).

## Ops Quick Actions (Tabs) — Config and Endpoints (NEW)

This feature is available ONLY for users with role = ops. The Quick Actions card appears below the Search card AFTER a successful employee search.

- Per-system tabs (6 total): Ping Directory, Ping Federate, CyberArk, Saviynt, Azure AD, Ping MFA
- Each tab exposes 3 quick-action buttons that call local mock API routes and show results in a dialog
- Designed to be drop-in replaceable with real APIs later (same response shape `{ data: ... }`)

### Enable/Disable tabs (two ways)

Precedence: Environment variables override backend features. If neither is provided for a tab, it defaults to ON.

1) Environment variables (frontend build-time)
- Set any of the following to true/false (case-insensitive: 1/0, true/false, on/off, yes/no, enabled/disabled):
```
NEXT_PUBLIC_QA_PING_DIRECTORY=true|false
NEXT_PUBLIC_QA_PING_FEDERATE=true|false
NEXT_PUBLIC_QA_CYBERARK=true|false
NEXT_PUBLIC_QA_SAVIYNT=true|false
NEXT_PUBLIC_QA_AZURE_AD=true|false
NEXT_PUBLIC_QA_PING_MFA=true|false
```
Steps:
- Update `.env.local` (or deployment env) with the desired flags
- Rebuild/redeploy the frontend for changes to take effect

2) Backend features (served by GET /config/features)
- Add the optional `quickActionsTabs` block to `backend/config/features.json`:
```
{
  // ... keep existing keys ...
  "quickActionsTabs": {
    "ping-directory": true,
    "ping-federate": true,
    "cyberark": true,
    "saviynt": true,
    "azure-ad": true,
    "ping-mfa": true
  }
}
```
Steps:
- Edit `backend/config/features.json`
- Restart the backend (`npm run dev:be` or your process manager)
- Reload the frontend page (ops must log in and perform a search)

Behavior notes:
- Tabs are rendered in the UI only if enabled by either method above
- The active tab auto-switches to the first enabled tab if the current one is disabled
- The Quick Actions card itself appears only for ops after a successful search

### Mock API endpoints per button

Ping Federate
- GET `/api/pf/userinfo` → User info JSON
- GET `/api/pf/oidc` → Array of OIDC connections
- GET `/api/pf/saml` → Array of SAML connections

Ping Directory
- GET `/api/pd/profile` → Basic profile JSON
- GET `/api/pd/groups` → Array of group memberships
- GET `/api/pd/audit` → Array of recent profile change events

Ping MFA
- GET `/api/mfa/status` → Current MFA status
- GET `/api/mfa/devices` → Array of enrolled devices
- GET `/api/mfa/events` → Array of recent MFA events

Azure AD
- GET `/api/aad/user` → AAD user profile
- GET `/api/aad/groups` → Array of AAD groups
- GET `/api/aad/signins` → Array of recent sign-ins

CyberArk
- GET `/api/cyberark/safes` → Array of safes
- GET `/api/cyberark/accounts` → Array of accounts with status
- GET `/api/cyberark/activity` → Array of recent activity

Saviynt
- GET `/api/saviynt/roles` → Array of roles
- GET `/api/saviynt/entitlements` → Array of entitlements
- GET `/api/saviynt/requests` → Array of recent access/role requests

All endpoints return `{ data: ... }` to keep the UI contract stable for future real integrations.

### What Ops will see
- A tab strip with enabled systems
- For the selected tab, three compact buttons inside a subtle gradient panel
- Clicking a button opens a dialog that renders a table (for arrays) or JSON (for objects) and includes a Copy JSON button

### Troubleshooting
- CORS/Network: Ensure backend is running on 3001; frontend calls the URL configured in `NEXT_PUBLIC_API_BASE`.
- 404 errors: Likely system disabled in features.json
- 403 errors: Role lacks permission in roles.json
- Token issues: Click "Sign out" (clears localStorage) and log back in
- Port conflicts: Change `PORT` in backend/.env and set `NEXT_PUBLIC_API_BASE` in `.env.local` accordingly
- Backend not starting: Verify `backend/server.js` exists and that you ran `npm install` at the repo root (or `cd backend && npm install`).
- Windows path error (ENOENT backend/backend/...): Fixed. The server now resolves paths relative to `backend/server.js`. Pull latest and use `npm run dev:all` (avoid manually changing working directories when starting the backend).


## Tech Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, Winston, jsonwebtoken, express-rate-limit, dotenv


## Roadmap (real integrations)
- Real SSO (when useMockAuth=false)
- Replace mocks with live system connectors (when useMocks=false)
- Additional filters and CSV export for Ops