import { useCallback, useState } from "react";
import "./AICoachCard.css";

const NO_HABITS_TEXT = "Add at least one habit before using AI Coach.";

export default function AICoachCard({ apiRequest }) {
  // idle | loading | ready | empty | error
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await apiRequest("/ai-coach/daily");

      if (!response?.coaching) {
        throw new Error("The AI Coach returned an unexpected response.");
      }

      setData(response);
      setStatus("ready");
    } catch (err) {
      const message = err?.message || "";

      // Backend returns 400 with this detail when the user has no habits.
      if (message === NO_HABITS_TEXT || /add at least one habit/i.test(message)) {
        setData(null);
        setStatus("empty");
        return;
      }

      setError(message || "Could not generate insights. Please try again.");
      setStatus("error");
    }
  }, [apiRequest]);

  const coaching = data?.coaching ?? {};
  const suggestions = Array.isArray(coaching.suggestions)
    ? coaching.suggestions.slice(0, 3)
    : [];
  const consistency = data?.habit_summary?.consistency;
  const isLoading = status === "loading";

  return (
    <section className="coach-card reveal" aria-labelledby="coach-title">
      <header className="coach-head">
        <div>
          <h2 id="coach-title">AI Habit Coach</h2>
          <p className="coach-sub">Your habits, decoded.</p>
        </div>

        <span className="coach-badge">AI Powered</span>
      </header>

      {status === "idle" && (
        <>
          <p className="coach-insight">
            Personalized insights based on your actual habit performance.
          </p>
          <div className="coach-actions">
            <button type="button" className="coach-btn" onClick={generate}>
              Generate Today's Insights ↗
            </button>
          </div>
        </>
      )}

      {status === "loading" && (
        <div className="coach-skeleton-wrap" role="status" aria-live="polite">
          <div className="coach-skeleton coach-skeleton--wide" />
          <div className="coach-skeleton" />
          <div className="coach-skeleton coach-skeleton--short" />
          <p className="coach-sub">Coach is reviewing your habits…</p>
        </div>
      )}

      {status === "empty" && (
        <div className="coach-empty">
          {NO_HABITS_TEXT} Your insights will appear here once you have habits.
        </div>
      )}

      {status === "error" && (
        <>
          <div className="coach-error" role="alert">
            {error}
          </div>
          <div className="coach-actions">
            <button type="button" className="coach-btn ghost" onClick={generate}>
              Try again
            </button>
          </div>
        </>
      )}

      {status === "ready" && (
        <>
          {coaching.overall_insight && (
            <p className="coach-insight">{coaching.overall_insight}</p>
          )}

          <div className="coach-grid">
            <div className="coach-habit">
              <small>YOUR STRONGEST HABIT</small>
              <strong>{coaching.strongest_habit || "—"}</strong>
            </div>

            <div className="coach-habit improve">
              <small>NEEDS ATTENTION</small>
              <strong>{coaching.habit_to_improve || "—"}</strong>
            </div>
          </div>

          {suggestions.length > 0 && (
            <>
              <p className="coach-label">TODAY'S SUGGESTIONS</p>
              <ol className="coach-list">
                {suggestions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </>
          )}

          {coaching.motivation && (
            <p className="coach-motivation">“{coaching.motivation}”</p>
          )}

          <div className="coach-actions">
            {typeof consistency === "number" && (
              <span className="coach-sub">
                Consistency: {Math.round(consistency)}%
              </span>
            )}
            <button
              type="button"
              className="coach-btn ghost"
              onClick={generate}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing…" : "Refresh insights ↻"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}