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
- Server-side email endpoint (mock)
  - Replaced mailto with a server API to record email requests for audit/debug
  - Route: `POST /api/send-email`
  - Logs mock payloads to the server console and returns `{ ok: true }`
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

### Send Email (server-side mock)
- Each system tile includes a "Send Email" button.
- This posts to a Next.js API route instead of opening your inbox.
- Endpoint: `POST /api/send-email`
  - Request: `{ to: string, subject: string, body: string, system: string, payload: any }`
  - Response: `{ ok: true, message: "Email queued (mock)", to, system, timestamp }`
- Server will log a concise mock entry with recipient, subject, preview of body, a payload snippet, and timestamp.

## Employee "Educate me" guide

A lightweight user guide is available for employees to quickly learn which identity system to check based on common issue types (MFA, CyberArk Safe, Directory profile). The guide uses static mock data shared by all employees and opens in a professional popup dialog.

- Location: Header → "Educate me" (only visible for role = employee)
- Behavior: Opens a dialog with categorized cards (MFA, Safe/Vault, Directory)
  - Each card includes a short summary, a sample JSON snippet, and actions:
    - Copy sample JSON
    - Send mail to the appropriate support queue (uses existing /api/send-email)

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
- Send mail to support: posts to /api/send-email with the relevant support address and the sample payload

No per-user persistence or customization is stored; the guide is the same for all employees by design.

### Testing locally

- Start backend on :3001 and frontend on :3000
- Login with an employee account (any email not starting with ops@ or management@)
- Confirm the header shows the "Educate me" button; click to open the guide
- Click "Copy sample JSON" and verify your clipboard contents
- Click "Send mail to support" to exercise /api/send-email

### Notes

- The dialog uses Tailwind-based components (Shadcn UI) and respects light/dark/navy themes
- The guide does not depend on live system data and is safe in mock/real modes
- To hide for non-employee roles, no additional config is needed (it is already limited to role = employee)

## Configuration

### Support email mapping
- Edit `src/lib/support-emails.ts` to change the destination team addresses per system.
- Helper: `getSupportEmail(system: "ping-directory" | "ping-federate" | "cyberark" | "saviynt" | "azure-ad" | "ping-mfa")`

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

- File: `src/app/api/send-email/route.ts`
  - Mock server endpoint that logs email requests and returns success

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
- Mock mode is ON by default: backend/config/features.json → `{"useMocks": true, "useMockAuth": true}`
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
- If a button shows an error, verify the corresponding route file exists under `src/app/api/...` and that your frontend has been rebuilt after any env changes
- If the card doesn't appear, make sure:
  - You are logged in as ops (e.g., ops@company.com)
  - You performed a successful search first
  - At least one tab is enabled (via env or features.json)

## Ops Quick Actions Tools Buttons (NEW)

These two additional buttons appear in the Quick Actions card (ops-only, after search) for quick navigation to monitoring tools. They open the URLs in a new browser tab.

### Buttons
- "Take Me to Splunk": Opens Splunk dashboard.
- "Take Me to Cloud Watch": Opens AWS Cloud Watch console (us-east-1 default region).

### Configuration (Environment Variables)

URLs are configurable via frontend environment variables (build-time). If not set, defaults apply:

- `NEXT_PUBLIC_SPLUNK_URL`: Splunk app URL (default: "https://splunk.company.com")
- `NEXT_PUBLIC_CLOUDWATCH_URL`: Cloud Watch URL (default: "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1")

Steps to update:
1. Add/update in `.env.local` (or deployment env):
   ```
   NEXT_PUBLIC_SPLUNK_URL=https://your-splunk-instance.com/app/search
   NEXT_PUBLIC_CLOUDWATCH_URL=https://console.aws.amazon.com/cloudwatch/home?region=us-west-2
   ```
2. Rebuild/redeploy the frontend (`npm run build && npm run start` or your CI/CD).
3. Log in as ops, perform a search → Quick Actions card shows the buttons with updated URLs.

Notes:
- Buttons use `window.open(..., "_blank", "noopener,noreferrer")` for security (no referrer, new tab).
- Visibility: Ops-only, appears after search (same as tabs).
- No backend involvement; purely frontend navigation.

## API Overview
- POST /auth/login → { token, role, email }
- GET /config/features → feature flags object
- GET /api/own-:system → initial data for current user
- GET /api/own-:system/details → extended data for current user
- GET /api/all-users?limit=50&offset=0 → ops-only list
- GET /api/search-employee/:query → limited PD + MFA results
- GET /api/pf/userinfo → mocked Ping Federate UserInfo for current employee (frontend-only mock)
- GET /api/pf/oidc → mocked list of OIDC connections (5 key fields per connection)
- GET /api/pf/saml → mocked list of SAML connections (5 key fields per connection)

Responses
- 200: `{ data: any }` for system endpoints; or domain objects for search/all-users
- 403: RBAC denial (see roles.json)
- 404: Feature/system disabled (see features.json)


## Scripts
- npm run dev → Frontend only (Next.js)
- npm run dev:be → Installs backend deps and starts Express
- npm run dev:all → Runs frontend + backend together (recommended for local dev)


## Troubleshooting
- CORS/Network: Ensure backend is running on 3001; frontend calls http://localhost:3001 directly
- 404 errors: Likely system disabled in features.json
- 403 errors: Role lacks permission in roles.json
- Token issues: Click "Sign out" (clears localStorage) and log back in
- Port conflicts: Change PORT in backend/.env and update API_BASE in src/app/page.tsx if needed
- Backend not starting: Verify `backend/server.js` exists and that you ran `npm install` at the repo root (or `cd backend && npm install`).
- Windows path error (ENOENT backend/backend/...): Fixed. The server now resolves paths relative to `backend/server.js`. Pull latest and use `npm run dev:all` (avoid manually changing working directories when starting the backend).


## Tech Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, Winston, jsonwebtoken, express-rate-limit, dotenv


## Roadmap (real integrations)
- Real SSO (when useMockAuth=false)
- Replace mocks with live system connectors (when useMocks=false)
- Additional filters and CSV export for Ops