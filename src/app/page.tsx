"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sun, Moon, User, Copy } from "lucide-react";
import { getSupportEmail } from "@/lib/support-emails";
import { toast } from "sonner";

const API_BASE = "http://localhost:3001"; // dev: backend server

type Features = {
  credentialSource: string;
  useMocks: boolean;
  useMockAuth: boolean;
  systems: Record<string, boolean>;
  // Optional config additions
  opsShowTilesAfterSearch?: boolean;
  employeeSearchSystems?: Partial<Record<SystemKey, boolean>>;
  systemsOrder?: SystemKey[]; // NEW: optional preferred order for system cards
  // Employee educate guide (optional, can be toggled at deploy time)
  employeeEducateGuideEnabled?: boolean;
  // Ops Quick Actions tabs enable/disable per system (deployment-time configurable)
  quickActionsTabs?: Partial<Record<SystemKey, boolean>>;
};

type LoginResponse = { token: string; role: string; email: string };

type SystemKey =
  | "ping-directory"
  | "ping-federate"
  | "cyberark"
  | "saviynt"
  | "azure-ad"
  | "ping-mfa";

const SYSTEMS: SystemKey[] = [
  "ping-directory",
  "ping-federate",
  "cyberark",
  "saviynt",
  "azure-ad",
  "ping-mfa",
];

// Human-readable labels for systems
const SYSTEM_LABELS: Record<SystemKey, string> = {
  "ping-directory": "Ping Directory",
  "ping-federate": "Ping Federate",
  "cyberark": "CyberArk",
  "saviynt": "Saviynt",
  "azure-ad": "Azure AD",
  "ping-mfa": "Ping MFA",
};

function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("role");
    const e = localStorage.getItem("email");
    if (t && r && e) {
      setToken(t);
      setRole(r);
      setEmail(e);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data: LoginResponse = await res.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("email", data.email);
    setToken(data.token);
    setRole(data.role);
    setEmail(data.email);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setToken(null);
    setRole(null);
    setEmail(null);
  };

  return { token, role, email, login, logout };
}

function SystemCard({
  name,
  system,
  enabled,
  token,
  role,
}: {
  name: string;
  system: SystemKey;
  enabled: boolean;
  token: string;
  role: string;
}) {
  const [data, setData] = useState<any | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [htmlOpen, setHtmlOpen] = useState(false);
  // PF employee popup state
  const [pfOpen, setPfOpen] = useState(false);
  const [pfTitle, setPfTitle] = useState<string>("");
  const [pfLoading, setPfLoading] = useState(false);
  const [pfData, setPfData] = useState<any>(null);

  const loadInitial = async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/own-${system}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = "Failed";
        try {
          const j = await res.json();
          message = j?.error || message;
        } catch {
          try {
            const t = await res.text();
            message = t || message;
          } catch {}
        }
        throw new Error(message);
      }
      const json = await res.json();
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/own-${system}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = "Failed";
        try {
          const j = await res.json();
          message = j?.error || message;
        } catch {
          try {
            const t = await res.text();
            message = t || message;
          } catch {}
        }
        throw new Error(message);
      }
      const json = await res.json();
      setDetails(json.data);
      setDetailsOpen(true);
    } catch (e: any) {
      setError(e.message || "Error loading details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, enabled]);

  // helper to flatten JSON into key/value pairs for readable HTML view
  const toPairs = (obj: any): Array<{ k: string; v: any }> => {
    const out: Array<{ k: string; v: any }> = [];
    const walk = (val: any, prefix = "") => {
      if (val === null || val === undefined) {
        out.push({ k: prefix || "value", v: String(val) });
        return;
      }
      if (Array.isArray(val)) {
        if (val.length === 0) {
          out.push({ k: prefix, v: "[]" });
        } else {
          val.forEach((item, idx) => walk(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`));
        }
        return;
      }
      if (typeof val === "object") {
        const keys = Object.keys(val);
        if (keys.length === 0) {
          out.push({ k: prefix, v: "{}" });
        } else {
          keys.forEach((key) => walk(val[key], prefix ? `${prefix}.${key}` : key));
        }
        return;
      }
      out.push({ k: prefix || "value", v: val });
    };
    walk(obj);
    return out;
  };

  const openHtmlView = async () => {
    // ensure we have something to show; try initial if nothing loaded yet
    if (!details && !data && enabled && !loading) {
      try {
        await loadInitial();
      } catch {}
    }
    setHtmlOpen(true);
  };

  const sendEmail = async () => {
    const to = getSupportEmail(system);
    const subject = `[${name}] Help request`;
    const payload = details || data || {};
    const body = `Hello ${name} Support,\n\nPlease assist with an issue on ${name}.\n\nContext (JSON excerpt):\n\n${JSON.stringify(payload, null, 2).slice(0, 1500)}\n\nThank you.`;
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, system, payload }),
      });
      if (res.ok) {
        toast.success("Email sent successfully");
      } else {
        toast.error("Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    }
  };

  // Add a negative scenario trigger for CyberArk to simulate a failed send
  const sendEmailFailTest = async () => {
    const to = "invalid"; // intentionally invalid to force backend validation failure
    const subject = `[${name}] Help request (Fail Test)`;
    const payload = details || data || {};
    const body = `This is a negative test for ${name} email sending.`;
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Force-Fail": "1" }, // header hint if backend supports it
        body: JSON.stringify({ to, subject, body, system, payload, forceFail: true }),
      });
      if (res.ok) {
        // If backend didn't fail, still inform the user this was a fail test
        toast.warning("Email unexpectedly succeeded (fail test)");
      } else {
        toast.error("Failed to send email (expected for test)");
      }
    } catch {
      toast.error("Failed to send email (expected for test)");
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="text-base md:text-lg font-semibold whitespace-normal break-words">{name}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={loadInitial} disabled={!enabled || loading}>
                Refresh
              </Button>
              <Button size="sm" onClick={loadDetails} disabled={!enabled || loading}>
                View Details
              </Button>
              <Button size="sm" variant="outline" onClick={openHtmlView} disabled={!enabled || loading}>
                HTML View
              </Button>
              <Button size="sm" variant="outline" onClick={sendEmail} disabled={!enabled}>
                Send Email
              </Button>
              {system === "cyberark" && (
                <Button size="sm" variant="destructive" onClick={sendEmailFailTest} disabled={!enabled}>
                  Send Email (Fail test)
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-2">
            {data && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
              >
                Copy JSON
              </Button>
            )}
            {system === "ping-federate" && role === "employee" && (
              <div className="ml-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    setPfTitle("Ping Federate — User Info");
                    setPfOpen(true);
                    setPfLoading(true);
                    try {
                      const res = await fetch("/api/pf/userinfo");
                      const j = await res.json().catch(() => ({}));
                      setPfData(j?.data ?? j);
                    } catch {
                      setPfData({ error: "Failed to load User Info" });
                    } finally {
                      setPfLoading(false);
                    }
                  }}
                >
                  User Info
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    setPfTitle("Ping Federate — OIDC Connections");
                    setPfOpen(true);
                    setPfLoading(true);
                    try {
                      const res = await fetch("/api/pf/oidc");
                      const j = await res.json().catch(() => ({}));
                      setPfData(j?.data ?? j);
                    } catch {
                      setPfData({ error: "Failed to load OIDC connections" });
                    } finally {
                      setPfLoading(false);
                    }
                  }}
                >
                  OIDC
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    setPfTitle("Ping Federate — SAML Connections");
                    setPfOpen(true);
                    setPfLoading(true);
                    try {
                      const res = await fetch("/api/pf/saml");
                      const j = await res.json().catch(() => ({}));
                      setPfData(j?.data ?? j);
                    } catch {
                      setPfData({ error: "Failed to load SAML connections" });
                    } finally {
                      setPfLoading(false);
                    }
                  }}
                >
                  SAML
                </Button>
              </div>
            )}
          </div>
          {!enabled ? (
            <p className="text-sm text-muted-foreground">Feature not enabled</p>
          ) : loading ? (
            <p className="text-sm animate-pulse">Loading...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="space-y-3">
              {data ? (
                <div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
              {/* details moved to dialog to keep the page compact */}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between w-full pr-12">
              <span>{name} — Details</span>
              {details && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(details, null, 2))}
                >
                  Copy JSON
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="text-sm animate-pulse">Loading details...</p>
          ) : details ? (
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-[70vh] overflow-y-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No details available</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={htmlOpen} onOpenChange={setHtmlOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-12">{name} — HTML View</DialogTitle>
          </DialogHeader>
          {(() => {
            const payload = details || data;
            if (!payload) return <p className="text-sm text-muted-foreground">No data available to display</p>;
            const pairs = toPairs(payload).slice(0, 1000); // safety cap
            return (
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {pairs.map(({ k, v }) => (
                    <div key={k} className="flex flex-col py-1 border-b last:border-b-0 border-border/60">
                      <dt className="text-xs font-medium text-muted-foreground truncate">{k}</dt>
                      <dd className="text-sm break-words">
                        {typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                          ? String(v)
                          : JSON.stringify(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* PF Employee Dialog */}
      <Dialog open={pfOpen} onOpenChange={setPfOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between w-full pr-12">
              <span>{pfTitle || "Ping Federate"}</span>
              {pfData && (
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(pfData, null, 2))}>
                  Copy JSON
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {pfLoading ? (
            <p className="text-sm animate-pulse">Loading...</p>
          ) : Array.isArray(pfData) ? (
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(pfData[0] || {}).map((k) => (
                      <TableHead key={k} className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfData.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      {Object.keys(pfData[0] || {}).map((k) => (
                        <TableCell key={k} className="text-sm break-words">{String(row[k])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : pfData ? (
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-[70vh] overflow-y-auto">{JSON.stringify(pfData, null, 2)}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoginCard({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@company.com" />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground">Mock auth: role inferred by email prefix (ops@, management@, else employee).</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HomePage() {
  const { token, role, email, login, logout } = useAuth();
  const [features, setFeatures] = useState<Features | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  // removed All Users feature and related state
  const [hasSearched, setHasSearched] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "navy">();
  const [minutes, setMinutes] = useState<number>(10);
  const [failFed, setFailFed] = useState<any[] | null>(null);
  const [failMfa, setFailMfa] = useState<any[] | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);
  // search result detail dialog
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchDialogTitle, setSearchDialogTitle] = useState<string>("");
  const [searchDialogData, setSearchDialogData] = useState<any | null>(null);
  const [searchDialogLoading, setSearchDialogLoading] = useState(false);
  const [searchDialogMode, setSearchDialogMode] = useState<"json" | "html">("json");
  
  // SNOW incidents state
  const [snowOpen, setSnowOpen] = useState(false);
  const [snowLoading, setSnowLoading] = useState(false);
  const [snowError, setSnowError] = useState<string | null>(null);
  const [snowCount, setSnowCount] = useState<number | null>(null);
  const [snowItems, setSnowItems] = useState<any[] | null>(null);
  const [snowEmail, setSnowEmail] = useState<string | null>(null);

  // Educate guide state
  const [educateOpen, setEducateOpen] = useState(false);

  // Ops PF quick actions dialog state
  const [pfOpsOpen, setPfOpsOpen] = useState(false);
  const [pfOpsTitle, setPfOpsTitle] = useState<string>("");
  const [pfOpsLoading, setPfOpsLoading] = useState(false);
  const [pfOpsData, setPfOpsData] = useState<any>(null);
  // Ops Quick Actions active tab
  const [qaActive, setQaActive] = useState<SystemKey>("ping-federate");

  // helper for HTML view in search dialog (global)
  const toPairsGlobal = (obj: any): Array<{ k: string; v: any }> => {
    const out: Array<{ k: string; v: any }> = [];
    const walk = (val: any, prefix = "") => {
      if (val === null || val === undefined) {
        out.push({ k: prefix || "value", v: String(val) });
        return;
      }
      if (Array.isArray(val)) {
        if (val.length === 0) {
          out.push({ k: prefix, v: "[]" });
        } else {
          val.forEach((item, idx) => walk(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`));
        }
        return;
      }
      if (typeof val === "object") {
        const keys = Object.keys(val);
        if (keys.length === 0) {
          out.push({ k: prefix, v: "{}" });
        } else {
          keys.forEach((key) => walk(val[key], prefix ? `${prefix}.${key}` : key));
        }
        return;
      }
      out.push({ k: prefix || "value", v: val });
    };
    walk(obj);
    return out;
  };

  // Static, shared mock guide (same for all employees)
  const EDUCATE_GUIDE = useMemo(() => (
    [
      {
        id: "mfa",
        title: "MFA related issues",
        system: "ping-mfa" as SystemKey,
        summary: "Check Ping MFA JSON logs for enrollment, device, and last event details.",
        sample: {
          userId: "u12345",
          status: "Enabled",
          enrolledDevices: ["iPhone 14"],
          lastEvent: "Push timeout",
          lastEventAt: new Date().toISOString(),
        },
        actions: { viewJson: true, sendMail: true },
      },
      {
        id: "safe",
        title: "Safe / Vault access issues",
        system: "cyberark" as SystemKey,
        summary: "Review CyberArk JSON to understand Safe membership and credential status.",
        sample: {
          safe: "CORP-APP-PROD",
          account: "svc_corp_app",
          access: "requested",
          reason: "Pending approval",
          lastChecked: new Date().toISOString(),
        },
        actions: { viewJson: true, sendMail: true },
      },
      {
        id: "directory",
        title: "Profile / directory attribute issues",
        system: "ping-directory" as SystemKey,
        summary: "Verify core attributes in Ping Directory (email, department, status).",
        sample: {
          name: "Employee Name",
          email: String(email || localStorage.getItem("email") || "").toLowerCase(),
          department: "Engineering",
          status: "active",
        },
        actions: { viewJson: true, sendMail: false },
      },
    ]
  ), [email]);

  // Deployment-time toggle: env overrides features when provided
  const educateEnabled = useMemo(() => {
    const envVal = (process.env.NEXT_PUBLIC_EDUCATE_GUIDE || "").toString().trim().toLowerCase();
    if (envVal) return ["1", "true", "on", "yes", "enabled"].includes(envVal);
    return features?.employeeEducateGuideEnabled ?? true; // default ON if not specified
  }, [features]);

  useEffect(() => {
    // init theme from localStorage; default to light regardless of system
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "navy") {
      setTheme(stored);
    } else {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    // reset theme classes first
    root.classList.remove("dark");
    root.classList.remove("navy");
    if (theme === "dark") root.classList.add("dark");
    if (theme === "navy") root.classList.add("navy");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/config/features`);
        if (res.ok) {
          const f = await res.json();
          setFeatures(f);
        } else {
          setFeatures({
            credentialSource: "env",
            useMocks: true,
            useMockAuth: true,
            systems: SYSTEMS.reduce((acc, s) => ({ ...acc, [s]: true }), {} as Record<string, boolean>),
          });
        }
      } catch {
        setFeatures({
          credentialSource: "env",
          useMocks: true,
          useMockAuth: true,
          systems: SYSTEMS.reduce((acc, s) => ({ ...acc, [s]: true }), {} as Record<string, boolean>),
        });
      }
    };
    run();
  }, [token]);

  const enabled = useMemo(() => {
    const all = features?.systems || {};
    return SYSTEMS.reduce((acc, s) => ({ ...acc, [s]: !!all[s] }), {} as Record<SystemKey, boolean>);
  }, [features]);

  // Quick Actions tab enablement (from backend features or NEXT_PUBLIC env flags)
  const qaEnabledTabs = useMemo(() => {
    const fromFeatures = features?.quickActionsTabs || {};
    const envBool = (key: string) => {
      const v = (process.env[key] || "").toString().toLowerCase();
      return ["1", "true", "on", "yes", "enabled"].includes(v);
    };
    const map: Partial<Record<SystemKey, boolean>> = { ...fromFeatures };
    for (const sys of SYSTEMS) {
      const envKey = `NEXT_PUBLIC_QA_${sys.replace(/-/g, "_").toUpperCase()}`;
      if (process.env.hasOwnProperty(envKey)) {
        map[sys] = envBool(envKey);
      }
      // default to true when unspecified
      if (typeof map[sys] === "undefined") map[sys] = true;
    }
    return map as Record<SystemKey, boolean>;
  }, [features]);

  const splunkUrl = process.env.NEXT_PUBLIC_SPLUNK_URL || "https://splunk.company.com";
  const cloudwatchUrl = process.env.NEXT_PUBLIC_CLOUDWATCH_URL || "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1";

  // Keep active tab valid when toggles change
  useEffect(() => {
    if (!qaEnabledTabs[qaActive]) {
      const first = SYSTEMS.find((s) => qaEnabledTabs[s]);
      if (first) setQaActive(first);
    }
  }, [qaEnabledTabs, qaActive]);

  const anyEnabled = useMemo(() => Object.values(enabled || {}).some(Boolean), [enabled]);

  // Determine the order of system cards based on features.systemsOrder (if provided)
  const orderedSystems = useMemo<SystemKey[]>(() => {
    const order = features?.systemsOrder || [];
    const valid = order.filter((s): s is SystemKey => (SYSTEMS as string[]).includes(s as string));
    const remaining = SYSTEMS.filter((s) => !valid.includes(s));
    return [...valid, ...remaining];
  }, [features]);

  const loadRecentFailures = async () => {
    if (!token || role !== "ops") return;
    setOpsLoading(true);
    setOpsError(null);
    try {
      const [fedRes, mfaRes] = await Promise.all([
        fetch(`${API_BASE}/api/ops-failures?system=ping-federate&minutes=${minutes}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/ops-failures?system=ping-mfa&minutes=${minutes}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const fedJson = await fedRes.json().catch(() => ({ data: [] }));
      const mfaJson = await mfaRes.json().catch(() => ({ data: [] }));
      let fed = Array.isArray(fedJson?.data) ? fedJson.data : [];
      let mfa = Array.isArray(mfaJson?.data) ? mfaJson.data : [];
      // Provide test data if backend has none
      if ((!fed || fed.length === 0) && (!mfa || mfa.length === 0)) {
        const now = Date.now();
        const mkTs = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
        fed = [
          { userId: "u12345", reason: "Invalid credentials", timestamp: mkTs(2) },
          { email: "jane.doe@company.com", reason: "Account locked", timestamp: mkTs(5) },
          { userId: "u67890", reason: "MFA required not satisfied", timestamp: mkTs(9) },
        ];
        mfa = [
          { userId: "u12345", error: "Push timeout", timestamp: mkTs(3) },
          { email: "john.smith@company.com", error: "Device not enrolled", timestamp: mkTs(7) },
        ];
      }
      setFailFed(fed);
      setFailMfa(mfa);
      if (!fedRes.ok || !mfaRes.ok) {
        setOpsError("Failure feeds not available (mock backend may not implement /api/ops-failures)");
      }
    } catch (e: any) {
      setOpsError(e?.message || "Failed to load failures");
      setFailFed([]);
      setFailMfa([]);
    } finally {
      setOpsLoading(false);
    }
  };

  const doSearch = async () => {
    if (!token || !search.trim()) return;
    setSearchError(null);
    setSearchResults(null);
    // ensure UI treats this as not completed until success
    setHasSearched(false);
    try {
      const res = await fetch(`${API_BASE}/api/search-employee/${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Search failed");
      setSearchResults(body);
      // mark completion only after successful fetch
      setHasSearched(true);
    } catch (e: any) {
      setSearchError(e.message || "Search failed");
    }
  };

  // Helper: decide which email to use for SNOW incidents based on role/search
  const resolveSnowEmail = (): string | null => {
    const self = String(email || (typeof window !== 'undefined' ? localStorage.getItem("email") : '') || '').toLowerCase();
    if (role === 'ops') {
      // Only after a search should ops see/incidents for a user
      if (!hasSearched) return null;
      const q = String(search || '').trim().toLowerCase();
      // If the query itself looks like an email, prefer it
      if (q && q.includes('@') && q.includes('.')) return q;
      // Otherwise try first Ping Directory result's email
      const pd = Array.isArray((searchResults as any)?.["ping-directory"]) ? (searchResults as any)["ping-directory"] : [];
      const exact = pd.find((u: any) => String(u?.email || '').toLowerCase() === q || String(u?.userId || '') === String(search || '').trim());
      if (exact?.email) return String(exact.email).toLowerCase();
      if (pd[0]?.email) return String(pd[0].email).toLowerCase();
      return null;
    }
    return self || null;
  };

  // Open SNOW dialog and fetch incidents
  const openSnowDialog = async () => {
    if (!token) return;
    const target = resolveSnowEmail();
    // Only block when ops has no valid searched target; employees can proceed (backend uses self email)
    if (role === 'ops' && !target) {
      toast.error('No target user found for SNOW incidents');
      return;
    }
    setSnowOpen(true);
    setSnowLoading(true);
    setSnowError(null);
    setSnowItems(null);
    // For employees, prefer server-returned email; prefill with best-known fallback
    const selfFallback = (typeof window !== 'undefined' ? localStorage.getItem('email') : '') || email || '';
    setSnowEmail(role === 'ops' ? target : (target || String(selfFallback).toLowerCase()))
    try {
      const base = `${API_BASE}/api/snow/incidents`;
      const url = role === 'ops' ? `${base}?email=${encodeURIComponent(String(target))}` : base;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load incidents');
      // Ensure dialog shows the actual email resolved by the server
      if (json?.email) {
        setSnowEmail(String(json.email));
      }
      const items = Array.isArray(json?.items) ? json.items : [];
      // Fallback demo incidents on empty payloads (helps employee role in mock mode)
      const mkDemo = () => {
        const now = Date.now();
        const iso = (ms: number) => new Date(ms).toISOString();
        const assigned = String(json?.email || target || selfFallback).toLowerCase();
        return [
          { number: `INC-DEMO-${Math.floor(Math.random()*1_000_000).toString().padStart(6,'0')}`, short_description: 'Demo: Access issue with corporate app', state: 'open', priority: '3 - Moderate', updatedAt: iso(now), assigned_to: assigned },
          { number: `INC-DEMO-${Math.floor(Math.random()*1_000_000).toString().padStart(6,'0')}`, short_description: 'Demo: MFA verification pending', state: 'in_progress', priority: '2 - High', updatedAt: iso(now - 60*60*1000), assigned_to: assigned },
          { number: `INC-DEMO-${Math.floor(Math.random()*1_000_000).toString().padStart(6,'0')}`, short_description: 'Demo: Password reset completed', state: 'closed', priority: '4 - Low', updatedAt: iso(now - 24*60*60*1000), assigned_to: assigned },
        ];
      };
      const finalItems = items.length > 0 ? items : mkDemo();
      setSnowItems(finalItems);
      const computedCount = finalItems.reduce((acc: number, it: any) => {
        const st = String(it.state || '').toLowerCase();
        if (st === 'open' || st.includes('progress')) return acc + 1;
        return acc;
      }, 0);
      setSnowCount(
        typeof json?.open === 'number' && typeof json?.in_progress === 'number'
          ? Number(json.open) + Number(json.in_progress)
          : computedCount
      );
    } catch (e: any) {
      setSnowError(e.message || 'Failed to load incidents');
      setSnowItems([]);
      setSnowCount(0);
    } finally {
      setSnowLoading(false);
    }
  };

  // Reset SNOW context on ops search changes to avoid stale counts/targets
  useEffect(() => {
    if (role === 'ops') {
      setSnowCount(null);
      setSnowEmail(null);
      setSnowItems(null);
    }
  }, [role, hasSearched, search]);

  // removed loadAllUsers (feature deprecated)

  useEffect(() => {
    if (token && role === "ops") {
      // do not auto-load all users; show recent failures panel instead
      loadRecentFailures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  if (!token) {
    return <LoginCard onLogin={login} />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=64&q=60&auto=format&fit=crop" alt="Logo" className="w-8 h-8 rounded" />
            <div>
              <div className="font-semibold">Identity Portal</div>
              {/* Signed-in badge */}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                  <User className="h-3 w-3" /> {email}
                </span>
                <span
                  className={
                    `inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border ` +
                    (role === "ops"
                      ? "border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-900/20"
                      : role === "employee"
                      ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20"
                      : "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/20")
                  }
                >
                  {role}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(prev => prev === "light" ? "dark" : prev === "dark" ? "navy" : "light")}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {/* Educate Me (employees only) */}
            {role === "employee" && educateEnabled && (
              <Button variant="outline" onClick={() => setEducateOpen(true)}>
                Educate me
              </Button>
            )}
            {/* Show SNOW tickets button with dynamic count (ops: visible only after search) */}
            {(
              role !== 'ops' || (hasSearched && !!resolveSnowEmail())
            ) && (
              <Button variant="outline" onClick={openSnowDialog} title={role === 'ops' ? (resolveSnowEmail() || undefined) : undefined}>
                <span className="mr-2">Show SNOW tickets</span>
                {typeof snowCount === 'number' && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                    {snowCount}
                  </span>
                )}
              </Button>
            )}
            <Button variant="secondary" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Educate Guide Dialog */}
        <Dialog open={educateOpen} onOpenChange={setEducateOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Issue Guide — Where to look</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {EDUCATE_GUIDE.map((g) => (
                <Card key={g.id} className="border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span>{g.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-muted whitespace-nowrap">{SYSTEM_LABELS[g.system]}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{g.summary}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {g.actions.viewJson && (
                        <Button
                          size="sm"
                          className="w-full justify-center gap-2"
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(g.sample, null, 2));
                            toast.success("Sample JSON copied");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy sample
                        </Button>
                      )}
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-foreground/80 hover:text-foreground select-none">Show sample JSON</summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto overflow-y-auto max-h-40 font-mono whitespace-pre-wrap break-words max-w-full">{JSON.stringify(g.sample, null, 2)}</pre>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Search Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Employee Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Search by name, email, or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search employees"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doSearch();
                  }}
                />
                <Button onClick={doSearch}>Search</Button>
              </div>
              {!hasSearched && !searchError && (
                <p className="text-xs text-muted-foreground mt-2">Enter a query and click Search to see results.</p>
              )}
              {searchError && <p className="text-sm text-red-600 mt-2">{searchError}</p>}
              {hasSearched && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Ping Directory card (respect employee search config when not self) */}
                  {(() => {
                    const isEmployee = role === "employee";
                    const isSelf = String(search).trim().toLowerCase() === String(email || "").toLowerCase();
                    const allowPD = features?.employeeSearchSystems?.["ping-directory"] ?? true;
                    if (isEmployee && !isSelf && !allowPD) return null;
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Ping Directory</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const list = Array.isArray(searchResults?.["ping-directory"]) ? searchResults["ping-directory"] : [];
                            const filtered = role === "ops" && search.trim()
                              ? list.filter((u: any) =>
                                  u.userId === search.trim() || u.email?.toLowerCase() === search.trim().toLowerCase()
                                )
                              : list;
                            const final = role === "ops" ? filtered.slice(0, 1) : filtered;
                            return final.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead className="w-40">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {final.map((u: any) => (
                                    <TableRow key={`pd-${u.userId}`}>
                                      <TableCell>{u.name}</TableCell>
                                      <TableCell>{u.email}</TableCell>
                                      <TableCell>{u.userId}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={async () => {
                                              const key = u.userId || u.email;
                                              setSearchDialogTitle(`Ping Directory — ${key || "Details"}`);
                                              setSearchDialogData(null);
                                              setSearchDialogLoading(true);
                                              setSearchDialogOpen(true);
                                              try {
                                                const url = `${API_BASE}/api/search-employee/${encodeURIComponent(String(key))}/details?system=ping-directory`;
                                                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                                                if (res.ok) {
                                                  const json = await res.json();
                                                  setSearchDialogData(json.data ?? u);
                                                } else {
                                                  setSearchDialogData(u);
                                                }
                                              } catch {
                                                setSearchDialogData(u);
                                              } finally {
                                                setSearchDialogLoading(false);
                                              }
                                            }}
                                          >
                                            View Details
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">No results</p>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Ping MFA card (respect employee search config when not self) */}
                  {(() => {
                    const isEmployee = role === "employee";
                    const isSelf = String(search).trim().toLowerCase() === String(email || "").toLowerCase();
                    const allowMFA = features?.employeeSearchSystems?.["ping-mfa"] ?? true;
                    if (isEmployee && !isSelf && !allowMFA) return null;
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Ping MFA</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const list = Array.isArray(searchResults?.["ping-mfa"]) ? searchResults["ping-mfa"] : [];
                            const filtered = role === "ops" && search.trim()
                              ? list.filter((u: any) => u.userId === search.trim())
                              : list;
                            const final = role === "ops" ? filtered.slice(0, 1) : filtered;
                            return final.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Event</TableHead>
                                    <TableHead className="w-40">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {final.map((u: any) => (
                                    <TableRow key={`mfa-${u.userId}`}>
                                      <TableCell>{u.userId}</TableCell>
                                      <TableCell>{u.status}</TableCell>
                                      <TableCell>{u.lastEvent}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={async () => {
                                              const key = u.userId || u.email;
                                              setSearchDialogTitle(`Ping MFA — ${u.userId}`);
                                              setSearchDialogData(null);
                                              setSearchDialogLoading(true);
                                              setSearchDialogOpen(true);
                                              try {
                                                const url = `${API_BASE}/api/search-employee/${encodeURIComponent(String(key))}/details?system=ping-mfa`;
                                                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                                                if (res.ok) {
                                                  const json = await res.json();
                                                  setSearchDialogData(json.data ?? u);
                                                } else {
                                                  setSearchDialogData(u);
                                                }
                                              } catch {
                                                setSearchDialogData(u);
                                              } finally {
                                                setSearchDialogLoading(false);
                                              }
                                            }}
                                          >
                                            View Details
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">No results</p>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Global View All Systems buttons */}
                  <div className="md:col-span-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        className="w-full sm:w-auto"
                        variant="secondary"
                        onClick={async () => {
                          // Determine the best key candidates from search results
                          const pd = Array.isArray(searchResults?.["ping-directory"]) ? searchResults["ping-directory"] : [];
                          const mfa = Array.isArray(searchResults?.["ping-mfa"]) ? searchResults["ping-mfa"] : [];
                          const q = String(search).trim().toLowerCase();
                          const exactPd = pd.find((u: any) => u?.email?.toLowerCase?.() === q || u?.userId === search.trim());
                          const exactMfa = mfa.find((u: any) => u?.userId === search.trim());
                          const firstPd = pd?.[0];
                          const firstMfa = mfa?.[0];
                          // Build candidate identifiers to try per-system (email + userId variants)
                          const baseCandidates = (
                            [
                              exactPd?.email,
                              exactPd?.userId,
                              exactMfa?.userId,
                              firstPd?.email,
                              firstPd?.userId,
                              firstMfa?.userId,
                              firstMfa?.email,
                              search,
                            ] as Array<string | undefined | null>
                          ).filter(Boolean).map((s) => String(s));
                          const candidateKeys = Array.from(new Set([
                            ...baseCandidates,
                            ...baseCandidates.map((k) => k.toLowerCase()),
                            ...baseCandidates.map((k) => k.toUpperCase()),
                          ]));
                          const displayKey = candidateKeys[0] || "";

                          setSearchDialogMode("json");
                          setSearchDialogTitle(`${role === "ops" ? "All Systems JSON" : "All Systems"} — ${displayKey || "Details"}`);
                          setSearchDialogData(null);
                          setSearchDialogLoading(true);
                          setSearchDialogOpen(true);
                          try {
                            const aggregate: Record<string, any> = {};
                            // fetch all-users once as a fallback source for per-system data
                            let allUsers: any[] | null = null;
                            try {
                              const auRes = await fetch(`${API_BASE}/api/all-users`, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (auRes.ok) {
                                const auJson = await auRes.json();
                                allUsers = Array.isArray(auJson?.data) ? auJson.data : Array.isArray(auJson) ? auJson : null;
                              }
                            } catch {}

                            const isEmployee = role === "employee";
                            const isSelf = String(search).trim().toLowerCase() === String(email || "").toLowerCase();
                            const allowMap = features?.employeeSearchSystems || {};

                            for (const sys of SYSTEMS) {
                              // Employee searching others: respect config by skipping disallowed systems
                              if (isEmployee && !isSelf && allowMap && allowMap[sys] === false) {
                                aggregate[sys] = null;
                                continue;
                              }
                              let found: any = undefined;
                              // Try details endpoint with multiple possible identifiers
                              for (const key of candidateKeys) {
                                try {
                                  const url = `${API_BASE}/api/search-employee/${encodeURIComponent(String(key))}/details?system=${sys}`;
                                  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                                  if (res.ok) {
                                    const json = await res.json();
                                    if (json?.data) { found = json.data; break; }
                                  }
                                } catch {}
                              }
                              // Fallback to in-memory search results if details not found
                              if (!found) {
                                const arr = Array.isArray((searchResults as any)?.[sys]) ? (searchResults as any)[sys] : [];
                                const matched = arr.filter((it: any) =>
                                  candidateKeys.some((k) => it.userId === k || it.email?.toLowerCase?.() === String(k).toLowerCase())
                                );
                                if (matched.length > 0) found = matched.length === 1 ? matched[0] : matched;
                              }
                              // Fallback to all-users systems map
                              if (!found && allUsers) {
                                const matchedUser = allUsers.find((u: any) =>
                                  candidateKeys.some(
                                    (k) => u?.userId === k || u?.email?.toLowerCase?.() === String(k).toLowerCase()
                                  )
                                );
                                if (matchedUser && matchedUser.systems && sys in matchedUser.systems) {
                                  found = matchedUser.systems[sys];
                                }
                              }
                              aggregate[sys] = found ?? null;
                            }
                            setSearchDialogData(aggregate);
                          } catch {
                            setSearchDialogData({ error: "Unable to load aggregated details" });
                          } finally {
                            setSearchDialogLoading(false);
                          }
                        }}
                      >
                        {role === "ops" ? "View all system details JSON" : "View All System Details"}
                      </Button>
                      {role === "ops" && (
                        <Button
                          className="w-full sm:w-auto"
                          variant="outline"
                          onClick={async () => {
                            // trigger same aggregation then render as HTML
                            setSearchDialogMode("html");
                            const pd = Array.isArray(searchResults?.["ping-directory"]) ? searchResults["ping-directory"] : [];
                            const mfa = Array.isArray(searchResults?.["ping-mfa"]) ? searchResults["ping-mfa"] : [];
                            const q = String(search).trim().toLowerCase();
                            const exactPd = pd.find((u: any) => u?.email?.toLowerCase?.() === q || u?.userId === search.trim());
                            const exactMfa = mfa.find((u: any) => u?.userId === search.trim());
                            const firstPd = pd?.[0];
                            const firstMfa = mfa?.[0];
                            const baseCandidates = (
                              [
                                exactPd?.email,
                                exactPd?.userId,
                                exactMfa?.userId,
                                firstPd?.email,
                                firstPd?.userId,
                                firstMfa?.userId,
                                firstMfa?.email,
                                search,
                              ] as Array<string | undefined | null>
                            ).filter(Boolean).map((s) => String(s));
                            const candidateKeys = Array.from(new Set([
                              ...baseCandidates,
                              ...baseCandidates.map((k) => k.toLowerCase()),
                              ...baseCandidates.map((k) => k.toUpperCase()),
                            ]));
                            const displayKey = candidateKeys[0] || "";

                            setSearchDialogTitle(`All Systems HTML — ${displayKey || "Details"}`);
                            setSearchDialogData(null);
                            setSearchDialogLoading(true);
                            setSearchDialogOpen(true);

                            try {
                              const aggregate: Record<string, any> = {};
                              let allUsers: any[] | null = null;
                              try {
                                const auRes = await fetch(`${API_BASE}/api/all-users`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (auRes.ok) {
                                  const auJson = await auRes.json();
                                  allUsers = Array.isArray(auJson?.data) ? auJson.data : Array.isArray(auJson) ? auJson : null;
                                }
                              } catch {}

                              for (const sys of SYSTEMS) {
                                let found: any = undefined;
                                for (const key of candidateKeys) {
                                  try {
                                    const url = `${API_BASE}/api/search-employee/${encodeURIComponent(String(key))}/details?system=${sys}`;
                                    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                                    if (res.ok) {
                                      const json = await res.json();
                                      if (json?.data) { found = json.data; break; }
                                    }
                                  } catch {}
                                }
                                if (!found) {
                                  const arr = Array.isArray((searchResults as any)?.[sys]) ? (searchResults as any)[sys] : [];
                                  const matched = arr.filter((it: any) =>
                                    candidateKeys.some((k) => it.userId === k || it.email?.toLowerCase?.() === String(k).toLowerCase())
                                  );
                                  if (matched.length > 0) found = matched.length === 1 ? matched[0] : matched;
                                }
                                if (!found && allUsers) {
                                  const matchedUser = allUsers.find((u: any) =>
                                    candidateKeys.some(
                                      (k) => u?.userId === k || u?.email?.toLowerCase?.() === String(k).toLowerCase()
                                    )
                                  );
                                  if (matchedUser && matchedUser.systems && sys in matchedUser.systems) {
                                    found = matchedUser.systems[sys];
                                  }
                                }
                                aggregate[sys] = found ?? null;
                              }
                              setSearchDialogData(aggregate);
                            } catch {
                              setSearchDialogData({ error: "Unable to load aggregated details" });
                            } finally {
                              setSearchDialogLoading(false);
                            }
                          }}
                        >
                          View all system details HTML
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Search result details dialog */}
          <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between w-full pr-12">
                  <span>{searchDialogTitle || "Details"}</span>
                  <div className="flex items-center gap-2">
                    {(searchDialogData && !(searchDialogTitle || "").startsWith("All Systems")) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSearchDialogMode((m) => (m === "json" ? "html" : "json"))}
                      >
                        {searchDialogMode === "json" ? "HTML View" : "JSON View"}
                      </Button>
                    )}
                    {searchDialogData && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(searchDialogData, null, 2))}
                      >
                        Copy JSON
                      </Button>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>
              {searchDialogLoading ? (
                <p className="text-sm animate-pulse">Loading details...</p>
              ) : searchDialogData ? (
                typeof searchDialogData === "object" && (searchDialogTitle || "").startsWith("All Systems") ? (
                  searchDialogMode === "html" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
                      {SYSTEMS.map((sys) => {
                        const val = (searchDialogData as any)?.[sys] ?? null;
                        const pairs = val ? toPairsGlobal(val).slice(0, 1000) : [];
                        return (
                          <div key={sys} className="rounded border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium">
                                {sys.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </div>
                              <span
                                className={
                                  `text-[10px] px-2 py-0.5 rounded border ${enabled[sys] ?
                                    'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20' :
                                    'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20'}`
                                }
                              >
                                {enabled[sys] ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            {val ? (
                              <div className="space-y-2">
                                <div className="flex justify-end">
                                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(val, null, 2))}>Copy JSON</Button>
                                </div>
                                <div className="max-h-64 overflow-y-auto pr-1">
                                  <dl className="grid grid-cols-1 gap-y-2">
                                    {pairs.map(({ k, v }) => (
                                      <div key={k} className="flex flex-col py-1 border-b last:border-b-0 border-border/60">
                                        <dt className="text-xs font-medium text-muted-foreground truncate">{k}</dt>
                                        <dd className="text-sm break-words">{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No details available</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
                      {SYSTEMS.map((sys) => {
                        const val = (searchDialogData as any)?.[sys] ?? null;
                        return (
                          <div key={sys} className="rounded border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium">
                                {sys.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={
                                    `text-[10px] px-2 py-0.5 rounded border ${enabled[sys] ?
                                      'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20' :
                                      'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20'}`
                                  }
                                >
                                  {enabled[sys] ? 'Enabled' : 'Disabled'}
                                </span>
                                {val && (
                                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(val, null, 2))}>Copy JSON</Button>
                                )}
                              </div>
                            </div>
                            {val ? (
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(val, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-xs text-muted-foreground">No details available</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  searchDialogMode === "html" ? (
                    (() => {
                      const pairs = toPairsGlobal(searchDialogData).slice(0, 1000);
                      return (
                        <div className="max-h-[70vh] overflow-y-auto pr-1">
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {pairs.map(({ k, v }) => (
                              <div key={k} className="flex flex-col py-1 border-b last:border-b-0 border-border/60">
                                <dt className="text-xs font-medium text-muted-foreground truncate">{k}</dt>
                                <dd className="text-sm break-words">{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-[70vh] overflow-y-auto">{JSON.stringify(searchDialogData, null, 2)}</pre>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground">No details available</p>
              )}
            </DialogContent>
          </Dialog>
        </section>

        {/* Ops Quick Actions (tabs) - independent card below Search, visible after successful search */}
        {role === "ops" && hasSearched && (
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-6 space-y-0">
                <CardTitle>Quick Actions</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(splunkUrl, "_blank", "noopener,noreferrer")}
                  >
                    Take Me to Splunk
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(cloudwatchUrl, "_blank", "noopener,noreferrer")}
                  >
                    Take Me to Cloud Watch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-wrap gap-1">
                    {SYSTEMS.filter((s) => qaEnabledTabs[s]).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={qaActive === s ? "secondary" : "outline"}
                        onClick={() => setQaActive(s)}
                      >
                        {SYSTEM_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                    Target: {resolveSnowEmail() || search || "(unknown)"}
                  </span>
                </div>

                {/* Buttons per active tab (3 each) */}
                <div className="rounded-lg border bg-gradient-to-r from-muted/60 to-background p-3 sm:p-4">
                  {qaActive === "ping-federate" && qaEnabledTabs["ping-federate"] && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping Federate — User Info"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/pf/userinfo"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j); } catch { setPfOpsData({ error: "Failed to load User Info" }); } finally { setPfOpsLoading(false); }
                      }}>User Info</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping Federate — OIDC Connections"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/pf/oidc"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j); } catch { setPfOpsData({ error: "Failed to load OIDC connections" }); } finally { setPfOpsLoading(false); }
                      }}>OIDC</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping Federate — SAML Connections"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/pf/saml"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j); } catch { setPfOpsData({ error: "Failed to load SAML connections" }); } finally { setPfOpsLoading(false); }
                      }}>SAML</Button>
                    </div>
                  )}

                  {qaActive === "ping-directory" && qaEnabledTabs["ping-directory"] && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping Directory — Profile"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/pd/profile"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load profile" }); } finally { setPfOpsLoading(false);} 
                      }}>Profile</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping Directory — Groups"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/pd/groups"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load groups" }); } finally { setPfOpsLoading(false);} 
                      }}>Groups</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping Directory — Audit"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/pd/audit"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load audit" }); } finally { setPfOpsLoading(false);} 
                      }}>Audit</Button>
                    </div>
                  )}

                  {qaActive === "ping-mfa" && qaEnabledTabs["ping-mfa"] && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping MFA — Status"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/mfa/status"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load status" }); } finally { setPfOpsLoading(false);} 
                      }}>Status</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping MFA — Devices"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/mfa/devices"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load devices" }); } finally { setPfOpsLoading(false);} 
                      }}>Devices</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Ping MFA — Events"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/mfa/events"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load events" }); } finally { setPfOpsLoading(false);} 
                      }}>Events</Button>
                    </div>
                  )}

                  {qaActive === "azure-ad" && qaEnabledTabs["azure-ad"] && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Azure AD — User"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/aad/user"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load user" }); } finally { setPfOpsLoading(false);} 
                      }}>User</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Azure AD — Groups"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/aad/groups"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load groups" }); } finally { setPfOpsLoading(false);} 
                      }}>Groups</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Azure AD — Sign-ins"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/aad/signins"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load sign-ins" }); } finally { setPfOpsLoading(false);} 
                      }}>Sign-ins</Button>
                    </div>
                  )}

                  {qaActive === "cyberark" && qaEnabledTabs["cyberark"] && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("CyberArk — Safes"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/cyberark/safes"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load safes" }); } finally { setPfOpsLoading(false);} 
                      }}>Safes</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("CyberArk — Accounts"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/cyberark/accounts"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load accounts" }); } finally { setPfOpsLoading(false);} 
                      }}>Accounts</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("CyberArk — Activity"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/cyberark/activity"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load activity" }); } finally { setPfOpsLoading(false);} 
                      }}>Activity</Button>
                    </div>
                  )}

                  {qaActive === "saviynt" && qaEnabledTabs["saviynt"] && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Saviynt — Roles"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/saviynt/roles"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load roles" }); } finally { setPfOpsLoading(false);} 
                      }}>Roles</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Saviynt — Entitlements"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/saviynt/entitlements"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load entitlements" }); } finally { setPfOpsLoading(false);} 
                      }}>Entitlements</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setPfOpsTitle("Saviynt — Requests"); setPfOpsOpen(true); setPfOpsLoading(true);
                        try { const r = await fetch("/api/saviynt/requests"); const j = await r.json().catch(() => ({})); setPfOpsData(j?.data ?? j);} catch { setPfOpsData({ error: "Failed to load requests" }); } finally { setPfOpsLoading(false);} 
                      }}>Requests</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* SNOW incidents dialog */}
        <Dialog open={snowOpen} onOpenChange={setSnowOpen}>
          <DialogContent className="max-w-3xl space-y-4">
            <DialogHeader>
              <DialogTitle className="pr-12">
                ServiceNow Incidents{snowEmail ? ` — ${snowEmail}` : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                {typeof snowCount === 'number' && (
                  <span className="inline-flex items-center rounded border px-2 py-0.5">Open/In-Progress: {snowCount}</span>
                )}
                {(snowItems?.length || 0) > 0 && (
                  <span className="inline-flex items-center rounded border px-2 py-0.5">Total: {snowItems!.length}</span>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={openSnowDialog} disabled={snowLoading}>Refresh</Button>
            </div>
            {snowLoading ? (
              <p className="text-sm animate-pulse">Loading incidents...</p>
            ) : snowError ? (
              <p className="text-sm text-red-600">{snowError}</p>
            ) : (snowItems?.length || 0) > 0 ? (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snowItems!.map((it: any) => (
                      <TableRow key={it.number}>
                        <TableCell className="font-mono text-xs">{it.number}</TableCell>
                        <TableCell className="text-sm whitespace-normal break-words">{it.short_description}</TableCell>
                        <TableCell>
                          <span className={
                            `text-[11px] px-2 py-0.5 rounded border ` +
                            (String(it.state).toLowerCase() === 'open'
                              ? 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20'
                              : String(it.state).toLowerCase().includes('progress')
                              ? 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20'
                              : 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20')
                          }>
                            {it.state}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{it.priority}</TableCell>
                        <TableCell className="text-xs break-words">{it.updatedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No incidents found</p>
            )}
          </DialogContent>
        </Dialog>

        {/* OPS: Ping Federate quick actions dialog */}
        <Dialog open={pfOpsOpen} onOpenChange={setPfOpsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between w-full pr-12">
                <span>{pfOpsTitle || 'Ping Federate'}</span>
                {pfOpsData && (
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(pfOpsData, null, 2))}>
                    Copy JSON
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {pfOpsLoading ? (
              <p className="text-sm animate-pulse">Loading...</p>
            ) : Array.isArray(pfOpsData) ? (
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(pfOpsData[0] || {}).map((k) => (
                        <TableHead key={k} className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pfOpsData.map((row: any, idx: number) => (
                      <TableRow key={idx}>
                        {Object.keys(pfOpsData[0] || {}).map((k) => (
                          <TableCell key={k} className="text-sm break-words">{String(row[k])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : pfOpsData ? (
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-[70vh] overflow-y-auto">{JSON.stringify(pfOpsData, null, 2)}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Ops Recent Failures Panel */}
        {role === "ops" && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Recent Failures (last {minutes} min)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Window (minutes)</label>
                    <Input
                      type="number"
                      min={1}
                      className="w-28"
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <Button size="sm" onClick={loadRecentFailures} disabled={opsLoading}>Refresh</Button>
                  {opsError && <span className="text-xs text-red-600">{opsError}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ping Federate – Login Failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {opsLoading ? (
                        <p className="text-sm animate-pulse">Loading...</p>
                      ) : (failFed?.length || 0) > 0 ? (
                        <ul className="text-sm list-disc pl-4 space-y-1">
                          {failFed!.slice(0, 25).map((it: any, idx: number) => (
                            <li key={`fed-${idx}`}>
                              {it.userId || it.email || "unknown"} — {it.reason || it.error || "failure"} — {it.time || it.timestamp || ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No failures in window</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ping MFA – Verification Failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {opsLoading ? (
                        <p className="text-sm animate-pulse">Loading...</p>
                      ) : (failMfa?.length || 0) > 0 ? (
                        <ul className="text-sm list-disc pl-4 space-y-1">
                          {failMfa!.slice(0, 25).map((it: any, idx: number) => (
                            <li key={`mfa-${idx}`}>
                              {it.userId || it.email || "unknown"} — {it.reason || it.error || "failure"} — {it.time || it.timestamp || ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No failures in window</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* System Cards (hide by default for ops) */}
        <section>
          {(() => {
            const showOpsTiles = role === "ops" && !!features?.opsShowTilesAfterSearch && hasSearched;
            const isOps = role === "ops";
            if (!anyEnabled) {
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>No systems enabled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Feature not enabled. Please contact your administrator or update features.json.
                    </p>
                  </CardContent>
                </Card>
              );
            }
            if (isOps && !showOpsTiles) {
              return <></>;
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orderedSystems.map((sys) => (
                  <SystemCard
                    key={sys}
                    name={SYSTEM_LABELS[sys]}
                    system={sys}
                    enabled={!!enabled[sys]}
                    token={token!}
                    role={role!}
                  />
                ))}
              </div>
            );
          })()}
        </section>

        {/* All Users feature removed as requested */}
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        Read-only demo • Mocks enabled • Local dev
      </footer>
    </div>
  );
}