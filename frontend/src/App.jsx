import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import "./App.css";
import "./Nutrition.css";
import FutureReport from "./Futurereport.jsx";
import Loader from "./Loader";


/* ─────────────── NATIVE PLUGIN ─────────────── */

const Steps = registerPlugin("Steps");

/* ─────────────── CONSTANTS ─────────────── */

const HABITS_KEY = "futr.habits.v2";
const METRICS_KEY = "futr.metrics.v2";
const THEME_KEY = "futr.theme.v1";
const CATEGORIES = ["Learning", "Personal", "Fitness", "Health"];
function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TODAY = toLocalISODate(new Date());
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const NUTRITION_CHECKS_KEY = "futr.nutrition.checks.v1";
{/* <button
  className="nutrition-toggle-btn"
  onClick={() => setIsExpanded(!isExpanded)}
>
  {isExpanded ? "Collapse ▲" : "Expand ▼"}
</button> */}
const METRIC_DEFS = [
  { id: "sleep", icon: "☾", name: "Sleep", unit: "hours", step: 0.5, max: 24, placeholder: "7.5" },
  { id: "steps", icon: "👟", name: "Steps", unit: "steps", step: 100, max: 50000, placeholder: "6000" },
  { id: "mindfulness", icon: "❋", name: "Mindfulness", unit: "minutes", step: 5, max: 180, placeholder: "20" },
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
    iso: toLocalISODate(d),
    label: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
});

const TABS = [
  ["◫", "Today"],
  ["◉", "Metrics"],
  ["▦", "Analytics"],
  ["✦", "Future"],
];
const MINDFULNESS_SESSION_KEY = "futr.mindfulness.session.v1";
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

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || `API Error: ${response.status}`);
  }

  return data;
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

function MindfulnessTimer({ onComplete }) {
  const [showSetup, setShowSetup] = useState(false);
  const [targetInput, setTargetInput] = useState("10");
  const [clock, setClock] = useState(Date.now());

  const [session, setSession] = useState(() => {
    const saved = loadJSON(MINDFULNESS_SESSION_KEY, null);
    if (!saved || saved.date !== TODAY) return null;
    return saved;
  });

  // Save active session in localStorage
  useEffect(() => {
    if (session) {
      saveJSON(MINDFULNESS_SESSION_KEY, session);
    } else {
      localStorage.removeItem(MINDFULNESS_SESSION_KEY);
    }
  }, [session]);

  // Update timer every second
  useEffect(() => {
    if (!session || session.paused) return;

    const interval = setInterval(() => {
      setClock(Date.now());
    }, 250);

    return () => clearInterval(interval);
  }, [session]);

  const elapsedSeconds = session
    ? session.elapsedSeconds +
      (session.paused
        ? 0
        : Math.max(0, Math.floor((clock - session.startedAt) / 1000)))
    : 0;

  const targetSeconds = session
    ? session.targetMinutes * 60
    : 0;

  const remainingSeconds = Math.max(
    0,
    targetSeconds - elapsedSeconds
  );

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const finishSession = (seconds) => {
    const minutes = Math.round((seconds / 60) * 10) / 10;

    if (minutes > 0) {
      onComplete(minutes);
    }

    setSession(null);
  };

  // Automatically finish when target is reached
  useEffect(() => {
    if (
      session &&
      !session.paused &&
      elapsedSeconds >= targetSeconds
    ) {
      finishSession(targetSeconds);
    }
  }, [elapsedSeconds, targetSeconds, session]);

  const startSession = (e) => {
    e.preventDefault();

    const target = Number(targetInput);

    if (!Number.isFinite(target) || target < 1 || target > 180) {
      return;
    }

    setSession({
      date: TODAY,
      targetMinutes: target,
      elapsedSeconds: 0,
      startedAt: Date.now(),
      paused: false,
    });

    setClock(Date.now());
    setShowSetup(false);
  };

  const pauseSession = () => {
    setSession((current) => {
      if (!current || current.paused) return current;

      const elapsed =
        current.elapsedSeconds +
        Math.max(
          0,
          Math.floor((Date.now() - current.startedAt) / 1000)
        );

      return {
        ...current,
        elapsedSeconds: elapsed,
        paused: true,
      };
    });
  };


  const resumeSession = () => {
    setSession((current) => {
      if (!current || !current.paused) return current;

      return {
        ...current,
        startedAt: Date.now(),
        paused: false,
      };
    });

    setClock(Date.now());
  };

  const progress = session
    ? Math.min(100, (elapsedSeconds / targetSeconds) * 100)
    : 0;

  return (
    <>
      <section className="panel mindfulness-session-panel reveal">

        <div className="mindfulness-session-heading">
          <div>
            <p className="eyebrow">
              SLOW DOWN · RESET · REFRESH
            </p>

            <h2>Mindfulness Session</h2>

            <p className="mindfulness-subtitle">
              Take a little time for yourself.
            </p>
          </div>

          <span className="mindfulness-session-icon">❋</span>
        </div>

        {session ? (
          <div className="mindfulness-active">

            <div className="mindfulness-timer">
              {formatTime(remainingSeconds)}
            </div>

            <p className="mindfulness-timer-label">
              {session.paused
                ? "Session paused"
                : "Breathe. Stay present."}
            </p>

            <div className="mindfulness-progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="mindfulness-session-info">
              <span>
                Target: {session.targetMinutes} min
              </span>

              <span>
                Elapsed: {formatTime(elapsedSeconds)}
              </span>
            </div>

            <div className="mindfulness-actions">

              {session.paused ? (
                <button onClick={resumeSession}>
                  Resume
                </button>
              ) : (
                <button onClick={pauseSession}>
                  Pause
                </button>
              )}

              <button
                className="mindfulness-end-btn"
                onClick={() => finishSession(elapsedSeconds)}
              >
                End session
              </button>

            </div>
          </div>
        ) : (
          
          <div className="mindfulness-start-area">
          
            <div className="mindfulness-start-content">
              <span className="mindfulness-kicker">
                ✦ YOUR DAILY RESET
              </span>
          
              <h3>Find your moment of calm.</h3>
          
              <p>
                Slow down, clear your thoughts and give yourself
                a peaceful break from the day.
              </p>
          
              <div className="mindfulness-benefits">
                <span>✧ Reduce stress</span>
                <span>✧ Improve focus</span>
                <span>✧ Feel refreshed</span>
              </div>
          
              <button
                className="mindfulness-start-btn"
                onClick={() => setShowSetup(true)}
              >
                <span>▶</span> Start Session
                <span className="mindfulness-btn-arrow">→</span>
              </button>
            </div>
          
            <div className="mindfulness-breathing-visual">
              <div className="breathing-orbit orbit-one"></div>
              <div className="breathing-orbit orbit-two"></div>
              <div className="breathing-core">
                <span>❋</span>
                <small>BREATHE</small>
              </div>
              <p>INHALE · EXHALE</p>
            </div>
          
          </div>

        )}

      </section>

      {showSetup && (
        <div
          className="mindfulness-modal-overlay"
          onClick={() => setShowSetup(false)}
        >
          <div
            className="mindfulness-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="mindfulness-modal-close"
              onClick={() => setShowSetup(false)}
            >
              ×
            </button>

            <span className="mindfulness-modal-icon">❋</span>

            <p className="eyebrow">
              YOUR MOMENT OF CALM
            </p>

            <h2>Set your intention.</h2>

            <p>
              How many minutes would you like to meditate?
            </p>

            <form onSubmit={startSession}>

              <div className="mindfulness-target-input">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={targetInput}
                  onChange={(e) =>
                    setTargetInput(e.target.value)
                  }
                  required
                />

                <span>minutes</span>
              </div>

              <div className="mindfulness-presets">
                {[5, 10, 15, 20, 30].map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    className={
                      Number(targetInput) === minutes
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setTargetInput(String(minutes))
                    }
                  >
                    {minutes}
                  </button>
                ))}
              </div>

              <button
                className="mindfulness-confirm-btn"
                type="submit"
              >
                Begin meditation →
              </button>

            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────── NUTRITION ─────────────── */

const NUTRITION_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUTRITION_MEALS = ["Breakfast", "Lunch", "Evening Meal", "Snacks"];

function getCurrentWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  const offset = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - offset);
  monday.setHours(0, 0, 0, 0);

  return NUTRITION_DAYS.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { day, iso: toLocalISODate(date), shortDate: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) };
  });
}


function Heatmap({ habits }) {
  const today = new Date();

  const days = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (364 - index));

    const dateKey = toLocalISODate(date);

    // Today's completion count comes from current habits.
    const count =
      dateKey === TODAY
        ? habits.filter((habit) => habit.completed).length
        : 0;

    return {
      date: dateKey,
      count,
    };
  });

  const getLevel = (count) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  };

  const activeDays = days.filter((day) => day.count > 0).length;

  return (
    <section className="heatmap-section">
      <div className="heatmap-header">
        <div>
          <h3>Consistency Map</h3>
          <p>Your daily habit activity over the last year</p>
        </div>
        <span>{activeDays} active days</span>
      </div>

      <div className="heatmap-grid">
        {days.map((day) => (
          <div
            key={day.date}
            className={`heatmap-cell level-${getLevel(day.count)}`}
            title={`${day.date}: ${day.count} habits completed`}
          />
        ))}
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`heatmap-cell level-${level}`}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}




function NutritionSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  const weekDates = getCurrentWeekDates();

  const todayIndex = Math.max(
    0,
    weekDates.findIndex((item) => item.iso === TODAY)
  );

  const [selectedDay, setSelectedDay] = useState(
    NUTRITION_DAYS[todayIndex]
  );

  const [plan, setPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [planSource, setPlanSource] = useState("upload");

  const [checks, setChecks] = useState(() =>
    loadJSON(NUTRITION_CHECKS_KEY, {})
  );

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showGenerator, setShowGenerator] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [preferences, setPreferences] = useState({
    age: "",
    goal: "muscle_gain",
    diet_preference: "vegetarian",
    activity_level: "moderate",
    allergies: "",
    budget_per_day: "",
    cuisine_preference: "Indian",
  });

  useEffect(() => {
    saveJSON(NUTRITION_CHECKS_KEY, checks);
  }, [checks]);

  // LOAD SAVED PLAN
  useEffect(() => {
    let active = true;

    const loadSavedPlan = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/nutrition/plans/`
        );

        if (!response.ok) {
          throw new Error(
            `Could not load saved diet plans (${response.status})`
          );
        }

        const plans = await response.json();

        if (
          !active ||
          !Array.isArray(plans) ||
          plans.length === 0
        ) {
          return;
        }

        const latest = plans[plans.length - 1];

        setPlan({
          name: latest.name,
          description: latest.description || "",
          meals: latest.meals || [],
        });

        setPlanId(latest.id);
        setPlanSource(latest.source || "upload");
      } catch (err) {
        console.error("Nutrition plan load failed:", err);
      }
    };

    loadSavedPlan();

    return () => {
      active = false;
    };
  }, []);

  const selectedDate =
    weekDates.find((item) => item.day === selectedDay) ||
    weekDates[todayIndex];

  const dayMeals =
    plan?.meals?.filter(
      (meal) =>
        String(meal.day).toLowerCase() ===
        selectedDay.toLowerCase()
    ) || [];

  const completionKey = (meal, index) =>
    `${selectedDate.iso}:${meal.id ?? `${meal.meal_type}-${index}`}`;

  const completedCount = dayMeals.filter((meal, index) =>
    Boolean(checks[completionKey(meal, index)])
  ).length;

  // UPDATE MEAL
  const updateMeal = (index, field, value) => {
    setPlan((current) => ({
      ...current,
      meals: current.meals.map((meal, mealIndex) =>
        mealIndex === index
          ? { ...meal, [field]: value }
          : meal
      ),
    }));
  };

  // UPDATE AI PREFERENCES
  const updatePreference = (field, value) => {
    setPreferences((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // GENERATE AI DIET PLAN
  const generateDietPlan = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !preferences.age ||
      Number(preferences.age) < 18 ||
      Number(preferences.age) > 100
    ) {
      setError("Please enter a valid age between 18 and 100.");
      return;
    }

    setGenerating(true);

    try {
      const payload = {
        ...preferences,
        age: Number(preferences.age),
        budget_per_day:
          preferences.budget_per_day === ""
            ? null
            : Number(preferences.budget_per_day),
      };

      const response = await fetch(
        `${API_BASE}/nutrition/generate/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            "AI diet generation failed."
        );
      }

      const generated = result.diet_plan;

      if (
        !generated ||
        !Array.isArray(generated.meals) ||
        generated.meals.length === 0
      ) {
        throw new Error(
          "Gemini did not return a valid meal plan."
        );
      }

      setPlan({
        name:
          generated.plan_name ||
          "AI Generated Weekly Diet Plan",
        description: generated.description || "",
        meals: generated.meals.map((meal) => ({
          ...meal,
        })),
      });

      setPlanId(null);
      setPlanSource("ai");

      setShowGenerator(false);
      setSelectedDay(NUTRITION_DAYS[todayIndex]);

      setMessage(
        `AI generated ${generated.meals.length} meals successfully. Review and save your plan.`
      );
    } catch (err) {
      setError(
        err.message || "Unable to generate diet plan."
      );
    } finally {
      setGenerating(false);
    }
  };

  // PDF UPLOAD AND EXTRACTION
  const uploadAndExtract = async (event) => {
    event.preventDefault();

    if (!file) {
      setError("Choose your weekly diet PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("Sending PDF to Gemini for diet extraction...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE}/nutrition/extract-pdf/`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            "Diet extraction failed."
        );
      }

      const extracted = result.diet_plan;

      if (
        !extracted ||
        !Array.isArray(extracted.meals)
      ) {
        throw new Error(
          "Gemini response did not contain a valid meal list."
        );
      }

      setPlan({
        name:
          extracted.plan_name ||
          file.name.replace(/\.pdf$/i, ""),
        description: extracted.description || "",
        meals: extracted.meals.map((meal) => ({
          ...meal,
        })),
      });

      setPlanId(null);
      setPlanSource("upload");

      setSelectedDay(NUTRITION_DAYS[todayIndex]);

      setMessage(
        `Extracted ${extracted.meals.length} meal entries. Review and edit them, then save your plan.`
      );
    } catch (err) {
      setError(
        err.message || "Unable to extract this PDF."
      );

      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  // SAVE OR UPDATE PLAN
  const savePlan = async () => {
    if (!plan || !plan.meals.length) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name:
          plan.name?.trim() ||
          "My Weekly Diet Plan",

        source: planSource,

        description: plan.description || "",

        meals: plan.meals.map(
          ({ day, meal_type, meal_name, food_items }) => ({
            day,
            meal_type,
            meal_name,
            food_items: food_items || "",
          })
        ),
      };

      const url = planId
        ? `${API_BASE}/nutrition/plans/${planId}`
        : `${API_BASE}/nutrition/plans/`;

      const response = await fetch(url, {
        method: planId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Could not save the diet plan."
        );
      }

      setPlan({
        name: result.name,
        description: result.description || "",
        meals: result.meals || plan.meals,
      });

      setPlanId(result.id);
      setPlanSource(result.source || planSource);

      setMessage(
        "Your weekly diet plan has been saved."
      );
    } catch (err) {
      setError(
        err.message || "Could not save the diet plan."
      );
    } finally {
      setSaving(false);
    }
  };

  // MARK MEAL COMPLETE
  const toggleMeal = (meal, index, checked) => {
    const key = completionKey(meal, index);

    setChecks((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  return (
    <section className="panel nutrition-panel reveal">

      {/* HEADER */}
      <div className="nutrition-header">
        <div>
          <p className="eyebrow">FUEL YOUR DAY</p>
          <h2>Weekly Nutrition  🥗</h2>
          <p className="nutrition-subtitle">
            Your diet, one meal at a time.
          </p>
        </div>

        <div className="nutrition-header-actions">
          <span className="nutrition-icon">✳</span>

          <button
            type="button"
            className="nutrition-toggle-btn"
            onClick={() =>
              setIsExpanded((prev) => !prev)
            }
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Collapse ▲" : "Expand ▼"}
          </button>
        </div>
      </div>

      {/* EXPANDABLE CONTENT */}
      {isExpanded && (
        <div className="nutrition-content">

          {/* AI GENERATOR BUTTON */}
          <div className="nutrition-ai-header">
            <div>
              <h3>AI Diet Generator</h3>
              <p>
                Create a personalized 7-day meal plan with Gemini.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGenerator((prev) => !prev);
                setError("");
                setMessage("");
              }}
              disabled={generating}
            >
              {showGenerator
                ? "Close Generator"
                : "✦ Generate with AI"}
            </button>
          </div>

          {/* AI PREFERENCES FORM */}
          {showGenerator && (
            <form
              className="nutrition-generator-form"
              onSubmit={generateDietPlan}
            >
              <h3>Your Diet Preferences</h3>

              <div className="nutrition-form-grid">

                <label>
                  Age
                  <input
                    type="number"
                    min="18"
                    max="100"
                    required
                    value={preferences.age}
                    onChange={(event) =>
                      updatePreference(
                        "age",
                        event.target.value
                      )
                    }
                    placeholder="Enter your age"
                  />
                </label>

                <label>
                  Goal
                  <select
                    value={preferences.goal}
                    onChange={(event) =>
                      updatePreference(
                        "goal",
                        event.target.value
                      )
                    }
                  >
                    <option value="weight_loss">
                      Weight Loss
                    </option>
                    <option value="muscle_gain">
                      Muscle Gain
                    </option>
                    <option value="maintain_weight">
                      Maintain Weight
                    </option>
                    <option value="balanced_diet">
                      Balanced Diet
                    </option>
                  </select>
                </label>

                <label>
                  Diet Preference
                  <select
                    value={preferences.diet_preference}
                    onChange={(event) =>
                      updatePreference(
                        "diet_preference",
                        event.target.value
                      )
                    }
                  >
                    <option value="vegetarian">
                      Vegetarian
                    </option>
                    <option value="vegan">
                      Vegan
                    </option>
                    <option value="eggetarian">
                      Eggetarian
                    </option>
                    <option value="non_vegetarian">
                      Non-Vegetarian
                    </option>
                  </select>
                </label>

                <label>
                  Activity Level
                  <select
                    value={preferences.activity_level}
                    onChange={(event) =>
                      updatePreference(
                        "activity_level",
                        event.target.value
                      )
                    }
                  >
                    <option value="low">
                      Low
                    </option>
                    <option value="moderate">
                      Moderate
                    </option>
                    <option value="high">
                      High
                    </option>
                  </select>
                </label>

                <label>
                  Daily Budget (₹)
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={preferences.budget_per_day}
                    onChange={(event) =>
                      updatePreference(
                        "budget_per_day",
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                  />
                </label>

                <label>
                  Cuisine Preference
                  <input
                    type="text"
                    value={preferences.cuisine_preference}
                    onChange={(event) =>
                      updatePreference(
                        "cuisine_preference",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Indian"
                  />
                </label>

                <label className="nutrition-full-width">
                  Allergies / Foods to Avoid
                  <textarea
                    rows={2}
                    value={preferences.allergies}
                    onChange={(event) =>
                      updatePreference(
                        "allergies",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Peanuts, lactose..."
                  />
                </label>

              </div>

              <button
                type="submit"
                disabled={generating}
              >
                {generating
                  ? "✦ Generating your diet..."
                  : "Generate 7-Day Diet Plan"}
              </button>
            </form>
          )}

          {/* PDF UPLOAD */}
          <form
            className="nutrition-upload"
            onSubmit={uploadAndExtract}
          >
            <label className="nutrition-file-label">
              <span>＋ Upload weekly diet PDF</span>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  setFile(
                    event.target.files?.[0] || null
                  );
                  setError("");
                  setMessage("");
                }}
              />
            </label>

            <span className="nutrition-file-name">
              {file ? file.name : "PDF only"}
            </span>

            <button
              type="submit"
              disabled={loading || !file}
            >
              {loading
                ? "Extracting..."
                : "Extract with Gemini"}
            </button>
          </form>

          {/* STATUS */}
          {message && (
            <p className="nutrition-message">
              {message}
            </p>
          )}

          {error && (
            <p className="nutrition-error">
              {error}
            </p>
          )}

          {/* DIET PLAN */}
          {plan ? (
            <>

              <div className="nutrition-plan-heading">
                <div>
                  <label htmlFor="nutrition-plan-name">
                    DIET PLAN NAME
                  </label>

                  <input
                    id="nutrition-plan-name"
                    value={plan.name || ""}
                    onChange={(event) =>
                      setPlan((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />

                  <small>
                    Source:{" "}
                    {planSource === "ai"
                      ? "AI Generated"
                      : "PDF Upload"}
                  </small>
                </div>

                <button
                  type="button"
                  className="nutrition-save-btn"
                  onClick={savePlan}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : planId
                    ? "Update plan"
                    : "Save diet plan"}
                </button>
              </div>

              {/* DAY TABS */}
              <div className="nutrition-day-tabs">
                {weekDates.map(({ day, shortDate }) => (
                  <button
                    type="button"
                    key={day}
                    className={
                      selectedDay === day ? "active" : ""
                    }
                    onClick={() => setSelectedDay(day)}
                  >
                    <span>{day.slice(0, 3)}</span>
                    <small>{shortDate}</small>
                  </button>
                ))}
              </div>

              {/* SELECTED DAY */}
              <div className="nutrition-day-heading">
                <div>
                  <h3>{selectedDay}</h3>
                  <span>{selectedDate.shortDate}</span>
                </div>

                <span className="nutrition-progress">
                  {completedCount}/{dayMeals.length} meals done
                </span>
              </div>

              {/* MEALS TABLE */}
              {dayMeals.length > 0 ? (
                <div className="nutrition-table-wrap">
                  <table className="nutrition-table">
                    <thead>
                      <tr>
                        <th>Meal</th>
                        <th>Food / Diet</th>
                        <th>Done</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dayMeals.map((meal, index) => {
                        const originalIndex =
                          plan.meals.indexOf(meal);

                        const key = completionKey(
                          meal,
                          index
                        );

                        return (
                          <tr
                            key={
                              meal.id ??
                              `${meal.day}-${meal.meal_type}-${index}`
                            }
                            className={
                              checks[key]
                                ? "meal-completed"
                                : ""
                            }
                          >
                            <td>
                              <input
                                aria-label={`${meal.meal_type} meal type`}
                                className="nutrition-meal-type"
                                value={meal.meal_type || ""}
                                onChange={(event) =>
                                  updateMeal(
                                    originalIndex,
                                    "meal_type",
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                aria-label={`${meal.meal_type} meal name`}
                                className="nutrition-meal-name"
                                value={meal.meal_name || ""}
                                onChange={(event) =>
                                  updateMeal(
                                    originalIndex,
                                    "meal_name",
                                    event.target.value
                                  )
                                }
                                placeholder="Meal name"
                              />

                              <textarea
                                aria-label="Food items"
                                value={meal.food_items || ""}
                                onChange={(event) =>
                                  updateMeal(
                                    originalIndex,
                                    "food_items",
                                    event.target.value
                                  )
                                }
                                placeholder="Food items"
                                rows={2}
                              />
                            </td>

                            <td className="nutrition-check-cell">
                              <input
                                type="checkbox"
                                checked={Boolean(checks[key])}
                                onChange={(event) =>
                                  toggleMeal(
                                    meal,
                                    index,
                                    event.target.checked
                                  )
                                }
                                aria-label={`Mark ${meal.meal_type} complete`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="nutrition-empty-day">
                  No meals found for {selectedDay}.
                  You can add meals after extraction or
                  check your uploaded plan.
                </div>
              )}

            </>
          ) : (
            <div className="nutrition-empty">
              <span>🥗</span>
              <h3>Your weekly diet starts here</h3>
              <p>
                Generate a personalized diet with AI or
                upload your weekly diet PDF. Review,
                edit and save your plan.
              </p>
            </div>
          )}

        </div>
      )}
    </section>
  );
}



/* ─────────────── MAIN APP ─────────────── */

export default function App() {
  const now = new Date();
  const hour = now.getHours();

  const [habits, setHabits] = useState([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [habitsError, setHabitsError] = useState("");
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const startTime = Date.now();

    const loadData = async () => {
    try {
        const [habitsData, logsData] = await Promise.all([
          apiRequest("/habits/"),
          apiRequest("/habit-logs/"),
        ]);

        setHabits(habitsData);
        setHabitLogs(logsData);
      } catch (error) {
        setHabitsError(error.message);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 3500 - elapsed);

        setTimeout(() => {
          setShowLoader(false);
          setHabitsLoading(false);
        }, remaining);
      }
    };

    loadData();
  }, []);

  const [habitLogs, setHabitLogs] = useState([]);
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

  // Subtle mouse-follow glow (desktop only)
  useEffect(() => {
    const moveCursor = (e) => {
      if (e.pointerType !== "mouse") return;

      document.documentElement.style.setProperty(
        "--cursor-x",
        `${e.clientX}px`
      );

      document.documentElement.style.setProperty(
        "--cursor-y",
        `${e.clientY}px`
      );

      document.documentElement.classList.add("cursor-active");
    };

    const hideCursor = () => {
      document.documentElement.classList.remove("cursor-active");
    };

    window.addEventListener("pointermove", moveCursor);
    document.addEventListener("mouseleave", hideCursor);

    return () => {
      window.removeEventListener("pointermove", moveCursor);
      document.removeEventListener("mouseleave", hideCursor);
      document.documentElement.classList.remove("cursor-active");
    };
  }, []);

  // Load habits and today's completion status from backend
  useEffect(() => {
    let active = true;
  
    async function loadHabits() {
      try {
        setHabitsLoading(true);
        setHabitsError("");
  
        const [habitList, logs] = await Promise.all([
          apiRequest("/habits/"),
          apiRequest("/habit-logs/"),
        ]);
        setHabitLogs(logs);

        if (!active) return;
  
        const todayLogs = {};
  
        logs.forEach((log) => {
          if (log.log_date === TODAY) {
            todayLogs[log.habit_id] = log.completed;
          }
        });
  
        setHabits(
          habitList.map((habit) => ({
            ...habit,
            completed: Boolean(todayLogs[habit.id]),
          }))
        );
      } catch (error) {
        if (active) {
          setHabitsError(error.message);
          console.error("Habit loading failed:", error);
        }
      } finally {
        if (active) {
          setHabitsLoading(false);
        }
      }
    }
  
    loadHabits();
  
    return () => {
      active = false;
    };
  }, []);

  // Native phone step count
  const [nativeSteps, setNativeSteps] = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // useEffect(() => {
  //   saveJSON(HABITS_KEY, habits);
  // }, [habits]);

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
        const date = result.date || TODAY;

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

  
  const toggleHabit = async (id) => {
    const habit = habits.find((h) => h.id === id);
  
    if (!habit) return;
  
    const nextCompleted = !habit.completed;
  
    try {
      await apiRequest("/habit-logs/daily", {
        method: "PUT",
        body: JSON.stringify({
          habit_id: id,
          log_date: TODAY,
          completed: nextCompleted,
        }),
      });
  
      setHabits((cur) =>
        cur.map((h) =>
          h.id === id
            ? { ...h, completed: nextCompleted }
            : h
        )
      );
      setHabitLogs((current) => {
        const existing = current.find(
          (log) =>
            log.habit_id === id &&
            log.log_date === TODAY
        );

        if (existing) {
          return current.map((log) =>
            log.habit_id === id && log.log_date === TODAY
              ? { ...log, completed: nextCompleted }
              : log
          );
        }

        return [
          ...current,
          {
            habit_id: id,
            log_date: TODAY,
            completed: nextCompleted,
          },
        ];
      });
    } catch (error) {
      console.error("Habit update failed:", error);
      setHabitsError(error.message);
    }
  };



  const deleteHabit = async (id) => {
    try {
      await apiRequest(`/habits/${id}`, {
        method: "DELETE",
      });
  
      setHabits((cur) => cur.filter((h) => h.id !== id));
      setHabitsError("");
    } catch (error) {
      console.error("Habit deletion failed:", error);
      setHabitsError(error.message);
    }
  };


  
  const addHabit = async (e) => {
    e.preventDefault();
  
    if (!newHabit.trim()) return;
  
    try {
      const createdHabit = await apiRequest("/habits/", {
        method: "POST",
        body: JSON.stringify({
          name: newHabit.trim(),
          category: newCat,
          description: "",
        }),
      });
  
      setHabits((cur) => [
        ...cur,
        {
          ...createdHabit,
          completed: false,
        },
      ]);
  
      setNewHabit("");
      setShowInput(false);
      setHabitsError("");
    } catch (error) {
      console.error("Habit creation failed:", error);
      setHabitsError(error.message);
    }
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
      return WEEKLY_DAYS.map((day) => {
        if (habits.length === 0) return 0;
    
        const completedCount = habitLogs.filter(
          (log) =>
            log.log_date === day.iso &&
            log.completed
        ).length;
    
        return Math.round(
          (completedCount / habits.length) * 100
        );
      });
    }, [habitLogs, habits.length]);

    const trendUp = weekly[6] >= weekly[5];
    const metricsWithData = METRIC_DEFS.filter((m) => {
      const value = metrics[m.id]?.history?.[TODAY];
      return value !== undefined && value !== null && value !== "";
    }).length;
    const metricsAchieved = METRIC_DEFS.filter((m) => {
      const target = metrics[m.id]?.target;
      const value =
        m.id === "steps" && nativeSteps !== null
          ? nativeSteps
          : metrics[m.id]?.history?.[TODAY];
      return target && value != null && value >= target;
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

  if (showLoader) {
    return <Loader />;
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="cursor-glow" />
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

              <NutritionSection />

              <MindfulnessTimer
                onComplete={(minutes) => {
                  setMetrics((current) => {
                    const previous =
                      current.mindfulness.history[TODAY] ?? 0;
              
                    return {
                      ...current,
                      mindfulness: {
                        ...current.mindfulness,
                        history: {
                          ...current.mindfulness.history,
                          [TODAY]: Math.round(
                            (previous + minutes) * 10
                          ) / 10,
                        },
                      },
                    };
                  });
                }}
              />

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
              {/* CONSISTENCY MAP — BOTTOM OF TODAY */}
              <Heatmap habits={habits} />
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

          {/* FUTURE REPORT TAB */}

          {activeTab === "Future" && (
            <FutureReport apiRequest={apiRequest} />
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