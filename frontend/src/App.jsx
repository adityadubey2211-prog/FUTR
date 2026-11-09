import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const HABITS_KEY = "futr.habits.v1";
const THEME_KEY = "futr.theme.v1";

const defaultHabits = [
  { id: 1, name: "DSA Practice", category: "Learning", completed: true },
  { id: 2, name: "Read for 20 minutes", category: "Personal", completed: false },
  { id: 3, name: "Morning Walk", category: "Fitness", completed: true },
  { id: 4, name: "Drink 3L Water", category: "Health", completed: false },
];

const CATEGORIES = ["Learning", "Personal", "Fitness", "Health"];

const metrics = [
  { icon: "☾", name: "Sleep", value: "7.5", unit: "hours", trend: "+0.5h", type: "sleep" },
  { icon: "👟", name: "Steps", value: "6,200", unit: "steps", trend: "+12%", type: "steps" },
  { icon: "❋", name: "Mindfulness", value: "20", unit: "minutes", trend: "+5 min", type: "mind" },
  { icon: "🥗", name: "Nutrition", value: "Good", unit: "daily balance", trend: "On track", type: "food" },
  { icon: "◈", name: "Focus", value: "3.5", unit: "hours", trend: "+30 min", type: "focus" },
];

const TABS = [
  ["◫", "Today"],
  ["▦", "Analytics"],
  ["◉", "Future You"],
];

// last 6 days of history; today's value is the live daily score
const pastScores = [18, 55, 32, 86, 58, 79];

/* ---------- helpers ---------- */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
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
      const eased = 1 - Math.pow(1 - t, 3);
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
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function getGreeting(hour) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/* ---------- chart ---------- */

const CHART = { left: 46, right: 500, top: 18, bottom: 150 };

function WeeklyChart({ data, labels }) {
  const [hovered, setHovered] = useState(null);

  const pts = data.map((v, i) => ({
    x: CHART.left + (i * (CHART.right - CHART.left)) / (data.length - 1),
    y: CHART.bottom - (v / 100) * (CHART.bottom - CHART.top),
    v,
  }));

  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x},${CHART.bottom} L${pts[0].x},${CHART.bottom} Z`;
  const active = hovered !== null ? pts[hovered] : null;

  return (
    <svg
      className="weekly-chart"
      viewBox="0 0 520 190"
      role="img"
      aria-label="Weekly wellness score chart"
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--accent-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--accent-strong)" }} />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((tick) => {
        const y = CHART.bottom - (tick / 100) * (CHART.bottom - CHART.top);
        return (
          <g key={tick}>
            <line x1={CHART.left - 8} y1={y} x2={CHART.right + 10} y2={y} className="chart-grid" />
            <text x={CHART.left - 16} y={y + 3} className="chart-axis" textAnchor="end">
              {tick}
            </text>
          </g>
        );
      })}

      <path d={area} className="chart-area" fill="url(#areaGrad)" />
      <path d={line} className="chart-line" pathLength="1" stroke="url(#lineGrad)" />

      {active && (
        <line
          x1={active.x}
          y1={CHART.top - 6}
          x2={active.x}
          y2={CHART.bottom}
          className="chart-guide"
        />
      )}

      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)}>
          <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 6.5 : 4.5}
            className={`chart-dot ${i === pts.length - 1 ? "is-today" : ""}`}
            style={{ animationDelay: `${0.9 + i * 0.08}s` }}
          />
        </g>
      ))}

      {labels.map((label, i) => (
        <text
          key={label + i}
          x={pts[i].x}
          y="178"
          textAnchor="middle"
          className={`chart-axis ${i === labels.length - 1 ? "chart-axis-today" : ""}`}
        >
          {label}
        </text>
      ))}

      {active && (
        <g
          className="chart-tooltip"
          transform={`translate(${Math.min(Math.max(active.x, 70), 450)}, ${Math.max(active.y - 34, 4)})`}
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

/* ---------- app ---------- */

function App() {
  const [habits, setHabits] = useState(() => loadJSON(HABITS_KEY, defaultHabits));
  const [theme, setTheme] = useState(() => loadJSON(THEME_KEY, "light"));
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("Personal");
  const [showInput, setShowInput] = useState(false);
  const [extraHours, setExtraHours] = useState(2);
  const [activeTab, setActiveTab] = useState("Today");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
    } catch {
      /* storage unavailable */
    }
  }, [habits]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const completed = habits.filter((h) => h.completed).length;
  const total = habits.length;
  const score = total === 0 ? 0 : Math.round((completed / total) * 100);
  const shownScore = mounted ? score : 0;
  const animatedScore = useCountUp(score);

  const now = new Date();
  const dateLabel = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
  const greeting = getGreeting(now.getHours());

  const weekly = useMemo(() => [...pastScores, score], [score]);
  const weekLabels = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short" });
    });
  }, []);

  const average = Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length);
  const bestIndex = weekly.indexOf(Math.max(...weekly));
  const trendUp = score >= pastScores[pastScores.length - 1];

  const toggleHabit = (id) => {
    setHabits((current) =>
      current.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h))
    );
  };

  const deleteHabit = (id) => {
    setHabits((current) => current.filter((h) => h.id !== id));
  };

  const addHabit = (event) => {
    event.preventDefault();
    if (!newHabit.trim()) return;

    setHabits((current) => [
      ...current,
      { id: Date.now(), name: newHabit.trim(), category: newCategory, completed: false },
    ]);

    setNewHabit("");
    setShowInput(false);
  };

  const currentHours = 2 * 180;
  const improvedHours = (2 + extraHours) * 180;

  const showOverview = activeTab === "Today" || activeTab === "Analytics";
  const showHabits = activeTab === "Today";
  const showFuture = activeTab === "Today" || activeTab === "Future You";

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="bg-blob blob-a" />
      <div className="bg-blob blob-b" />

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

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{dateLabel}</p>
            <h1>
              {greeting} <span>✦</span>
            </h1>
            <p className="welcome-text">Every small action is shaping your future.</p>
          </div>

          <div className="topbar-right">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle dark mode"
              title="Toggle theme"
            >
              {theme === "light" ? "☾" : "☀"}
            </button>
            <div className="date-pill">☀️ &nbsp; Your daily space</div>
            <div className="top-avatar">A</div>
          </div>
        </header>

        <div className="view" key={activeTab}>
          {showOverview && (
            <section className="overview-grid">
              <div className="panel score-panel reveal" style={{ "--i": 0 }}>
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
                    style={{ "--p": `${shownScore * 3.6}deg` }}
                  >
                    <div className="score-inner">
                      <strong>{animatedScore}</strong>
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
                      {completed} of {total} habits completed today.
                    </p>
                    <div className="mini-progress">
                      <span style={{ width: `${shownScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel energy-panel reveal" style={{ "--i": 1 }}>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">YOUR LAST 7 DAYS</p>
                    <h2>Weekly Wellness</h2>
                  </div>
                  <span className={`trend-pill ${trendUp ? "" : "down"}`}>
                    {trendUp ? "↗ Growing" : "↘ Dipping"}
                  </span>
                </div>

                <WeeklyChart data={weekly} labels={weekLabels} />
              </div>
            </section>
          )}

          {activeTab === "Analytics" && (
            <section className="insights">
              {[
                ["WEEKLY AVERAGE", `${average}`, "points per day"],
                ["BEST DAY", weekLabels[bestIndex], `${weekly[bestIndex]} points`],
                ["HABITS DONE", `${completed}/${total}`, "today"],
              ].map(([label, value, sub], i) => (
                <div className="panel insight-card reveal" style={{ "--i": i + 2 }} key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <span>{sub}</span>
                </div>
              ))}
            </section>
          )}

          {showOverview && (
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR LIFESTYLE</p>
                  <h2>Daily Metrics</h2>
                </div>
                <span className="muted-text">Your five key areas</span>
              </div>

              <div className="metrics-grid">
                {metrics.map((metric, i) => (
                  <div
                    className={`metric-card reveal ${metric.type}`}
                    style={{ "--i": i + 2 }}
                    key={metric.name}
                  >
                    <div className="metric-top">
                      <span className="metric-icon">{metric.icon}</span>
                      <span className="metric-trend">{metric.trend}</span>
                    </div>
                    <h3>{metric.name}</h3>
                    <div className="metric-value">{metric.value}</div>
                    <p>{metric.unit}</p>
                    <div className="metric-decoration" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {(showHabits || showFuture) && (
            <section className={`lower-grid ${showHabits && showFuture ? "" : "single"}`}>
              {showHabits && (
                <div className="panel habits-panel reveal" style={{ "--i": 3 }}>
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
                    <span style={{ width: `${shownScore}%` }} />
                  </div>

                  <div className="habit-list">
                    {habits.length === 0 && (
                      <p className="empty-state">No habits yet. Add your first one below ✦</p>
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
                          <span className={`habit-text ${habit.completed ? "habit-done" : ""}`}>
                            {habit.name}
                            <small className={`cat cat-${habit.category.toLowerCase()}`}>
                              {habit.category}
                            </small>
                          </span>
                          <span className={`habit-status ${habit.completed ? "is-done" : ""}`}>
                            {habit.completed ? "Completed" : "Pending"}
                          </span>
                        </label>
                        <button
                          className="habit-delete"
                          onClick={() => deleteHabit(habit.id)}
                          aria-label={`Delete ${habit.name}`}
                          title="Delete habit"
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
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        aria-label="Category"
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
                    <button className="add-habit-button" onClick={() => setShowInput(true)}>
                      + &nbsp; Add a new habit
                    </button>
                  )}
                </div>
              )}

              {showFuture && (
                <div className="panel future-panel reveal" style={{ "--i": 4 }}>
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

                  <p className="disclaimer">Illustrative what-if scenario, not a prediction.</p>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="footer">
          <span>futr. &nbsp; Your future is built today.</span>
          <span>One day at a time ✦</span>
        </footer>
      </main>

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

export default App;