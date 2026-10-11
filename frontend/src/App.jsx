import React, { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------
   Community Complaint & Issue Tracking System
   Flow: Report -> Categorise -> Assign -> Track -> Resolve -> Verify
   Priority scoring: category weight + severity + number of reporters
                     + safety hazard + age of the ticket  (0-100)
------------------------------------------------------------------- */

const CATEGORIES = {
  lights: { label: "Broken Lights", icon: "💡", weight: 5, team: "Electrical Team" },
  water: { label: "Water Leakage", icon: "💧", weight: 8, team: "Plumbing Team" },
  roads: { label: "Damaged Roads", icon: "🛣️", weight: 6, team: "Civil Works" },
  garbage: { label: "Garbage Overflow", icon: "🗑️", weight: 7, team: "Housekeeping" },
  washroom: { label: "Washroom Problems", icon: "🚻", weight: 7, team: "Housekeeping" },
  electrical: { label: "Electrical Problems", icon: "⚡", weight: 9, team: "Electrical Team" },
  internet: { label: "Internet Issues", icon: "📶", weight: 5, team: "IT Support" },
  infra: { label: "Infrastructure Damage", icon: "🏗️", weight: 4, team: "Civil Works" },
};

const TEAMS = ["Electrical Team", "Plumbing Team", "Civil Works", "Housekeeping", "IT Support"];

const STATUSES = [
  { key: "reported", label: "Reported" },
  { key: "categorised", label: "Categorised" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "verified", label: "Verified" },
];

const SEVERITY = ["", "Minor", "Moderate", "Significant", "Serious", "Severe"];

const DAY = 86400000;

/* ---------------- Priority scoring ---------------- */
function scoreIssue(issue, now = Date.now()) {
  const cat = CATEGORIES[issue.category]?.weight ?? 4;
  const categoryPts = cat * 4; // up to 36
  const severityPts = issue.severity * 6; // up to 30
  const crowdPts = Math.min(20, Math.log2(issue.reporters.length + 1) * 5); // up to 20
  const safetyPts = issue.safety ? 10 : 0;
  const agePts = Math.min(10, ((now - issue.createdAt) / DAY) * 1.5); // up to 10
  const total = Math.min(
    100,
    Math.round(categoryPts + severityPts + crowdPts + safetyPts + agePts)
  );
  return {
    total,
    parts: [
      ["Category weight", Math.round(categoryPts)],
      ["Severity", Math.round(severityPts)],
      [`Reporters (${issue.reporters.length})`, Math.round(crowdPts)],
      ["Safety hazard", safetyPts],
      ["Time open", Math.round(agePts)],
    ],
  };
}

function levelOf(score) {
  if (score >= 75) return { key: "critical", label: "Critical" };
  if (score >= 55) return { key: "high", label: "High" };
  if (score >= 35) return { key: "medium", label: "Medium" };
  return { key: "low", label: "Low" };
}

/* ---------------- Seed data ---------------- */
function seed() {
  const now = Date.now();
  const names = (n, p) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`);
  const ev = (status, by, note, ago) => ({ status, by, note, at: now - ago });
  return [
    {
      id: 1001,
      title: "Main water pipe burst near Block B hostel",
      description: "Water is gushing out of the pipe behind Block B. Corridor is flooded and the floor is slippery.",
      category: "water",
      location: "Hostel Block B, ground floor",
      severity: 4,
      safety: true,
      status: "assigned",
      assignee: "Plumbing Team",
      reporters: names(20, "Student "),
      createdAt: now - 1.2 * DAY,
      history: [
        ev("reported", "Student 1", "Issue reported", 1.2 * DAY),
        ev("categorised", "Admin", "Confirmed as Water Leakage", 1.1 * DAY),
        ev("assigned", "Admin", "Assigned to Plumbing Team", 1.0 * DAY),
      ],
    },
    {
      id: 1002,
      title: "Exposed wiring in the library reading hall",
      description: "Sparks seen from a switchboard near the window desks.",
      category: "electrical",
      location: "Library, 1st floor",
      severity: 5,
      safety: true,
      status: "in_progress",
      assignee: "Electrical Team",
      reporters: names(6, "Reader "),
      createdAt: now - 0.5 * DAY,
      history: [
        ev("reported", "Reader 1", "Issue reported", 0.5 * DAY),
        ev("categorised", "Admin", "Confirmed as Electrical Problems", 0.45 * DAY),
        ev("assigned", "Admin", "Assigned to Electrical Team", 0.4 * DAY),
        ev("in_progress", "Electrical Team", "Technician on site", 0.1 * DAY),
      ],
    },
    {
      id: 1003,
      title: "Wi-Fi down in the CS department",
      description: "No connectivity since morning, labs are affected.",
      category: "internet",
      location: "CS Department, Lab 2",
      severity: 3,
      safety: false,
      status: "reported",
      assignee: null,
      reporters: names(12, "CS Student "),
      createdAt: now - 0.3 * DAY,
      history: [ev("reported", "CS Student 1", "Issue reported", 0.3 * DAY)],
    },
    {
      id: 1004,
      title: "Garbage bins overflowing at the canteen",
      description: "Bins not cleared for two days, smell and flies.",
      category: "garbage",
      location: "Canteen back entrance",
      severity: 3,
      safety: false,
      status: "categorised",
      assignee: null,
      reporters: names(5, "Diner "),
      createdAt: now - 2 * DAY,
      history: [
        ev("reported", "Diner 1", "Issue reported", 2 * DAY),
        ev("categorised", "Admin", "Confirmed as Garbage Overflow", 1.8 * DAY),
      ],
    },
    {
      id: 1005,
      title: "Streetlight not working on the hostel road",
      description: "Entire stretch is dark after 7 PM.",
      category: "lights",
      location: "Hostel road, near gate 2",
      severity: 3,
      safety: true,
      status: "resolved",
      assignee: "Electrical Team",
      reporters: names(4, "Resident "),
      createdAt: now - 4 * DAY,
      history: [
        ev("reported", "Resident 1", "Issue reported", 4 * DAY),
        ev("categorised", "Admin", "Confirmed as Broken Lights", 3.9 * DAY),
        ev("assigned", "Admin", "Assigned to Electrical Team", 3.8 * DAY),
        ev("in_progress", "Electrical Team", "Replacing lamp", 3 * DAY),
        ev("resolved", "Electrical Team", "Lamp and fuse replaced", 0.5 * DAY),
      ],
    },
    {
      id: 1006,
      title: "Damaged chair in Classroom 204",
      description: "One chair has a broken backrest.",
      category: "infra",
      location: "Academic Block, Room 204",
      severity: 1,
      safety: false,
      status: "reported",
      assignee: null,
      reporters: ["Student A"],
      createdAt: now - 0.2 * DAY,
      history: [ev("reported", "Student A", "Issue reported", 0.2 * DAY)],
    },
    {
      id: 1007,
      title: "Washroom taps leaking on 2nd floor",
      description: "Two taps running continuously, water wastage.",
      category: "washroom",
      location: "Academic Block, 2nd floor",
      severity: 2,
      safety: false,
      status: "verified",
      assignee: "Plumbing Team",
      reporters: names(3, "Student "),
      createdAt: now - 6 * DAY,
      history: [
        ev("reported", "Student 1", "Issue reported", 6 * DAY),
        ev("categorised", "Admin", "Confirmed as Washroom Problems", 5.9 * DAY),
        ev("assigned", "Admin", "Assigned to Plumbing Team", 5.8 * DAY),
        ev("in_progress", "Plumbing Team", "Washers being replaced", 5 * DAY),
        ev("resolved", "Plumbing Team", "Taps fixed", 4 * DAY),
        ev("verified", "Student 1", "Confirmed fixed", 3.5 * DAY),
      ],
    },
  ];
}

const STORAGE_KEY = "community-issue-tracker-v1";

function loadIssues() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return seed();
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ---------------- Main component ---------------- */
export default function App() {
  const [issues, setIssues] = useState(loadIssues);
  const [role, setRole] = useState("resident"); // resident | admin
  const [me, setMe] = useState("You");
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: "open", category: "all", q: "" });
  const [sortBy, setSortBy] = useState("priority");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch (e) {}
  }, [issues]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const scored = useMemo(
    () => issues.map((i) => ({ ...i, score: scoreIssue(i) })),
    [issues]
  );

  const visible = useMemo(() => {
    let list = scored.filter((i) => {
      if (filters.status === "open" && ["verified"].includes(i.status)) return false;
      if (
        filters.status !== "open" &&
        filters.status !== "all" &&
        i.status !== filters.status
      )
        return false;
      if (filters.category !== "all" && i.category !== filters.category) return false;
      const q = filters.q.trim().toLowerCase();
      if (q && !(i.title + i.location + i.description).toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) =>
      sortBy === "priority" ? b.score.total - a.score.total : b.createdAt - a.createdAt
    );
    return list;
  }, [scored, filters, sortBy]);

  const stats = useMemo(() => {
    const open = scored.filter((i) => i.status !== "verified");
    return {
      open: open.length,
      critical: open.filter((i) => levelOf(i.score.total).key === "critical").length,
      pending: scored.filter((i) => i.status === "resolved").length,
      verified: scored.filter((i) => i.status === "verified").length,
    };
  }, [scored]);

  const selected = scored.find((i) => i.id === selectedId) || null;

  /* ---- mutations ---- */
  const update = (id, fn) =>
    setIssues((prev) => prev.map((i) => (i.id === id ? fn(i) : i)));

  const pushEvent = (issue, status, by, note) => ({
    ...issue,
    status,
    history: [...issue.history, { status, by, note, at: Date.now() }],
  });

  const addIssue = (data) => {
    const id = Date.now();
    const issue = {
      id,
      ...data,
      status: "reported",
      assignee: null,
      reporters: [me],
      createdAt: Date.now(),
      history: [{ status: "reported", by: me, note: "Issue reported", at: Date.now() }],
    };
    setIssues((p) => [issue, ...p]);
    setShowForm(false);
    setSelectedId(id);
    setToast("Issue reported. It will be reviewed shortly.");
  };

  const meToo = (id) => {
    update(id, (i) =>
      i.reporters.includes(me) ? i : { ...i, reporters: [...i.reporters, me] }
    );
    setToast("Added your report. Priority updated.");
  };

  const categorise = (id, category) => {
    update(id, (i) => ({
      ...pushEvent(i, "categorised", "Admin", `Confirmed as ${CATEGORIES[category].label}`),
      category,
    }));
  };

  const assign = (id, team) => {
    update(id, (i) => ({
      ...pushEvent(i, "assigned", "Admin", `Assigned to ${team}`),
      assignee: team,
    }));
    setToast(`Assigned to ${team}`);
  };

  const startWork = (id) =>
    update(id, (i) => pushEvent(i, "in_progress", i.assignee || "Team", "Work started"));

  const resolve = (id, note) =>
    update(id, (i) =>
      pushEvent(i, "resolved", i.assignee || "Team", note || "Marked as resolved")
    );

  const verify = (id) => {
    update(id, (i) => pushEvent(i, "verified", me, "Confirmed fixed"));
    setToast("Thanks for verifying!");
  };

  const reopen = (id) => {
    update(id, (i) => ({
      ...pushEvent(i, "assigned", me, "Reopened: problem still persists"),
      severity: Math.min(5, i.severity + 1),
    }));
    setToast("Issue reopened with higher severity.");
  };

  return (
    <div className="app">
      <style>{css}</style>

      <header className="top">
        <div className="brand">
          <div className="logo">🏫</div>
          <div>
            <h1>CampusCare</h1>
            <p>Community issue tracker with smart priority scoring</p>
          </div>
        </div>
        <div className="controls">
          <input
            className="name-input"
            value={me}
            onChange={(e) => setMe(e.target.value || "You")}
            aria-label="Your name"
            title="Your name"
          />
          <div className="seg">
            <button
              className={role === "resident" ? "on" : ""}
              onClick={() => setRole("resident")}
            >
              Resident
            </button>
            <button className={role === "admin" ? "on" : ""} onClick={() => setRole("admin")}>
              Admin
            </button>
          </div>
          <button className="btn primary" onClick={() => setShowForm(true)}>
            + Report issue
          </button>
        </div>
      </header>

      <section className="stats">
        <Stat label="Open issues" value={stats.open} tone="blue" />
        <Stat label="Critical" value={stats.critical} tone="red" />
        <Stat label="Awaiting verification" value={stats.pending} tone="amber" />
        <Stat label="Verified fixed" value={stats.verified} tone="green" />
      </section>

      <section className="pipeline">
        {STATUSES.map((s, idx) => {
          const n = scored.filter((i) => i.status === s.key).length;
          return (
            <button
              key={s.key}
              className={"pipe " + (filters.status === s.key ? "on" : "")}
              onClick={() =>
                setFilters((f) => ({ ...f, status: f.status === s.key ? "open" : s.key }))
              }
            >
              <span className="pipe-n">{n}</span>
              <span className="pipe-l">{s.label}</span>
              {idx < STATUSES.length - 1 && <span className="pipe-arrow">›</span>}
            </button>
          );
        })}
      </section>

      <div className="layout">
        <main className="list-col">
          <div className="toolbar">
            <input
              className="search"
              placeholder="Search issues or locations…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="open">Open (not verified)</option>
              <option value="all">All</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="priority">Sort: Priority</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>

          {visible.length === 0 && (
            <div className="empty">No issues match these filters. 🎉</div>
          )}

          {visible.map((i) => (
            <IssueCard
              key={i.id}
              issue={i}
              active={i.id === selectedId}
              onClick={() => setSelectedId(i.id)}
            />
          ))}
        </main>

        <aside className="detail-col">
          {selected ? (
            <Detail
              issue={selected}
              role={role}
              me={me}
              onMeToo={() => meToo(selected.id)}
              onCategorise={(c) => categorise(selected.id, c)}
              onAssign={(t) => assign(selected.id, t)}
              onStart={() => startWork(selected.id)}
              onResolve={(n) => resolve(selected.id, n)}
              onVerify={() => verify(selected.id)}
              onReopen={() => reopen(selected.id)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="placeholder">
              <div style={{ fontSize: 42 }}>🧭</div>
              <h3>Select an issue</h3>
              <p>
                See its priority breakdown, timeline, and take action. Issues reported by more
                people, with higher severity or safety risk, rise to the top automatically.
              </p>
              <div className="legend">
                <b>Priority levels</b>
                <span className="chip critical">Critical 75+</span>
                <span className="chip high">High 55+</span>
                <span className="chip medium">Medium 35+</span>
                <span className="chip low">Low</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showForm && (
        <ReportForm
          issues={scored}
          onClose={() => setShowForm(false)}
          onSubmit={addIssue}
          onMeToo={(id) => {
            meToo(id);
            setShowForm(false);
            setSelectedId(id);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------------- Sub components ---------------- */
function Stat({ label, value, tone }) {
  return (
    <div className={"stat " + tone}>
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
    </div>
  );
}

function ScoreRing({ score, size = 54 }) {
  const lvl = levelOf(score);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={"ring " + lvl.key} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fg"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}

function IssueCard({ issue, active, onClick }) {
  const cat = CATEGORIES[issue.category];
  const lvl = levelOf(issue.score.total);
  const statusLabel = STATUSES.find((s) => s.key === issue.status)?.label;
  return (
    <div className={"card " + lvl.key + (active ? " active" : "")} onClick={onClick}>
      <ScoreRing score={issue.score.total} />
      <div className="card-body">
        <div className="card-top">
          <span className={"chip " + lvl.key}>{lvl.label}</span>
          <span className={"status s-" + issue.status}>{statusLabel}</span>
          {issue.safety && <span className="chip safety">⚠ Safety</span>}
        </div>
        <h3>{issue.title}</h3>
        <div className="meta">
          <span>
            {cat.icon} {cat.label}
          </span>
          <span>📍 {issue.location}</span>
          <span>👥 {issue.reporters.length} reported</span>
          <span>🕒 {timeAgo(issue.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function Detail({
  issue,
  role,
  me,
  onMeToo,
  onCategorise,
  onAssign,
  onStart,
  onResolve,
  onVerify,
  onReopen,
  onClose,
}) {
  const cat = CATEGORIES[issue.category];
  const lvl = levelOf(issue.score.total);
  const stepIdx = STATUSES.findIndex((s) => s.key === issue.status);
  const [team, setTeam] = useState(cat.team);
  const [catChoice, setCatChoice] = useState(issue.category);
  const [note, setNote] = useState("");
  const isReporter = issue.reporters.includes(me);

  useEffect(() => {
    setTeam(CATEGORIES[issue.category].team);
    setCatChoice(issue.category);
    setNote("");
  }, [issue.id, issue.category]);

  return (
    <div className="detail">
      <button className="close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div className="detail-head">
        <ScoreRing score={issue.score.total} size={72} />
        <div>
          <span className={"chip " + lvl.key}>{lvl.label} priority</span>
          <h2>{issue.title}</h2>
          <div className="meta">
            <span>
              {cat.icon} {cat.label}
            </span>
            <span>📍 {issue.location}</span>
          </div>
        </div>
      </div>

      <p className="desc">{issue.description}</p>

      <div className="stepper">
        {STATUSES.map((s, idx) => (
          <div
            key={s.key}
            className={"step " + (idx < stepIdx ? "done" : idx === stepIdx ? "now" : "")}
          >
            <div className="dot">{idx < stepIdx ? "✓" : idx + 1}</div>
            <div className="step-l">{s.label}</div>
          </div>
        ))}
      </div>

      <h4>Why this priority?</h4>
      <div className="breakdown">
        {issue.score.parts.map(([label, pts]) => (
          <div key={label} className="bar-row">
            <span className="bar-l">{label}</span>
            <div className="bar">
              <div
                className={"bar-fill " + lvl.key}
                style={{ width: `${Math.min(100, (pts / 36) * 100)}%` }}
              />
            </div>
            <span className="bar-v">+{pts}</span>
          </div>
        ))}
        <div className="bar-total">
          Total score <b>{issue.score.total}</b> / 100 · Severity: {SEVERITY[issue.severity]}
          {issue.assignee && <> · Assigned to <b>{issue.assignee}</b></>}
        </div>
      </div>

      <h4>Actions</h4>
      <div className="actions">
        {issue.status !== "verified" && !isReporter && (
          <button className="btn" onClick={onMeToo}>
            🙋 I'm affected too (+1)
          </button>
        )}

        {role === "admin" && issue.status === "reported" && (
          <div className="action-box">
            <label>Confirm category</label>
            <div className="row">
              <select value={catChoice} onChange={(e) => setCatChoice(e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={() => onCategorise(catChoice)}>
                Categorise
              </button>
            </div>
          </div>
        )}

        {role === "admin" && issue.status === "categorised" && (
          <div className="action-box">
            <label>Assign to team</label>
            <div className="row">
              <select value={team} onChange={(e) => setTeam(e.target.value)}>
                {TEAMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button className="btn primary" onClick={() => onAssign(team)}>
                Assign
              </button>
            </div>
          </div>
        )}

        {role === "admin" && issue.status === "assigned" && (
          <button className="btn primary" onClick={onStart}>
            ▶ Start work
          </button>
        )}

        {role === "admin" && issue.status === "in_progress" && (
          <div className="action-box">
            <label>Resolution note</label>
            <div className="row">
              <input
                placeholder="What was done?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="btn primary" onClick={() => onResolve(note)}>
                Mark resolved
              </button>
            </div>
          </div>
        )}

        {issue.status === "resolved" && (
          <div className="action-box">
            <label>Was it really fixed? Reporters verify the fix.</label>
            <div className="row">
              <button className="btn success" onClick={onVerify}>
                ✔ Verify fixed
              </button>
              <button className="btn danger" onClick={onReopen}>
                ↺ Still broken
              </button>
            </div>
          </div>
        )}

        {issue.status === "verified" && (
          <div className="verified">✅ Verified as fixed by the community</div>
        )}

        {role === "resident" &&
          ["reported", "categorised", "assigned", "in_progress"].includes(issue.status) && (
            <p className="hint">
              Switch to <b>Admin</b> (top right) to categorise, assign and update this issue.
            </p>
          )}
      </div>

      <h4>Timeline</h4>
      <ul className="timeline">
        {[...issue.history].reverse().map((h, idx) => (
          <li key={idx}>
            <span className={"tl-dot s-" + h.status} />
            <div>
              <b>{STATUSES.find((s) => s.key === h.status)?.label}</b>
              <span className="tl-time"> · {timeAgo(h.at)}</span>
              <div className="tl-note">
                {h.note} <em>({h.by})</em>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportForm({ issues, onClose, onSubmit, onMeToo }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "water",
    location: "",
    severity: 3,
    safety: false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const similar = useMemo(() => {
    const words = form.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (!words.length && !form.location.trim()) return [];
    return issues
      .filter((i) => i.status !== "verified" && i.category === form.category)
      .filter((i) => {
        const hay = (i.title + " " + i.location).toLowerCase();
        const locHit =
          form.location.trim().length > 2 && hay.includes(form.location.trim().toLowerCase());
        return locHit || words.some((w) => hay.includes(w));
      })
      .slice(0, 3);
  }, [form.title, form.location, form.category, issues]);

  const preview = useMemo(
    () =>
      scoreIssue({
        ...form,
        reporters: ["x"],
        createdAt: Date.now(),
      }),
    [form]
  );
  const lvl = levelOf(preview.total);
  const valid = form.title.trim() && form.location.trim();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Report an issue</h2>
          <button className="close static" onClick={onClose}>
            ✕
          </button>
        </div>

        <label>What's wrong?</label>
        <div className="cat-grid">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button
              key={k}
              type="button"
              className={"cat " + (form.category === k ? "on" : "")}
              onClick={() => set("category", k)}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <label>Title</label>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Water pipe leaking in corridor"
        />

        <label>Location</label>
        <input
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Hostel Block A, 2nd floor"
        />

        <label>Details (optional)</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe what you see…"
        />

        <label>
          Severity: <b>{SEVERITY[form.severity]}</b>
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={form.severity}
          onChange={(e) => set("severity", Number(e.target.value))}
        />

        <label className="check">
          <input
            type="checkbox"
            checked={form.safety}
            onChange={(e) => set("safety", e.target.checked)}
          />
          This is a safety hazard (risk of injury, fire, slipping…)
        </label>

        {similar.length > 0 && (
          <div className="similar">
            <b>Looks similar to existing reports. Add yours instead of duplicating:</b>
            {similar.map((s) => (
              <div key={s.id} className="sim-row">
                <span>
                  {s.title} <em>({s.reporters.length} reported)</em>
                </span>
                <button className="btn small" onClick={() => onMeToo(s.id)}>
                  Me too
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="preview">
          Estimated starting priority:{" "}
          <span className={"chip " + lvl.key}>
            {lvl.label} · {preview.total}
          </span>
          <small> It rises as more people report it.</small>
        </div>

        <div className="row end">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!valid}
            onClick={() => onSubmit({ ...form, title: form.title.trim(), location: form.location.trim() })}
          >
            Submit report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Styles (mid-light to dark theme) ---------------- */
const css = `
:root{
  --bg1:#3b4a6b; --bg2:#1c2336; --panel:#2b3652; --panel2:#344163; --line:#46557c;
  --text:#eef2fb; --muted:#aab6d3; --accent:#7c9cff; --accent2:#9b7cff;
  --critical:#ff6b6b; --high:#ff9f5a; --medium:#f5cf56; --low:#5fd3a0;
}
*{box-sizing:border-box}
body{margin:0}
.app{
  min-height:100vh; color:var(--text);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(160deg,var(--bg1) 0%, #2a3452 45%, var(--bg2) 100%);
  padding:20px clamp(12px,3vw,36px) 60px;
}
.top{display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:18px}
.brand{display:flex; gap:12px; align-items:center}
.logo{font-size:30px; background:linear-gradient(135deg,var(--accent),var(--accent2)); width:52px;height:52px; border-radius:14px; display:grid; place-items:center; box-shadow:0 6px 18px #0004}
.brand h1{margin:0; font-size:24px; letter-spacing:.3px}
.brand p{margin:2px 0 0; color:var(--muted); font-size:13px}
.controls{display:flex; gap:10px; align-items:center; flex-wrap:wrap}
.name-input{width:120px}
input,select,textarea{
  background:#222b43; color:var(--text); border:1px solid var(--line); border-radius:10px;
  padding:9px 12px; font:inherit; font-size:14px; outline:none; width:100%;
}
.controls input, .toolbar input, .toolbar select{width:auto}
input:focus,select:focus,textarea:focus{border-color:var(--accent); box-shadow:0 0 0 3px #7c9cff33}
textarea{resize:vertical}
.seg{display:flex; background:#222b43; border:1px solid var(--line); border-radius:10px; overflow:hidden}
.seg button{background:none; border:0; color:var(--muted); padding:9px 14px; cursor:pointer; font:inherit; font-size:14px}
.seg button.on{background:var(--accent); color:#0f1730; font-weight:600}
.btn{background:var(--panel2); color:var(--text); border:1px solid var(--line); border-radius:10px; padding:9px 14px; cursor:pointer; font:inherit; font-size:14px; transition:.15s}
.btn:hover{filter:brightness(1.15); transform:translateY(-1px)}
.btn:disabled{opacity:.45; cursor:not-allowed; transform:none}
.btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#0f1730; font-weight:700; border:0}
.btn.success{background:#2fa577; border:0; font-weight:600}
.btn.danger{background:#c85a5a; border:0; font-weight:600}
.btn.small{padding:5px 10px; font-size:12px}

.stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:14px}
.stat{background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; border-left:4px solid var(--accent)}
.stat.red{border-left-color:var(--critical)} .stat.amber{border-left-color:var(--medium)} .stat.green{border-left-color:var(--low)}
.stat-v{font-size:28px; font-weight:800}
.stat-l{color:var(--muted); font-size:13px}

.pipeline{display:flex; gap:4px; overflow-x:auto; margin-bottom:16px; padding-bottom:4px}
.pipe{flex:1; min-width:110px; background:var(--panel); border:1px solid var(--line); border-radius:12px; color:var(--text); padding:10px 12px; cursor:pointer; position:relative; text-align:left; font:inherit}
.pipe.on{outline:2px solid var(--accent); background:var(--panel2)}
.pipe-n{font-size:20px; font-weight:800; margin-right:8px}
.pipe-l{font-size:12px; color:var(--muted)}
.pipe-arrow{position:absolute; right:-9px; top:50%; transform:translateY(-50%); color:var(--accent); font-size:20px; z-index:2}

.layout{display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); gap:18px; align-items:start}
@media(max-width:900px){.layout{grid-template-columns:1fr}}
.toolbar{display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px}
.toolbar .search{flex:1; min-width:180px}
.empty{background:var(--panel); border:1px dashed var(--line); border-radius:14px; padding:30px; text-align:center; color:var(--muted)}

.card{display:flex; gap:14px; align-items:center; background:var(--panel); border:1px solid var(--line); border-left:5px solid var(--low); border-radius:14px; padding:14px; margin-bottom:10px; cursor:pointer; transition:.15s}
.card:hover{transform:translateY(-2px); background:var(--panel2)}
.card.active{outline:2px solid var(--accent)}
.card.critical{border-left-color:var(--critical)} .card.high{border-left-color:var(--high)} .card.medium{border-left-color:var(--medium)}
.card h3{margin:6px 0; font-size:16px}
.card-top{display:flex; gap:6px; flex-wrap:wrap}
.meta{display:flex; gap:12px; flex-wrap:wrap; color:var(--muted); font-size:12.5px}
.card-body{min-width:0}

.chip{display:inline-block; font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:99px; background:#0003}
.chip.critical{background:#ff6b6b30; color:var(--critical)} .chip.high{background:#ff9f5a30; color:var(--high)}
.chip.medium{background:#f5cf5630; color:var(--medium)} .chip.low{background:#5fd3a030; color:var(--low)}
.chip.safety{background:#ff6b6b25; color:#ffb0b0}
.status{font-size:11.5px; padding:3px 9px; border-radius:99px; background:#7c9cff25; color:#b9c9ff; font-weight:600}
.status.s-resolved{background:#f5cf5630; color:var(--medium)}
.status.s-verified{background:#5fd3a030; color:var(--low)}

.ring{position:relative; flex:none; display:grid; place-items:center}
.ring svg{position:absolute; inset:0}
.ring span{font-weight:800; font-size:16px; position:relative}
.ring-bg{fill:none; stroke:#ffffff1c; stroke-width:6}
.ring-fg{fill:none; stroke-width:6; stroke-linecap:round; transition:.5s}
.ring.critical .ring-fg{stroke:var(--critical)} .ring.high .ring-fg{stroke:var(--high)}
.ring.medium .ring-fg{stroke:var(--medium)} .ring.low .ring-fg{stroke:var(--low)}

.detail-col{position:sticky; top:16px}
.placeholder{background:var(--panel); border:1px dashed var(--line); border-radius:16px; padding:30px; text-align:center; color:var(--muted)}
.placeholder h3{color:var(--text); margin:6px 0}
.legend{display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin-top:14px; align-items:center}
.detail{background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:20px; position:relative; max-height:calc(100vh - 40px); overflow:auto}
@media(max-width:900px){.detail{max-height:none}.detail-col{position:static}}
.detail h2{margin:6px 0; font-size:19px}
.detail h4{margin:20px 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--muted)}
.detail-head{display:flex; gap:14px; align-items:center}
.desc{color:#d5ddf1; line-height:1.5}
.close{position:absolute; right:12px; top:12px; background:#0003; border:0; color:var(--muted); border-radius:8px; width:30px; height:30px; cursor:pointer}
.close.static{position:static}

.stepper{display:flex; justify-content:space-between; margin:18px 0 4px}
.step{flex:1; text-align:center; position:relative}
.step::before{content:""; position:absolute; top:12px; left:-50%; width:100%; height:3px; background:var(--line); z-index:0}
.step:first-child::before{display:none}
.step.done::before,.step.now::before{background:var(--accent)}
.dot{width:26px; height:26px; border-radius:50%; background:var(--line); margin:0 auto; display:grid; place-items:center; font-size:12px; font-weight:700; position:relative; z-index:1}
.step.done .dot{background:var(--accent); color:#0f1730}
.step.now .dot{background:var(--accent2); color:#fff; box-shadow:0 0 0 4px #9b7cff44}
.step-l{font-size:10.5px; color:var(--muted); margin-top:5px}

.breakdown{background:#222b4380; border-radius:12px; padding:12px}
.bar-row{display:grid; grid-template-columns:130px 1fr 40px; gap:8px; align-items:center; margin:6px 0; font-size:12.5px}
.bar{height:8px; background:#ffffff14; border-radius:99px; overflow:hidden}
.bar-fill{height:100%; border-radius:99px; background:var(--accent)}
.bar-fill.critical{background:var(--critical)} .bar-fill.high{background:var(--high)} .bar-fill.medium{background:var(--medium)} .bar-fill.low{background:var(--low)}
.bar-v{text-align:right; color:var(--muted)}
.bar-total{margin-top:10px; font-size:12.5px; color:var(--muted)}
.bar-total b{color:var(--text)}

.actions{display:flex; flex-direction:column; gap:10px; align-items:flex-start}
.action-box{width:100%; background:#222b4380; padding:12px; border-radius:12px}
.action-box label{display:block; margin-bottom:6px; font-size:13px; color:var(--muted)}
.row{display:flex; gap:8px}
.row.end{justify-content:flex-end; margin-top:16px}
.verified{background:#5fd3a022; color:var(--low); padding:10px 14px; border-radius:10px; font-weight:600}
.hint{font-size:12.5px; color:var(--muted); margin:0}

.timeline{list-style:none; padding:0; margin:0}
.timeline li{display:flex; gap:12px; padding:0 0 14px 0; position:relative}
.timeline li::before{content:""; position:absolute; left:5px; top:14px; bottom:0; width:2px; background:var(--line)}
.timeline li:last-child::before{display:none}
.tl-dot{width:12px; height:12px; border-radius:50%; background:var(--accent); margin-top:4px; flex:none}
.tl-dot.s-resolved{background:var(--medium)} .tl-dot.s-verified{background:var(--low)}
.tl-time{color:var(--muted); font-size:12px}
.tl-note{font-size:13px; color:#cdd6ee} .tl-note em{color:var(--muted)}

.overlay{position:fixed; inset:0; background:#0009; display:grid; place-items:center; padding:16px; z-index:50; backdrop-filter:blur(3px)}
.modal{background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:22px; width:min(560px,100%); max-height:92vh; overflow:auto}
.modal-head{display:flex; justify-content:space-between; align-items:center}
.modal h2{margin:0 0 6px}
.modal label{display:block; margin:14px 0 6px; font-size:13px; color:var(--muted)}
.modal label.check{display:flex; gap:8px; align-items:center; color:var(--text)}
.modal label.check input{width:auto}
.cat-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:8px}
.cat{display:flex; gap:8px; align-items:center; background:#222b43; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:9px; cursor:pointer; font:inherit; font-size:12.5px; text-align:left}
.cat.on{border-color:var(--accent); background:#7c9cff26}
.cat span{font-size:18px}
.similar{margin-top:14px; background:#f5cf5618; border:1px solid #f5cf5655; border-radius:12px; padding:10px; font-size:13px}
.sim-row{display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px}
.sim-row em{color:var(--muted)}
.preview{margin-top:16px; font-size:13px; color:var(--muted)}

.toast{position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--accent); color:#0f1730; padding:11px 20px; border-radius:99px; font-weight:600; box-shadow:0 8px 24px #0006; z-index:60}
`;

