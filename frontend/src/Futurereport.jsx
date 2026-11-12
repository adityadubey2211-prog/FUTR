import { useEffect, useRef, useState } from "react";
import "./Futurereport.css";
/* ─────────────── CONSTANTS ─────────────── */

const STORAGE_KEY = "futr.futurereport.v1";
const GOAL_MIN = 10;
const GOAL_MAX = 300; // matches FutureReport.goal String(300) in the backend model
const EXAMPLE_GOAL =
  "Become a successful software engineer with a 30 LPA package within 3 years.";

const LOADING_STEPS = [
  "Reading your habit history…",
  "Measuring your consistency…",
  "Mapping your goal into skills and milestones…",
  "Building your 36-month timeline…",
  "Writing your 7-day plan…",
  "Drafting the letter from your future self…",
];

const NAV = [
  ["overview", "Overview"],
  ["personality", "Habit Personality"],
  ["mindmap", "Mind Map"],
  ["timeline", "Timeline"],
  ["gaps", "Gap Analysis"],
  ["roadmap", "Roadmap"],
  ["week", "7-Day Plan"],
  ["letter", "Letter"],
];

const ROADMAP_ORDER = ["short_term", "medium_term", "long_term"];
const ROADMAP_LABELS = {
  short_term: "Short term",
  medium_term: "Medium term",
  long_term: "Long term",
};

/* ─────────────── SAFE HELPERS ─────────────── */

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const asText = (v) =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";

const asList = (v) =>
  Array.isArray(v)
    ? v.filter((x) => x !== null && x !== undefined && x !== "")
    : [];

const asTextList = (v) => asList(v).map(asText).filter(Boolean);

const asNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmtPct = (n) => `${Math.round(n * 10) / 10}%`;

function level(value) {
  const v = asText(value).toLowerCase();
  return ["high", "medium", "low"].includes(v) ? v : "none";
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Splits text into at most `maxLines` lines of roughly `width` characters.
function wrapLines(text, width, maxLines) {
  const words = asText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = truncate(`${kept[maxLines - 1]}…`, width);
    return kept;
  }
  return lines;
}

// The backend stores created_at with server_default now(); a value without a
// timezone designator is UTC, so mark it as such before parsing.
function formatDate(value) {
  const s = asText(value);
  if (!s) return "";
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
  const d = new Date(hasZone ? s : `${s.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isObj(parsed) && isObj(parsed.result) && isObj(parsed.result.report)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function saveReport(goal, result) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ goal, result }));
  } catch {}
}

function friendlyError(err) {
  const message = err?.message || "";

  if (err instanceof TypeError || /failed to fetch|networkerror/i.test(message)) {
    return "Cannot reach the FUTR server. Check that the backend is running and VITE_API_BASE_URL is correct.";
  }
  if (!message || message.includes("[object Object]")) {
    return "The server rejected the request. Please check your goal and try again.";
  }
  return message;
}

/* ─────────────── SMALL UI PIECES ─────────────── */

function Section({ id, eyebrow, title, empty, children }) {
  return (
    <section className="fr-section" id={`fr-${id}`}>
      <header className="fr-section-head">
        <p className="fr-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </header>

      {empty ? (
        <p className="fr-empty">This section was not included in the report.</p>
      ) : (
        children
      )}
    </section>
  );
}

function Pill({ label, value }) {
  const text = asText(value);
  if (!text) return null;
  return (
    <span className={`fr-pill fr-pill--${level(text)}`}>
      {label ? `${label}: ` : ""}
      {text}
    </span>
  );
}

function BulletList({ items }) {
  const list = asTextList(items);
  if (list.length === 0) return null;
  return (
    <ul className="fr-list">
      {list.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Meter({ value }) {
  const n = asNum(value);
  if (n === null) return <span className="fr-meter-empty">No data</span>;
  const width = Math.max(0, Math.min(100, n));
  return (
    <div className="fr-meter">
      <div className="fr-meter-track">
        <span style={{ width: `${width}%` }} />
      </div>
      <b>{fmtPct(n)}</b>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="fr-stat">
      <small>{label}</small>
      <strong>{value}</strong>
      {note && <span>{note}</span>}
    </div>
  );
}

/* ─────────────── OVERVIEW ─────────────── */

function Overview({ result }) {
  const reality = isObj(result.current_reality) ? result.current_reality : {};
  const summary = isObj(result.habit_summary) ? result.habit_summary : {};

  const performance = asList(
    reality.habit_performance ?? summary.habit_performance
  ).filter(isObj);

  const created = formatDate(result.created_at);

  const totalHabits = asNum(reality.total_habits ?? summary.total_habits);
  const consistency7 = asNum(reality.overall_consistency);
  const completed7 = asNum(reality.completed_days);
  const possible7 = asNum(summary.possible_entries_7_days);
  const recordedDays = asNum(reality.recorded_data_days ?? summary.recorded_data_days);

  const windows = [
    ["Last 7 days", summary.overall_consistency_7_days],
    ["Last 30 days", summary.overall_consistency_30_days],
    ["Last 90 days", summary.overall_consistency_90_days],
  ];

  const strongest = asText(reality.strongest_habit ?? summary.strongest_habit);
  const weakest = asText(reality.weakest_habit ?? summary.weakest_habit);

  return (
    <>
      <div className="fr-card fr-goal-card">
        <p className="fr-label">YOUR GOAL</p>
        <h3>{asText(result.goal) || "Goal not available"}</h3>

        <div className="fr-meta">
          {created && <span>Generated {created}</span>}
          {result.id !== undefined && result.id !== null && (
            <span>Report #{asText(result.id)}</span>
          )}
        </div>
      </div>

      <div className="fr-stats">
        {totalHabits !== null && (
          <Stat label="HABITS TRACKED" value={totalHabits} />
        )}
        {consistency7 !== null && (
          <Stat
            label="CONSISTENCY · 7 DAYS"
            value={fmtPct(consistency7)}
            note="Of recorded entries"
          />
        )}
        {completed7 !== null && (
          <Stat
            label="COMPLETED · 7 DAYS"
            value={completed7}
            note={possible7 !== null ? `of ${possible7} recorded entries` : undefined}
          />
        )}
        {recordedDays !== null && (
          <Stat
            label="DAYS WITH LOGS"
            value={recordedDays}
            note="Distinct dates recorded"
          />
        )}
      </div>

      <div className="fr-two-col">
        <div className="fr-card">
          <p className="fr-label">CONSISTENCY OVER TIME</p>
          <div className="fr-windows">
            {windows.map(([label, value]) => (
              <div className="fr-window-row" key={label}>
                <span>{label}</span>
                <Meter value={value} />
              </div>
            ))}
          </div>
          <p className="fr-note">
            Calculated only from days you actually logged, not from every
            calendar day.
          </p>
        </div>

        <div className="fr-card">
          <p className="fr-label">HABIT HIGHLIGHTS</p>
          <div className="fr-highlights">
            <div>
              <small>Strongest habit</small>
              <strong>{strongest || "Not enough data yet"}</strong>
            </div>
            <div>
              <small>Needs most attention</small>
              <strong>{weakest || "Not enough data yet"}</strong>
            </div>
          </div>
        </div>
      </div>

      {performance.length > 0 && (
        <div className="fr-card">
          <p className="fr-label">HABIT BREAKDOWN</p>

          <div className="fr-habit-table">
            {performance.map((habit, i) => {
              const r7 = asNum(habit.recorded_days_7);
              const r30 = asNum(habit.recorded_days_30);
              const r90 = asNum(habit.recorded_days_90);

              return (
                <div className="fr-habit-row" key={habit.habit_id ?? i}>
                  <div className="fr-habit-name">
                    <strong>{asText(habit.habit_name) || "Untitled habit"}</strong>
                    {asText(habit.category) && <small>{asText(habit.category)}</small>}
                  </div>

                  <div className="fr-habit-meters">
                    <div>
                      <small>7 days</small>
                      <Meter value={r7 ? habit.consistency_7_days : null} />
                    </div>
                    <div>
                      <small>30 days</small>
                      <Meter value={r30 ? habit.consistency_30_days : null} />
                    </div>
                    <div>
                      <small>90 days</small>
                      <Meter value={r90 ? habit.consistency_90_days : null} />
                    </div>
                  </div>

                  <div className="fr-habit-streaks">
                    <span>
                      Current streak <b>{asNum(habit.current_streak) ?? 0}</b>
                    </span>
                    <span>
                      Longest <b>{asNum(habit.longest_streak) ?? 0}</b>
                    </span>
                    <span>
                      Days done <b>{asNum(habit.recorded_completed_days) ?? 0}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────── HABIT PERSONALITY ─────────────── */

function Personality({ data }) {
  const traits = asList(data.traits).filter(isObj);
  const strengths = asTextList(data.strengths);
  const improve = asTextList(data.areas_to_improve);
  const limitations = asText(data.data_limitations);

  return (
    <>
      <div className="fr-card fr-feature">
        {asText(data.title) && <h3>{asText(data.title)}</h3>}
        {asText(data.summary) && <p>{asText(data.summary)}</p>}
      </div>

      {traits.length > 0 && (
        <div className="fr-grid fr-grid--3">
          {traits.map((trait, i) => (
            <article className="fr-card fr-hover" key={i}>
              <div className="fr-card-top">
                <h4>{asText(trait.name) || `Pattern ${i + 1}`}</h4>
                <Pill label="Confidence" value={trait.confidence} />
              </div>
              {asText(trait.description) && <p>{asText(trait.description)}</p>}
              {asText(trait.evidence) && (
                <p className="fr-evidence">
                  <b>Evidence:</b> {asText(trait.evidence)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {(strengths.length > 0 || improve.length > 0) && (
        <div className="fr-two-col">
          {strengths.length > 0 && (
            <div className="fr-card">
              <p className="fr-label">STRENGTHS</p>
              <BulletList items={strengths} />
            </div>
          )}
          {improve.length > 0 && (
            <div className="fr-card">
              <p className="fr-label">AREAS TO IMPROVE</p>
              <BulletList items={improve} />
            </div>
          )}
        </div>
      )}

      {limitations && (
        <div className="fr-callout">
          <b>Data limitations</b>
          <p>{limitations}</p>
        </div>
      )}
    </>
  );
}

/* ─────────────── GOAL MIND MAP ─────────────── */

const MAP = { w: 900, h: 560, cx: 450, cy: 280, rx: 335, ry: 205 };

function MindMap({ data }) {
  const branches = asList(data.branches).filter(isObj);
  const [selected, setSelected] = useState(0);

  const active = branches[Math.min(selected, branches.length - 1)] || null;
  const goalLines = wrapLines(data.central_goal, 17, 4);

  const nodes = branches.map((branch, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / branches.length;
    return {
      branch,
      i,
      x: MAP.cx + MAP.rx * Math.cos(angle),
      y: MAP.cy + MAP.ry * Math.sin(angle),
    };
  });

  return (
    <>
      {asText(data.description) && (
        <p className="fr-lead">{asText(data.description)}</p>
      )}

      {branches.length > 0 && (
        <div className="fr-card fr-map-card">
          <svg
            className="fr-map"
            viewBox={`0 0 ${MAP.w} ${MAP.h}`}
            role="img"
            aria-label="Goal mind map"
          >
            <defs>
              <radialGradient id="frCore" cx="50%" cy="40%" r="70%">
                <stop offset="0%" style={{ stopColor: "var(--accent-2)" }} />
                <stop offset="100%" style={{ stopColor: "var(--accent-strong)" }} />
              </radialGradient>
            </defs>

            {nodes.map(({ x, y, i }) => (
              <line
                key={`l${i}`}
                x1={MAP.cx}
                y1={MAP.cy}
                x2={x}
                y2={y}
                className={`fr-map-line ${selected === i ? "is-active" : ""}`}
              />
            ))}

            <circle cx={MAP.cx} cy={MAP.cy} r="92" className="fr-map-halo" />
            <circle cx={MAP.cx} cy={MAP.cy} r="78" fill="url(#frCore)" />
            <text
              x={MAP.cx}
              y={MAP.cy - 36 - (goalLines.length - 1) * 6}
              textAnchor="middle"
              className="fr-map-core-label"
            >
              YOUR GOAL
            </text>
            {goalLines.map((line, idx) => (
              <text
                key={idx}
                x={MAP.cx}
                y={MAP.cy - 14 + idx * 16 - (goalLines.length - 1) * 6}
                textAnchor="middle"
                className="fr-map-core-text"
              >
                {line}
              </text>
            ))}

            {nodes.map(({ branch, x, y, i }) => {
              const lines = wrapLines(branch.name || `Branch ${i + 1}`, 22, 2);
              const imp = level(branch.importance);
              return (
                <g
                  key={`n${i}`}
                  className={`fr-map-node imp-${imp} ${selected === i ? "is-active" : ""}`}
                  transform={`translate(${x - 90},${y - 30})`}
                  onClick={() => setSelected(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Show details for ${asText(branch.name)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(i);
                    }
                  }}
                >
                  <title>{asText(branch.name)}</title>
                  <rect width="180" height="60" rx="16" />
                  {lines.map((line, li) => (
                    <text
                      key={li}
                      x="90"
                      y={lines.length === 1 ? 29 : 24 + li * 15}
                      textAnchor="middle"
                      className="fr-map-node-text"
                    >
                      {line}
                    </text>
                  ))}
                  {asText(branch.importance) && (
                    <text x="90" y="51" textAnchor="middle" className="fr-map-node-sub">
                      {asText(branch.importance)} priority
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <p className="fr-note fr-center">Select a branch to see its milestones and actions.</p>
        </div>
      )}

      {active && (
        <div className="fr-card fr-branch-detail" key={selected}>
          <div className="fr-card-top">
            <h3>{asText(active.name) || "Branch"}</h3>
            <Pill label="Importance" value={active.importance} />
          </div>

          {asText(active.description) && <p>{asText(active.description)}</p>}

          <div className="fr-two-col fr-flat">
            {asTextList(active.milestones).length > 0 && (
              <div>
                <p className="fr-label">MILESTONES</p>
                <BulletList items={active.milestones} />
              </div>
            )}
            {asTextList(active.actions).length > 0 && (
              <div>
                <p className="fr-label">ACTIONS</p>
                <BulletList items={active.actions} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────── FUTURE TIMELINE ─────────────── */

function Timeline({ items }) {
  return (
    <ol className="fr-timeline">
      {items.map((item, i) => {
        const assumptions = asTextList(item.assumptions);
        return (
          <li className="fr-tl-item" key={i} style={{ "--d": `${i * 80}ms` }}>
            <span className="fr-tl-dot" />
            <article className="fr-card fr-hover">
              <div className="fr-card-top">
                <span className="fr-tl-badge">
                  {asText(item.timeframe) || `Milestone ${i + 1}`}
                </span>
                <Pill label="Confidence" value={item.confidence} />
              </div>

              {asText(item.title) && <h3>{asText(item.title)}</h3>}
              {asText(item.description) && <p>{asText(item.description)}</p>}

              {asText(item.expected_progress) && (
                <div className="fr-progress-note">
                  <small>EXPECTED PROGRESS</small>
                  <p>{asText(item.expected_progress)}</p>
                </div>
              )}

              {asTextList(item.key_actions).length > 0 && (
                <>
                  <p className="fr-label">KEY ACTIONS</p>
                  <BulletList items={item.key_actions} />
                </>
              )}

              {assumptions.length > 0 && (
                <details className="fr-details">
                  <summary>Assumptions ({assumptions.length})</summary>
                  <BulletList items={assumptions} />
                </details>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────── GAP ANALYSIS ─────────────── */

function Gaps({ data }) {
  const gaps = asList(data.gaps).filter(isObj);

  return (
    <>
      {asText(data.summary) && (
        <div className="fr-card fr-feature">
          <p>{asText(data.summary)}</p>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="fr-grid fr-grid--2">
          {gaps.map((gap, i) => (
            <article className="fr-card fr-hover fr-gap" key={i}>
              <div className="fr-card-top">
                <h4>{asText(gap.area) || `Gap ${i + 1}`}</h4>
                <Pill label="Priority" value={gap.priority} />
              </div>

              <div className="fr-compare">
                <div>
                  <small>CURRENT</small>
                  <p>{asText(gap.current_state) || "—"}</p>
                </div>
                <span className="fr-compare-arrow">→</span>
                <div>
                  <small>REQUIRED</small>
                  <p>{asText(gap.required_state) || "—"}</p>
                </div>
              </div>

              {asText(gap.gap) && (
                <p className="fr-gap-text">
                  <b>The gap:</b> {asText(gap.gap)}
                </p>
              )}

              {asText(gap.suggested_action) && (
                <p className="fr-suggest">
                  <b>Recommended:</b> {asText(gap.suggested_action)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {asText(data.overall_recommendation) && (
        <div className="fr-callout">
          <b>Overall recommendation</b>
          <p>{asText(data.overall_recommendation)}</p>
        </div>
      )}
    </>
  );
}

/* ─────────────── ACTION ROADMAP ─────────────── */

function Roadmap({ data }) {
  const keys = [
    ...ROADMAP_ORDER.filter((k) => isObj(data[k])),
    ...Object.keys(data).filter((k) => !ROADMAP_ORDER.includes(k) && isObj(data[k])),
  ];

  return (
    <div className="fr-grid fr-grid--3">
      {keys.map((key, i) => {
        const phase = data[key];
        return (
          <article className="fr-card fr-hover fr-phase" key={key}>
            <div className="fr-phase-head">
              <span className="fr-phase-num">{i + 1}</span>
              <div>
                <small>{ROADMAP_LABELS[key] || key.replace(/_/g, " ")}</small>
                {asText(phase.duration) && <strong>{asText(phase.duration)}</strong>}
              </div>
            </div>

            {asText(phase.focus) && <h4>{asText(phase.focus)}</h4>}

            {asTextList(phase.actions).length > 0 && (
              <>
                <p className="fr-label">ACTIONS</p>
                <ul className="fr-checklist">
                  {asTextList(phase.actions).map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              </>
            )}

            {asTextList(phase.success_indicators).length > 0 && (
              <>
                <p className="fr-label">SUCCESS INDICATORS</p>
                <BulletList items={phase.success_indicators} />
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

/* ─────────────── 7-DAY PLAN ─────────────── */

function SevenDay({ days }) {
  return (
    <div className="fr-grid fr-grid--days">
      {days.map((day, i) => (
        <article className="fr-card fr-hover fr-day" key={i}>
          <div className="fr-day-head">
            <span>DAY</span>
            <strong>{asNum(day.day) ?? i + 1}</strong>
          </div>

          {asText(day.focus) && <h4>{asText(day.focus)}</h4>}

          {asTextList(day.tasks).length > 0 && (
            <ul className="fr-checklist">
              {asTextList(day.tasks).map((task, j) => (
                <li key={j}>{task}</li>
              ))}
            </ul>
          )}

          {asText(day.expected_outcome) && (
            <p className="fr-outcome">
              <b>Outcome:</b> {asText(day.expected_outcome)}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

/* ─────────────── LETTER ─────────────── */

function Letter({ data }) {
  const paragraphs = asText(data.letter)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="fr-letter">
      <div className="fr-letter-seal">✦</div>

      {asText(data.title) && <h3>{asText(data.title)}</h3>}

      <div className="fr-letter-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {asText(data.closing_message) && (
        <p className="fr-letter-closing">{asText(data.closing_message)}</p>
      )}
    </article>
  );
}

/* ─────────────── LOADING ─────────────── */

function LoadingPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      4000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fr-loading" role="status" aria-live="polite">
      <div className="fr-orb">
        <span />
        <span />
        <span />
      </div>
      <h3>Generating your Future Report</h3>
      <p>{LOADING_STEPS[step]}</p>
      <small>This can take up to a minute. Please keep this page open.</small>
    </div>
  );
}

/* ─────────────── MAIN COMPONENT ─────────────── */

export default function FutureReport({ apiRequest }) {
  const saved = useRef(loadSaved()).current;

  const [goal, setGoal] = useState(saved?.goal || "");
  const [result, setResult] = useState(saved?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = goal.trim();
  const goalError =
    trimmed.length < GOAL_MIN
      ? `Describe your goal in at least ${GOAL_MIN} characters.`
      : trimmed.length > GOAL_MAX
        ? `Keep your goal within ${GOAL_MAX} characters.`
        : "";

  const generate = async (event) => {
    event.preventDefault();
    setTouched(true);
    setError("");

    if (goalError || loading) return;

    setLoading(true);

    try {
      const data = await apiRequest("/future/generate-report", {
        method: "POST",
        body: JSON.stringify({ goal: trimmed }),
      });

      if (!isObj(data) || !isObj(data.report)) {
        throw new Error("The server returned an unexpected report format.");
      }

      setResult(data);
      saveReport(trimmed, data);
    } catch (err) {
      console.error("Future report failed:", err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const report = isObj(result?.report) ? result.report : null;

  const personality = isObj(report?.habit_personality) ? report.habit_personality : null;
  const mindMap = isObj(report?.goal_mind_map) ? report.goal_mind_map : null;
  const timeline = asList(report?.future_timeline).filter(isObj);
  const gaps = isObj(report?.habit_gap_analysis) ? report.habit_gap_analysis : null;
  const roadmap = isObj(report?.action_roadmap) ? report.action_roadmap : null;
  const week = asList(report?.seven_day_plan).filter(isObj);
  const letter = isObj(report?.future_self_letter) ? report.future_self_letter : null;

  const jumpTo = (id) =>
    document
      .getElementById(`fr-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="fr-root">
      <div className="fr-glow fr-glow--a" />
      <div className="fr-glow fr-glow--b" />

      {/* HERO + GOAL INPUT */}
      <section className="fr-hero">
        <p className="fr-eyebrow">FUTURE REPORT</p>
        <h1>See where your habits are taking you.</h1>
        <p className="fr-hero-sub">
          Tell FUTR your goal. It reads your real habit history and builds a
          personalised plan, timeline and letter from your future self.
        </p>

        <form className="fr-form" onSubmit={generate} noValidate>
          <label htmlFor="fr-goal">YOUR BIG GOAL</label>

          <textarea
            id="fr-goal"
            rows={3}
            value={goal}
            maxLength={GOAL_MAX + 50}
            disabled={loading}
            placeholder={EXAMPLE_GOAL}
            onChange={(e) => {
              setGoal(e.target.value);
              setError("");
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && Boolean(goalError)}
          />

          <div className="fr-form-foot">
            <span className={`fr-count ${trimmed.length > GOAL_MAX ? "is-over" : ""}`}>
              {trimmed.length}/{GOAL_MAX}
            </span>

            <div className="fr-form-actions">
              {!goal && (
                <button
                  type="button"
                  className="fr-ghost"
                  onClick={() => setGoal(EXAMPLE_GOAL)}
                  disabled={loading}
                >
                  Use an example
                </button>
              )}

              <button type="submit" className="fr-primary" disabled={loading}>
                {loading
                  ? "Generating…"
                  : result
                    ? "Regenerate Future Report"
                    : "Generate Future Report"}
              </button>
            </div>
          </div>

          {touched && goalError && !loading && (
            <p className="fr-field-error">{goalError}</p>
          )}
        </form>

        {error && (
          <div className="fr-error" role="alert">
            <strong>Could not generate your report</strong>
            <p>{error}</p>
          </div>
        )}
      </section>

      {loading && <LoadingPanel />}

      {/* REPORT */}
      {!loading && report && (
        <div className="fr-report">
          <nav className="fr-nav" aria-label="Report sections">
            {NAV.map(([id, label]) => (
              <button key={id} type="button" onClick={() => jumpTo(id)}>
                {label}
              </button>
            ))}
          </nav>

          <Section id="overview" eyebrow="OVERVIEW" title="Your goal and current reality">
            <Overview result={result} />
          </Section>

          <Section
            id="personality"
            eyebrow="HABIT PERSONALITY"
            title="How your habits behave today"
            empty={!personality}
          >
            {personality && <Personality data={personality} />}
          </Section>

          <Section
            id="mindmap"
            eyebrow="GOAL MIND MAP"
            title="What your goal is made of"
            empty={!mindMap || asList(mindMap.branches).length === 0}
          >
            {mindMap && <MindMap data={mindMap} />}
          </Section>

          <Section
            id="timeline"
            eyebrow="FUTURE TIMELINE"
            title="Your next 36 months"
            empty={timeline.length === 0}
          >
            <Timeline items={timeline} />
          </Section>

          <Section
            id="gaps"
            eyebrow="HABIT GAP ANALYSIS"
            title="Where you are vs where you need to be"
            empty={!gaps}
          >
            {gaps && <Gaps data={gaps} />}
          </Section>

          <Section
            id="roadmap"
            eyebrow="ACTION ROADMAP"
            title="The path, phase by phase"
            empty={!roadmap}
          >
            {roadmap && <Roadmap data={roadmap} />}
          </Section>

          <Section
            id="week"
            eyebrow="7-DAY ACTION PLAN"
            title="Start this week"
            empty={week.length === 0}
          >
            <SevenDay days={week} />
          </Section>

          <Section
            id="letter"
            eyebrow="LETTER FROM YOUR FUTURE SELF"
            title="A note across time"
            empty={!letter}
          >
            {letter && <Letter data={letter} />}
          </Section>

          <p className="fr-disclaimer">
            This report is an AI-generated estimate based on your logged habits.
            It is not a guarantee of any career, salary or personal outcome.
          </p>
        </div>
      )}

      {!loading && !report && !error && (
        <div className="fr-placeholder">
          <span>✦</span>
          <h3>Your report will appear here</h3>
          <p>Add a goal above. Make sure you have logged some habits first, so the report has real data to work with.</p>
        </div>
      )}
    </div>
  );
}
