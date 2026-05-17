import { useState, useEffect } from "react";
import Head from "next/head";
import { createBrowserClient } from "../lib/supabase";

const MAROON = "#8B1A1A";

export default function FamilyLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [checking, setChecking] = useState(true);

  const supabase = createBrowserClient();

  useEffect(() => {
    // onAuthStateChange fires when magic link token is auto-processed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = "/dashboard";
      } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        setChecking(false);
      }
    });

    // Also check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/dashboard";
      else setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError("Incorrect email or password. Please try again."); setLoading(false); return; }

    // Verify this is a family account (extra client-side check — server enforces too)
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "family") {
      await supabase.auth.signOut();
      setError("This portal is for family members only. Staff should use the Staff Portal.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  if (checking) return null;

  return (
    <>
      <Head>
        <title>Omsorg Family Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={MAROON} />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FFF5F5; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
        input:focus { outline: 2px solid ${MAROON}; border-color: ${MAROON}; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: MAROON, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 3C10.48 3 6 7.48 6 13c0 3.72 1.94 6.98 4.86 8.88L9 29h14l-1.86-7.12A10 10 0 0026 13c0-5.52-4.48-10-10-10z" fill="#F5C0C0"/>
            </svg>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: MAROON }}>Omsorg</div>
          <div style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "4px" }}>Family Care Portal</div>
        </div>

        {/* Login card */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", boxShadow: "0 4px 24px rgba(139,26,26,0.08)" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Welcome back</div>
          <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px", lineHeight: "1.5" }}>
            Sign in to view care updates for your loved one.
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "6px" }}>EMAIL ADDRESS</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ width: "100%", padding: "13px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "15px" }} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "6px" }}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: "100%", padding: "13px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "15px" }} />
            </div>

            {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: loading ? "#D1D5DB" : MAROON,
                color: "#fff", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: "20px", padding: "14px", background: "#FFF9F0", borderRadius: "10px", fontSize: "12px", color: "#92400E", lineHeight: "1.6" }}>
            🔒 Your login details are provided by Omsorg. If you need access or have forgotten your password, please contact us.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <a href="https://wa.me/918448381360" style={{ fontSize: "13px", color: MAROON, textDecoration: "none", fontWeight: 600 }}>
            Need help? WhatsApp Omsorg →
          </a>
        </div>
      </div>
    </>
  );
}
