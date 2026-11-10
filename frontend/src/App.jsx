
import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import "./App.css";

/* ─────────────── NATIVE PLUGIN ─────────────── */

const Steps = registerPlugin("Steps");

/* ─────────────── CONSTANTS ─────────────── */

const HABITS_KEY = "futr.habits.v2";
const METRICS_KEY = "futr.metrics.v2";
const THEME_KEY = "futr.theme.v1";
const CATEGORIES = ["Learning", "Personal", "Fitness", "Health"];
const TODAY = new Date().toISOString().slice(0, 10);

const METRIC_DEFS = [
  { id: "sleep", icon: "☾", name: "Sleep", unit: "hours", step: 0.5, max: 24, placeholder: "7.5" },
  { id: "steps", icon: "👟", name: "Steps", unit: "steps", step: 100, max: 50000, placeholder: "6000" },
  { id: "mindfulness", icon: "❋", name: "Mindfulness", unit: "minutes", step: 5, max: 180, placeholder: "20" },
  { id: "focus", icon: "◈", name: "Focus", unit: "hours", step: 0.5, max: 16, placeholder: "4" },
];

const DEFAULT_METRICS = Object.fromEntries(
  METRIC_DEFS.map((m) => [
    m.id,
    { target: null, history: {} },
  ])
);

const DEFAULT_HABITS = [
  { id: 1, name: "DSA Practice", category: "Learning", completed: false },
  { id: 2, name: "Read for 20 minutes", category: "Personal", completed: false },
  { id: 3, name: "Morning Walk", category: "Fitness", completed: false },
  { id: 4, name: "Drink 3L Water", category: "Health", completed: false },
];

const WEEKLY_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));

  return {
    iso: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
});

const TABS = [
  ["◫", "Today"],
  ["◉", "Metrics"],
  ["▦", "Analytics"],
];

/* ─────────────── HELPERS ─────────────── */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getGreeting(h) {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function pct(actual, target) {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const start = performance.now();
    let raf;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;

      setValue(Math.round(from + (target - from) * eased));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function smoothPath(pts) {
  if (pts.length < 2) return "";

  let d = `M${pts[0].x},${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/* ─────────────── CHART ─────────────── */

const CH = { l: 46, r: 500, t: 18, b: 150 };

function WeeklyChart({ data, labels }) {
  const [hovered, setHovered] = useState(null);

  const pts = data.map((v, i) => ({
    x: CH.l + (i * (CH.r - CH.l)) / (data.length - 1),
    y: CH.b - (v / 100) * (CH.b - CH.t),
    v,
  }));

  const line = smoothPath(pts);
  const area = `${line} L${pts.at(-1).x},${CH.b} L${pts[0].x},${CH.b} Z`;
  const active = hovered !== null ? pts[hovered] : null;

  return (
    <svg
      className="weekly-chart"
      viewBox="0 0 520 190"
      role="img"
      aria-label="Weekly wellness chart"
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
        </linearGradient>

        <linearGradient id="lG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--accent-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--accent-strong)" }} />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((tick) => {
        const y = CH.b - (tick / 100) * (CH.b - CH.t);

        return (
          <g key={tick}>
            <line
              x1={CH.l - 8}
              y1={y}
              x2={CH.r + 10}
              y2={y}
              className="chart-grid"
            />
            <text
              x={CH.l - 12}
              y={y + 3}
              className="chart-axis"
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        );
      })}

      <path d={area} className="chart-area" fill="url(#aG)" />
      <path d={line} className="chart-line" stroke="url(#lG)" />

      {active && (
        <line
          x1={active.x}
          y1={CH.t - 6}
          x2={active.x}
          y2={CH.b}
          className="chart-guide"
        />
      )}

      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)}>
          <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 7 : 5}
            className={`chart-dot ${i === pts.length - 1 ? "is-today" : ""}`}
            style={{ animationDelay: `${0.9 + i * 0.08}s` }}
          />
        </g>
      ))}

      {labels.map((lbl, i) => (
        <text
          key={lbl + i}
          x={pts[i].x}
          y="178"
          textAnchor="middle"
          className={`chart-axis ${i === labels.length - 1 ? "chart-axis-today" : ""}`}
        >
          {lbl}
        </text>
      ))}

      {active && (
        <g
          className="chart-tooltip"
          transform={`translate(${Math.min(Math.max(active.x, 70), 450)},${Math.max(active.v === 0 ? CH.b - 30 : active.y - 34, 4)})`}
        >
          <rect x="-34" y="-4" width="68" height="24" rx="8" />
          <text x="0" y="12" textAnchor="middle">
            {active.v} pts
          </text>
        </g>
      )}
    </svg>
  );
}

/* ─────────────── METRIC CARD ─────────────── */

function MetricCard({ def, data, onChange, onTargetSave }) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [actualInput, setActualInput] = useState("");

  const target = data.target;
  const todayVal = data.history[TODAY] ?? null;
  const progress = todayVal !== null && target ? pct(todayVal, target) : null;
  const achieved = progress !== null && progress >= 100;

  const days7 = WEEKLY_DAYS.map((d) => data.history[d.iso] ?? null);

  const handleTargetSubmit = (e) => {
    e.preventDefault();

    const v = parseFloat(targetInput);

    if (!isNaN(v) && v > 0) {
      onTargetSave(v);
      setEditingTarget(false);
      setTargetInput("");
    }
  };

  const handleActualSubmit = (e) => {
    e.preventDefault();

    const v = parseFloat(actualInput);

    if (!isNaN(v) && v >= 0) {
      onChange(TODAY, v);
      setActualInput("");
    }
  };

  return (
    <div className={`panel metric-detail-card reveal ${def.id}`}>
      <div className="mdc-header">
        <span className="mdc-icon">{def.icon}</span>

        <div>
          <h3>{def.name}</h3>
          <span className="mdc-unit">{def.unit}</span>
        </div>

        {target && (
          <button
            className="mdc-edit-btn"
            onClick={() => {
              setEditingTarget(true);
              setTargetInput(String(target));
            }}
            title="Edit target"
          >
            ✎
          </button>
        )}
      </div>

      {!target || editingTarget ? (
        <form className="mdc-form" onSubmit={handleTargetSubmit}>
          <label>Daily target</label>

          <div className="mdc-input-row">
            <input
              type="number"
              step={def.step}
              min="0"
              max={def.max}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={`e.g. ${def.placeholder}`}
              required
            />

            <span className="mdc-unit-badge">{def.unit}</span>

            <button type="submit">
              {editingTarget ? "Update" : "Set target"}
            </button>

            {editingTarget && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => setEditingTarget(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <div className="mdc-target-row">
            <div className="mdc-kv">
              <small>DAILY TARGET</small>
              <strong>{target}</strong>
              <span>{def.unit}</span>
            </div>

            <div className="mdc-kv">
              <small>TODAY'S ACTUAL</small>
              <strong className={todayVal !== null ? (achieved ? "clr-good" : "clr-warn") : "clr-empty"}>
                {todayVal !== null ? todayVal : "—"}
              </strong>
              {todayVal !== null && <span>{def.unit}</span>}
            </div>

            {progress !== null && (
              <div className="mdc-kv center">
                <small>ATTAINMENT</small>
                <strong className={achieved ? "clr-good" : "clr-warn"}>
                  {progress}%
                </strong>
                <span className={`mdc-badge ${achieved ? "good" : "warn"}`}>
                  {achieved ? "✓ Achieved" : "↓ Below target"}
                </span>
              </div>
            )}
          </div>

          {progress !== null && (
            <div className="mdc-progress-wrap">
              <div className="mdc-progress-track">
                <div
                  className="mdc-progress-fill"
                  style={{
                    width: `${progress}%`,
                    "--color": achieved ? "var(--good)" : "var(--accent)",
                  }}
                />
              </div>
            </div>
          )}

          <form className="mdc-form mdc-actual-form" onSubmit={handleActualSubmit}>
            <label>Enter today's actual</label>

            <div className="mdc-input-row">
              <input
                type="number"
                step={def.step}
                min="0"
                max={def.max}
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
                placeholder={todayVal !== null ? `Current: ${todayVal}` : def.placeholder}
              />

              <span className="mdc-unit-badge">{def.unit}</span>
              <button type="submit">Save</button>
            </div>
          </form>

          <div className="mdc-history">
            <small className="mdc-history-label">LAST 7 DAYS</small>

            <div className="mdc-bars">
              {days7.map((v, i) => {
                const h = target && v !== null ? Math.min((v / target) * 100, 100) : 0;
                const isToday = WEEKLY_DAYS[i].iso === TODAY;

                return (
                  <div
                    className="mdc-bar-wrap"
                    key={i}
                    title={v !== null ? `${WEEKLY_DAYS[i].label}: ${v} ${def.unit}` : `${WEEKLY_DAYS[i].label}: —`}
                  >
                    <div
                      className={`mdc-bar ${h >= 100 ? "good" : v !== null ? "partial" : "empty"} ${isToday ? "today" : ""}`}
                      style={{ height: `${Math.max(h, v !== null ? 8 : 4)}%` }}
                    />
                    <span>{WEEKLY_DAYS[i].label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────── DASHBOARD METRIC PILL ─────────────── */

function MetricPill({ def, data, nativeSteps }) {
  const target = data.target;

  // Steps use the actual native sensor value when available.
  const todayVal =
    def.id === "steps" && nativeSteps !== null
      ? nativeSteps
      : data.history[TODAY] ?? null;

  const progress = todayVal !== null && target ? pct(todayVal, target) : null;
  const achieved = progress !== null && progress >= 100;

  return (
    <div className={`metric-card reveal ${def.id}`}>
      <div className="metric-top">
        <span className="metric-icon">{def.icon}</span>

        {progress !== null && (
          <span className={`metric-trend ${achieved ? "good" : ""}`}>
            {progress}%
          </span>
        )}
      </div>

      <h3>{def.name}</h3>

      <div className="metric-value">
        {todayVal !== null ? todayVal.toLocaleString() : (target ? "—" : "Set target")}
      </div>

      <p>
        {def.id === "steps" && nativeSteps !== null
          ? "Live from phone"
          : def.unit}
      </p>

      {target && (
        <div className="metric-mini-bar">
          <div
            style={{
              width: `${progress ?? 0}%`,
              background: achieved ? "var(--good)" : "var(--accent)",
            }}
          />
        </div>
      )}

      <div className="metric-decoration" />
    </div>
  );
}

/* ─────────────── MAIN APP ─────────────── */

export default function App() {
  const now = new Date();
  const hour = now.getHours();

  const [habits, setHabits] = useState(() =>
    loadJSON(HABITS_KEY, DEFAULT_HABITS)
  );

  const [metrics, setMetrics] = useState(() => {
    const saved = loadJSON(METRICS_KEY, null);

    if (!saved) return DEFAULT_METRICS;

    const merged = { ...DEFAULT_METRICS };

    for (const id of Object.keys(merged)) {
      if (saved[id]) merged[id] = saved[id];
    }

    return merged;
  });

  const [theme, setTheme] = useState(() => loadJSON(THEME_KEY, "light"));
  const [activeTab, setActiveTab] = useState("Today");
  const [newHabit, setNewHabit] = useState("");
  const [newCat, setNewCat] = useState("Personal");
  const [showInput, setShowInput] = useState(false);
  const [extraHours, setExtraHours] = useState(2);
  const [mounted, setMounted] = useState(false);

  // Native phone step count
  const [nativeSteps, setNativeSteps] = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    saveJSON(HABITS_KEY, habits);
  }, [habits]);

  useEffect(() => {
    saveJSON(METRICS_KEY, metrics);
  }, [metrics]);

  useEffect(() => {
    saveJSON(THEME_KEY, theme);
  }, [theme]);

  /* ─────────────── NATIVE STEPS SYNC ─────────────── */

  useEffect(() => {
    // if (!Capacitor.isNativePlatform()) return;

    let isActive = true;

    const fetchSteps = async () => {
      try {
        const result = await Steps.getTodaySteps();
        console.log("NATIVE STEPS RESULT:", result);

        if (!isActive) return;

        const steps = Number(result.steps);
        const date = result.date;

        if (!Number.isFinite(steps)) return;

        setNativeSteps(steps);

        setMetrics((current) => ({
          ...current,
          steps: {
            ...current.steps,
            history: {
              ...current.steps.history,
              [date]: steps,
            },
          },
        }));
      } catch (error) {
        console.error("Unable to fetch native steps:", error);
      }
    };

    fetchSteps();

    const interval = setInterval(fetchSteps, 5000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  /* ─────────────── HABIT HELPERS ─────────────── */

  const completed = habits.filter((h) => h.completed).length;
  const total = habits.length;
  const score = total === 0 ? 0 : Math.round((completed / total) * 100);
  const scoreAnim = useCountUp(score);

  const toggleHabit = (id) =>
    setHabits((cur) =>
      cur.map((h) =>
        h.id === id ? { ...h, completed: !h.completed } : h
      )
    );

  const deleteHabit = (id) =>
    setHabits((cur) => cur.filter((h) => h.id !== id));

  const addHabit = (e) => {
    e.preventDefault();

    if (!newHabit.trim()) return;

    setHabits((cur) => [
      ...cur,
      {
        id: Date.now(),
        name: newHabit.trim(),
        category: newCat,
        completed: false,
      },
    ]);

    setNewHabit("");
    setShowInput(false);
  };

  /* ─────────────── METRIC HELPERS ─────────────── */

  const setTarget = (id, value) =>
    setMetrics((cur) => ({
      ...cur,
      [id]: { ...cur[id], target: value },
    }));

  const setActual = (id, date, value) =>
    setMetrics((cur) => ({
      ...cur,
      [id]: {
        ...cur[id],
        history: {
          ...cur[id].history,
          [date]: value,
        },
      },
    }));

  /* ─────────────── WEEKLY SCORES ─────────────── */

  const weekly = useMemo(() => {
    return WEEKLY_DAYS.map((d, i) =>
      i === 6 ? score : [18, 55, 32, 86, 58, 79][i]
    );
  }, [score]);

  const trendUp = score >= weekly[5];

  /* ─────────────── METRIC HEALTH ─────────────── */

  const metricsWithData = METRIC_DEFS.filter(
    (m) => metrics[m.id].history[TODAY] != null
  ).length;

  const metricsAchieved = METRIC_DEFS.filter((m) => {
    const d = metrics[m.id];

    return (
      d.target &&
      d.history[TODAY] != null &&
      pct(d.history[TODAY], d.target) >= 100
    );
  }).length;

  /* ─────────────── FUTURE PANEL ─────────────── */

  const currentHours = 2 * 180;
  const improvedHours = (2 + extraHours) * 180;

  const dateLabel = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();

  /* ─────────────── RENDER ─────────────── */

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="bg-blob blob-a" />
      <div className="bg-blob blob-b" />

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">f.</div>
          <span>
            futr<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="side-nav">
          {TABS.map(([icon, label]) => (
            <button
              key={label}
              className={`nav-item ${activeTab === label ? "active" : ""}`}
              onClick={() => setActiveTab(label)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-metric-summary">
          {METRIC_DEFS.map((m) => {
            const d = metrics[m.id];
            const val =
              m.id === "steps" && nativeSteps !== null
                ? nativeSteps
                : d.history[TODAY];

            const p = val != null && d.target ? pct(val, d.target) : null;

            return (
              <div
                className="sm-row"
                key={m.id}
                onClick={() => setActiveTab("Metrics")}
                title={`Go to ${m.name}`}
              >
                <span>{m.icon}</span>
                <span className="sm-name">{m.name}</span>

                {p !== null ? (
                  <span className={`sm-pct ${p >= 100 ? "good" : ""}`}>
                    {p}%
                  </span>
                ) : (
                  <span className="sm-empty">—</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          <div className="streak-card">
            <span className="streak-icon">✦</span>

            <div>
              <strong>Keep going!</strong>
              <p>Small steps, big changes.</p>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">A</div>

            <div>
              <strong>My Journey</strong>
              <p>Building a better you</p>
            </div>

            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{dateLabel}</p>

            <h1>
              {getGreeting(hour)} <span>✦</span>
            </h1>

            <p className="welcome-text">
              Every small action is shaping your future.
            </p>
          </div>

          <div className="topbar-right">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme"
            >
              {theme === "light" ? "☾" : "☀"}
            </button>

            <div className="date-pill">☀️ &nbsp; Your daily space</div>
            <div className="top-avatar">A</div>
          </div>
        </header>

        <div className="view" key={activeTab}>

          {/* TODAY TAB */}

          {activeTab === "Today" && (
            <>
              <section className="overview-grid">
                <div
                  className="panel score-panel reveal"
                  style={{ "--i": 0 }}
                >
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">YOUR PROGRESS</p>
                      <h2>Daily Score</h2>
                    </div>

                    <span className="sun-icon">☼</span>
                  </div>

                  <div className="score-content">
                    <div
                      className={`score-ring ${score === 100 ? "perfect" : ""}`}
                      style={{
                        "--p": `${(mounted ? score : 0) * 3.6}deg`,
                      }}
                    >
                      <div className="score-inner">
                        <strong>{scoreAnim}</strong>
                        <span>out of 100</span>
                      </div>
                    </div>

                    <div className="score-caption">
                      <span className="score-status">
                        {score === 100
                          ? "Amazing work! 🎉"
                          : score === 0
                            ? "Let's get started"
                            : "You're making progress"}
                      </span>

                      <p>
                        {completed} of {total} habits completed.
                      </p>

                      {metricsWithData > 0 && (
                        <p className="metrics-subtext">
                          {metricsAchieved}/{METRIC_DEFS.length} metrics achieved today.
                        </p>
                      )}

                      <div className="mini-progress">
                        <span style={{ width: `${mounted ? score : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="panel energy-panel reveal"
                  style={{ "--i": 1 }}
                >
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">YOUR LAST 7 DAYS</p>
                      <h2>Weekly Wellness</h2>
                    </div>

                    <span className={`trend-pill ${trendUp ? "" : "down"}`}>
                      {trendUp ? "↗ Growing" : "↘ Dipping"}
                    </span>
                  </div>

                  <WeeklyChart
                    data={weekly}
                    labels={WEEKLY_DAYS.map((d) => d.label)}
                  />
                </div>
              </section>

              {/* DAILY METRICS */}

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">YOUR LIFESTYLE</p>
                    <h2>Daily Metrics</h2>
                  </div>

                  <button
                    className="muted-link"
                    onClick={() => setActiveTab("Metrics")}
                  >
                    Edit targets →
                  </button>
                </div>

                <div className="metrics-grid">
                  {METRIC_DEFS.map((m, i) => (
                    <MetricPill
                      key={m.id}
                      def={m}
                      data={metrics[m.id]}
                      nativeSteps={nativeSteps}
                      style={{ "--i": i + 2 }}
                    />
                  ))}
                </div>
              </section>

              {/* HABITS + FUTURE */}

              <section className="lower-grid">
                <div
                  className="panel habits-panel reveal"
                  style={{ "--i": 3 }}
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">MAKE TODAY COUNT</p>
                      <h2>Today's Habits</h2>
                    </div>

                    <span className="habit-count">
                      {completed}/{total}
                    </span>
                  </div>

                  <div className="habit-progress-track">
                    <span style={{ width: `${mounted ? score : 0}%` }} />
                  </div>

                  <div className="habit-list">
                    {habits.length === 0 && (
                      <p className="empty-state">
                        No habits yet. Add your first one below ✦
                      </p>
                    )}

                    {habits.map((habit) => (
                      <div className="habit-row" key={habit.id}>
                        <label className="habit-main">
                          <input
                            type="checkbox"
                            checked={habit.completed}
                            onChange={() => toggleHabit(habit.id)}
                          />

                          <span className="custom-check">✓</span>

                          <span
                            className={`habit-text ${habit.completed ? "habit-done" : ""}`}
                          >
                            {habit.name}

                            <small className={`cat cat-${habit.category.toLowerCase()}`}>
                              {habit.category}
                            </small>
                          </span>

                          <span
                            className={`habit-status ${habit.completed ? "is-done" : ""}`}
                          >
                            {habit.completed ? "Completed" : "Pending"}
                          </span>
                        </label>

                        <button
                          className="habit-delete"
                          onClick={() => deleteHabit(habit.id)}
                          aria-label={`Delete ${habit.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {showInput ? (
                    <form className="add-habit-form" onSubmit={addHabit}>
                      <input
                        autoFocus
                        value={newHabit}
                        onChange={(e) => setNewHabit(e.target.value)}
                        placeholder="Enter a new habit..."
                      />

                      <select
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>

                      <button type="submit">Add</button>

                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => setShowInput(false)}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      className="add-habit-button"
                      onClick={() => setShowInput(true)}
                    >
                      + &nbsp; Add a new habit
                    </button>
                  )}
                </div>

                {/* FUTURE SELF */}

                <div
                  className="panel future-panel reveal"
                  style={{ "--i": 4 }}
                >
                  <p className="eyebrow">A LITTLE BETTER EVERY DAY</p>
                  <h2>Meet your future self.</h2>

                  <p className="future-description">
                    What if you invested a little more time in yourself every day?
                  </p>

                  <div className="future-avatars">
                    <div className="future-person">
                      <div className="person-avatar current-avatar">🙂</div>
                      <span>Current You</span>
                      <small>2 hrs / day</small>
                    </div>

                    <div className="future-arrow">→</div>

                    <div className="future-person">
                      <div
                        className="person-avatar improved-avatar"
                        style={{ "--grow": 1 + extraHours * 0.06 }}
                      >
                        ✦
                      </div>

                      <span>Improved You</span>
                      <small>{2 + extraHours} hrs / day</small>
                    </div>
                  </div>

                  <div className="slider-heading">
                    <span>Extra daily effort</span>
                    <strong>+{extraHours} hours</strong>
                  </div>

                  <input
                    className="effort-slider"
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={extraHours}
                    style={{ "--fill": `${(extraHours / 5) * 100}%` }}
                    onChange={(e) => setExtraHours(Number(e.target.value))}
                  />

                  <div className="projection-result">
                    <div>
                      <small>6-MONTH POTENTIAL</small>
                      <strong>{Math.round(improvedHours).toLocaleString()} hrs</strong>
                    </div>

                    <div className="projection-divider" />

                    <div>
                      <small>EXTRA TIME INVESTED</small>
                      <strong>
                        +{Math.round(improvedHours - currentHours).toLocaleString()} hrs
                      </strong>
                    </div>
                  </div>

                  <p className="disclaimer">
                    Illustrative what-if scenario, not a prediction.
                  </p>
                </div>
              </section>
            </>
          )}

          {/* METRICS TAB */}

          {activeTab === "Metrics" && (
            <section className="metrics-detail-section">
              <div
                className="section-heading"
                style={{ marginBottom: 24 }}
              >
                <div>
                  <p className="eyebrow">TARGET VS ACTUAL</p>
                  <h2>Daily Metrics</h2>
                </div>

                <span className="muted-text">
                  Set targets once, track daily
                </span>
              </div>

              <div className="metrics-detail-grid">
                {METRIC_DEFS.map((m, i) => (
                  <MetricCard
                    key={m.id}
                    def={m}
                    data={metrics[m.id]}
                    style={{ "--i": i }}
                    onChange={(date, val) => setActual(m.id, date, val)}
                    onTargetSave={(val) => setTarget(m.id, val)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ANALYTICS TAB */}

          {activeTab === "Analytics" && (
            <>
              <section
                className="overview-grid"
                style={{ marginBottom: 24 }}
              >
                <div
                  className="panel score-panel reveal"
                  style={{ "--i": 0 }}
                >
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">THIS WEEK</p>
                      <h2>Habit Score</h2>
                    </div>

                    <span className="sun-icon">☼</span>
                  </div>

                  <div className="score-content">
                    <div
                      className={`score-ring ${score === 100 ? "perfect" : ""}`}
                      style={{
                        "--p": `${(mounted ? score : 0) * 3.6}deg`,
                      }}
                    >
                      <div className="score-inner">
                        <strong>{scoreAnim}</strong>
                        <span>today</span>
                      </div>
                    </div>

                    <div className="score-caption">
                      <span className="score-status">Weekly avg</span>

                      <p className="big-avg">
                        {Math.round(
                          weekly.reduce((a, b) => a + b, 0) / weekly.length
                        )}
                      </p>

                      <span className="muted-text">points / day</span>
                    </div>
                  </div>
                </div>

                <div
                  className="panel energy-panel reveal"
                  style={{ "--i": 1 }}
                >
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">YOUR LAST 7 DAYS</p>
                      <h2>Weekly Wellness</h2>
                    </div>

                    <span className={`trend-pill ${trendUp ? "" : "down"}`}>
                      {trendUp ? "↗ Growing" : "↘ Dipping"}
                    </span>
                  </div>

                  <WeeklyChart
                    data={weekly}
                    labels={WEEKLY_DAYS.map((d) => d.label)}
                  />
                </div>
              </section>

              <section className="insights">
                {[
                  [
                    "WEEKLY AVERAGE",
                    `${Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length)}`,
                    "points per day",
                  ],
                  [
                    "BEST DAY",
                    WEEKLY_DAYS[weekly.indexOf(Math.max(...weekly))].label,
                    `${Math.max(...weekly)} points`,
                  ],
                  ["HABITS TODAY", `${completed}/${total}`, "completed"],
                  ["METRICS LOGGED", `${metricsWithData}/${METRIC_DEFS.length}`, "today"],
                ].map(([lbl, val, sub], i) => (
                  <div
                    className="panel insight-card reveal"
                    style={{ "--i": i + 2 }}
                    key={lbl}
                  >
                    <small>{lbl}</small>
                    <strong>{val}</strong>
                    <span>{sub}</span>
                  </div>
                ))}
              </section>

              {/* 7-DAY HISTORY */}

              <section className="section-block">
                <div
                  className="section-heading"
                  style={{ marginBottom: 16 }}
                >
                  <div>
                    <p className="eyebrow">METRIC BREAKDOWN</p>
                    <h2>7-Day History</h2>
                  </div>
                </div>

                <div
                  className="metrics-detail-grid"
                  style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
                >
                  {METRIC_DEFS.map((m, i) => (
                    <div
                      className="panel reveal"
                      style={{ "--i": i + 4 }}
                      key={m.id}
                    >
                      <div
                        className="mdc-header"
                        style={{ marginBottom: 16 }}
                      >
                        <span className="mdc-icon">{m.icon}</span>

                        <div>
                          <h3>{m.name}</h3>
                          <span className="mdc-unit">{m.unit}</span>
                        </div>

                        {metrics[m.id].target && (
                          <span className="mdc-target-chip">
                            Target: {metrics[m.id].target} {m.unit}
                          </span>
                        )}
                      </div>

                      <div className="mdc-history">
                        <div className="mdc-bars">
                          {WEEKLY_DAYS.map((d, j) => {
                            const val = metrics[m.id].history[d.iso];

                            const h =
                              metrics[m.id].target && val != null
                                ? Math.min(
                                    (val / metrics[m.id].target) * 100,
                                    100
                                  )
                                : 0;

                            return (
                              <div
                                className="mdc-bar-wrap"
                                key={j}
                                title={
                                  val != null
                                    ? `${d.label}: ${val} ${m.unit}`
                                    : `${d.label}: —`
                                }
                              >
                                <div
                                  className={`mdc-bar ${h >= 100 ? "good" : val != null ? "partial" : "empty"} ${d.iso === TODAY ? "today" : ""}`}
                                  style={{
                                    height: `${Math.max(h, val != null ? 8 : 4)}%`,
                                  }}
                                />

                                <span>{d.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="footer">
          <span>futr. &nbsp; Your future is built today.</span>
          <span>One day at a time ✦</span>
        </footer>
      </main>

      {/* MOBILE NAV */}

      <nav className="mobile-nav">
        {TABS.map(([icon, label]) => (
          <button
            key={label}
            className={activeTab === label ? "active" : ""}
            onClick={() => setActiveTab(label)}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
