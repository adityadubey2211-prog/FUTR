import { useState } from "react";
import "./LoginPage.css";

/*
  Login / Sign-up screen for FUTR.

  Usage:
    <LoginPage onLogin={async ({ mode, name, email, password }) => { ... }} />

  Throw an Error inside onLogin to show its message under the form.
  The screen does not store any credentials itself.
*/

const INITIAL_FORM = { name: "", email: "", password: "" };

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3.2 3.9M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 6 10 6a10.7 10.7 0 0 0 5.4-1.5" />
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const isSignup = mode === "signup";

  const errors = {
    name: isSignup && form.name.trim().length < 2 ? "Please enter your name" : "",
    email: /^\S+@\S+\.\S+$/.test(form.email.trim()) ? "" : "Enter a valid email address",
    password: form.password.length >= 8 ? "" : "Use at least 8 characters",
  };

  const isValid = !errors.name && !errors.email && !errors.password;

  const fieldError = (field) => (touched[field] ? errors[field] : "");

  const handleChange = (field) => (e) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
    setServerError("");
  };

  const markTouched = (field) => () =>
    setTouched((current) => ({ ...current, [field]: true }));

  const switchMode = (next) => {
    setMode(next);
    setTouched({});
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });

    if (!isValid || loading || typeof onLogin !== "function") return;

    setLoading(true);
    setServerError("");

    try {
      await onLogin({
        mode,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
    } catch (err) {
      setServerError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ambient background */}
      <div className="login-glow login-glow--a" aria-hidden="true" />
      <div className="login-glow login-glow--b" aria-hidden="true" />
      <div className="login-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <main className="login-card" aria-labelledby="login-title">
        {/* brand */}
        <div className="login-brand">
          <div className="login-logo">f.</div>
          <span className="login-wordmark">
            futr<span>.</span>
          </span>
        </div>

        <p className="login-tagline">Understand your habits. Explore your future.</p>

        {/* mode switch */}
        <div className="login-switch" role="tablist" aria-label="Choose an action">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={!isSignup ? "is-active" : ""}
            onClick={() => switchMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={isSignup ? "is-active" : ""}
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
          <span
            className="login-switch-pill"
            style={{ transform: `translateX(${isSignup ? "100%" : "0"})` }}
            aria-hidden="true"
          />
        </div>

        <h1 id="login-title" className="login-title">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="login-subtitle">
          {isSignup
            ? "Start building habits that shape your future."
            : "Pick up where you left off."}
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <Field
              id="login-name"
              label="Name"
              error={fieldError("name")}
            >
              <input
                id="login-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange("name")}
                onBlur={markTouched("name")}
                aria-invalid={Boolean(fieldError("name"))}
              />
            </Field>
          )}

          <Field id="login-email" label="Email" error={fieldError("email")}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange("email")}
              onBlur={markTouched("email")}
              aria-invalid={Boolean(fieldError("email"))}
            />
          </Field>

          <Field id="login-password" label="Password" error={fieldError("password")}>
            <div className="login-password">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                value={form.password}
                onChange={handleChange("password")}
                onBlur={markTouched("password")}
                aria-invalid={Boolean(fieldError("password"))}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </Field>

          {serverError && (
            <div className="login-alert" role="alert">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                {isSignup ? "Creating account…" : "Logging in…"}
              </>
            ) : isSignup ? (
              "Create account"
            ) : (
              "Log in"
            )}
          </button>
        </form>

        <p className="login-switch-text">
          {isSignup ? "Already have an account?" : "New to FUTR?"}{" "}
          <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>

        <p className="login-footnote">
          Your habit data stays yours. Keep building, one day at a time.
        </p>
      </main>
    </div>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div className={`login-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <small className="login-field-error">{error}</small>}
    </div>
  );
}