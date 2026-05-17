import { useState, useEffect } from "react";
import Head from "next/head";
import { createBrowserClient } from "../lib/supabase";

const MAROON = "#8B1A1A";

const UPDATE_TYPE_CONFIG = {
  daily:    { emoji: "📋", label: "Daily Update",   bg: "#EFF6FF", text: "#1E40AF" },
  health:   { emoji: "🏥", label: "Health Update",  bg: "#F0FDF4", text: "#166534" },
  meal:     { emoji: "🍽️", label: "Meal Update",    bg: "#FFFBEB", text: "#92400E" },
  incident: { emoji: "📌", label: "Care Note",      bg: "#FFF5F5", text: "#991B1B" },
  activity: { emoji: "🎯", label: "Activity",       bg: "#F5F3FF", text: "#6D28D9" },
  general:  { emoji: "💬", label: "Update",         bg: "#F9FAFB", text: "#374151" },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(updates) {
  const groups = {};
  updates.forEach(u => {
    if (!groups[u.date]) groups[u.date] = [];
    groups[u.date].push(u);
  });
  return groups;
}

function UpdateCard({ update }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = UPDATE_TYPE_CONFIG[update.update_type] || UPDATE_TYPE_CONFIG.general;
  const text = update.published_update || "";
  const isLong = text.length > 180;
  const displayText = !expanded && isLong ? text.slice(0, 180) + "…" : text;

  return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "16px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <span style={{ background: cfg.bg, color: cfg.text, padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
          {cfg.emoji} {cfg.label}
        </span>
        {update.supervisor_name && (
          <span style={{ fontSize: "11px", color: "#9CA3AF" }}>✓ {update.supervisor_name}</span>
        )}
      </div>
      <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#374151" }}>{displayText}</div>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: MAROON, fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "6px", padding: 0 }}>
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      )}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", background: "#25D366", color: "#fff", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
          Share on WhatsApp
        </a>
        <button onClick={() => navigator.clipboard?.writeText(text)}
          style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#374151" }}>
          Copy
        </button>
      </div>
    </div>
  );
}

export default function FamilyDashboard() {
  const supabase = createBrowserClient();
  const [session,  setSession]  = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [updates,  setUpdates]  = useState([]);
  const [clients,  setClients]  = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/"; return; }
      setSession(session);

      // Get profile
      const { data: prof } = await supabase.from("users").select("*").eq("id", session.user.id).single();
      setProfile(prof);

      // Fetch updates from secure API
      await fetchUpdates(session.access_token, null);
    });
  }, []);

  const fetchUpdates = async (token, clientId) => {
    setLoading(true); setError("");
    const url = clientId ? `/api/family/updates?clientId=${clientId}` : "/api/family/updates";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not load updates"); setLoading(false); return; }
    setUpdates(data.updates || []);
    setClients(data.clients || []);
    if (!activeClient && data.clients?.length) setActiveClient(data.clients[0].id);
    setLoading(false);
  };

  const handleClientSwitch = (clientId) => {
    setActiveClient(clientId);
    fetchUpdates(session.access_token, clientId);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const grouped = groupByDate(updates);
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
  const activeClientInfo = clients.find(c => c.id === activeClient);

  return (
    <>
      <Head>
        <title>Omsorg Family Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={MAROON} />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FFF5F5; min-height: 100vh; }
      `}</style>

      {/* Header */}
      <div style={{ background: MAROON, padding: "env(safe-area-inset-top, 0) 0 0" }}>
        <div style={{ padding: "16px 16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#F5C0C0", fontSize: "11px", marginBottom: "2px" }}>Omsorg Family Portal</div>
              <div style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>
                {profile?.full_name || "Welcome"}
              </div>
            </div>
            <button onClick={handleSignOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "7px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              Sign out
            </button>
          </div>

          {/* Client tabs (if multiple clients linked) */}
          {clients.length > 1 && (
            <div style={{ display: "flex", gap: "6px", marginTop: "14px", overflowX: "auto", paddingBottom: "2px" }}>
              {clients.map(c => (
                <button key={c.id} onClick={() => handleClientSwitch(c.id)}
                  style={{ padding: "7px 14px", borderRadius: "20px", border: "none", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                    background: activeClient === c.id ? "#fff" : "rgba(255,255,255,0.2)",
                    color: activeClient === c.id ? MAROON : "#fff" }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Wave */}
        <svg viewBox="0 0 390 20" fill="none" style={{ display: "block", width: "100%" }}>
          <path d="M0 0 Q97.5 20 195 10 Q292.5 0 390 20 L390 20 L0 20 Z" fill="#FFF5F5"/>
        </svg>
      </div>

      <div style={{ padding: "4px 16px 40px", maxWidth: "560px", margin: "0 auto" }}>

        {/* Client info card */}
        {activeClientInfo && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "14px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#FFF0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
              👤
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#111827" }}>{activeClientInfo.name}</div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                {activeClientInfo.relationship && `Your ${activeClientInfo.relationship} · `}
                {activeClientInfo.care_type?.replace("_", " ")}
              </div>
            </div>
            <a href="https://wa.me/918448381360" target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", background: "#25D366", color: "#fff", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
              Contact Omsorg
            </a>
          </div>
        )}

        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px", borderRadius: "10px", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}

        {loading && <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>Loading updates…</div>}

        {!loading && updates.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>💛</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: "6px" }}>No updates yet</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", lineHeight: "1.6" }}>
              Updates will appear here once your Omsorg care team publishes them. Check back soon!
            </div>
          </div>
        )}

        {!loading && sortedDates.map(date => (
          <div key={date}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 8px" }}>
              {formatDate(date)}
            </div>
            {grouped[date].map(u => <UpdateCard key={u.id} update={u} />)}
          </div>
        ))}

        {/* Footer */}
        {!loading && updates.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "#9CA3AF", lineHeight: "1.7" }}>
            All updates are reviewed by Omsorg supervisors before publishing.<br/>
            <a href="https://wa.me/918448381360" style={{ color: MAROON, fontWeight: 600 }}>Contact us</a> for more information.
          </div>
        )}
      </div>
    </>
  );
}

export const getServerSideProps = () => ({ props: {} });
