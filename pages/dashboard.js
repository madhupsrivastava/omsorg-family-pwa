import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { createBrowserClient } from "../lib/supabase";

const MAROON = "#8B1A1A";

// Legacy update_type config (for older AI-generated updates)
const UPDATE_TYPE_CONFIG = {
  daily:    { emoji: "📋", label: "Daily Update",   color: "#1E40AF", bg: "#EFF6FF" },
  health:   { emoji: "💊", label: "Health Update",  color: "#166534", bg: "#F0FDF4" },
  meal:     { emoji: "🍽️", label: "Meal Update",    color: "#92400E", bg: "#FFFBEB" },
  incident: { emoji: "📌", label: "Care Note",      color: "#991B1B", bg: "#FFF5F5" },
  activity: { emoji: "🎯", label: "Activity",       color: "#6D28D9", bg: "#F5F3FF" },
  general:  { emoji: "💬", label: "Update",         color: "#374151", bg: "#F9FAFB" },
};

// New category config (for Supervisor Console updates)
const CATEGORY_CONFIG = {
  attendance:         { emoji: "📍", label: "Attendance",    color: "#1E40AF", bg: "#EFF6FF" },
  personal_care:      { emoji: "🛁", label: "Personal Care", color: "#9D174D", bg: "#FDF2F8" },
  medication:         { emoji: "💊", label: "Medication",    color: "#166534", bg: "#F0FDF4" },
  meal_food:          { emoji: "🍽️", label: "Meal & Food",   color: "#92400E", bg: "#FFFBEB" },
  toileting:          { emoji: "🚽", label: "Toileting",     color: "#0E7490", bg: "#ECFEFF" },
  activity:           { emoji: "🎯", label: "Activity",      color: "#6D28D9", bg: "#F5F3FF" },
  health_observation: { emoji: "🩺", label: "Health Note",   color: "#0F766E", bg: "#F0FDFA" },
  incident_concern:   { emoji: "⚠️", label: "Concern",       color: "#991B1B", bg: "#FFF5F5" },
  general:            { emoji: "💬", label: "Update",        color: "#374151", bg: "#F9FAFB" },
};

function resolveBadge(update) {
  if (update.category && CATEGORY_CONFIG[update.category]) return CATEGORY_CONFIG[update.category];
  if (update.update_type && UPDATE_TYPE_CONFIG[update.update_type]) return UPDATE_TYPE_CONFIG[update.update_type];
  return UPDATE_TYPE_CONFIG.general;
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(updates) {
  const groups = {};
  updates.forEach(u => {
    const key = u.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  });
  return Object.entries(groups).sort(([a], [b]) => new Date(b) - new Date(a));
}

function MediaGrid({ media }) {
  if (!media || media.length === 0) return null;
  const single = media.length === 1;
  return (
    <div style={{ padding: "0 16px 12px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: single ? "1fr" : "repeat(2, 1fr)",
        gap: "6px",
      }}>
        {media.map(m => (
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" style={{
            display: "block",
            aspectRatio: single ? "16 / 10" : "1",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#f3f4f6",
          }}>
            <img src={m.url} alt={m.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </a>
        ))}
      </div>
    </div>
  );
}

function UpdateCard({ update }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = resolveBadge(update);
  const text = update.published_update || "";
  const isLong = text.length > 200;
  const displayText = !expanded && isLong ? text.slice(0, 200) + "…" : text;

  const copyText = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const attribution = [
    update.staff_name && `Care by ${update.staff_name}`,
    update.supervisor_name && `Reviewed by ${update.supervisor_name}`,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{
      background: "#fff", borderRadius: "16px", padding: "0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "12px",
      overflow: "hidden", border: "1px solid #f3f4f6",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #f9fafb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
            {cfg.emoji} {cfg.label}
          </span>
          <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{timeAgo(update.published_at || update.date)}</span>
        </div>
      </div>

      {/* Text */}
      <div style={{ padding: "14px 16px 10px" }}>
        <p style={{ fontSize: "14px", lineHeight: "1.75", color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>{displayText}</p>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: MAROON, fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "8px", padding: 0 }}>
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        )}
      </div>

      {/* Photos */}
      <MediaGrid media={update.media} />

      {/* Footer */}
      <div style={{ padding: "10px 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <div style={{ fontSize: "11px", color: "#9CA3AF", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {attribution}
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button onClick={copyText} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: copied ? "#065F46" : "#374151" }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
            style={{ padding: "6px 12px", borderRadius: "8px", background: "#25D366", color: "#fff", fontSize: "12px", fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function SessionExpiredBanner({ onRelogin }) {
  return (
    <div style={{ background: "#FEF3C7", padding: "12px 16px", margin: "12px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: "13px", color: "#92400E" }}>⚠️ Your session has expired</div>
      <button onClick={onRelogin} style={{ padding: "6px 14px", borderRadius: "8px", background: MAROON, color: "#fff", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
        Sign in again
      </button>
    </div>
  );
}

export default function FamilyDashboard() {
  const supabase = createBrowserClient();
  const [session,       setSession]       = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [updates,       setUpdates]       = useState([]);
  const [clients,       setClients]       = useState([]);
  const [activeClient,  setActiveClient]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleAuthError = useCallback(async (err) => {
    if (err?.includes?.("JWT expired") || err?.includes?.("token is expired") || err?.message?.includes?.("JWT")) {
      await supabase.auth.signOut();
      setSessionExpired(true);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) { handleAuthError(error.message); return; }
      if (!session) { window.location.href = "/"; return; }
      setSession(session);

      const { data: prof, error: profError } = await supabase
        .from("users").select("*").eq("id", session.user.id).single();

      if (profError) { handleAuthError(profError.message); return; }
      setProfile(prof);
      await fetchUpdates(session.access_token, null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        setSessionExpired(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUpdates = async (token, clientId) => {
    setLoading(true); setError("");
    const url = clientId ? `/api/family/updates?clientId=${clientId}` : "/api/family/updates";
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.status === 401) { handleAuthError("JWT expired"); return; }
      if (!res.ok) { setError(data.error || "Could not load updates"); setLoading(false); return; }
      setUpdates(data.updates || []);
      setClients(data.clients || []);
      if (!activeClient && data.clients?.length) setActiveClient(data.clients[0].id);
    } catch (e) {
      setError("Connection error. Please check your internet.");
    }
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
  const activeClientInfo = clients.find(c => c.id === activeClient);

  return (
    <>
      <Head>
        <title>Omsorg — Care Updates</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={MAROON} />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F7F3F3; min-height: 100vh; }
      `}</style>

      <div style={{ background: MAROON, paddingTop: "env(safe-area-inset-top, 0)" }}>
        <div style={{ padding: "14px 16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "#F5C0C0", fontSize: "11px", marginBottom: "3px" }}>Omsorg Family Portal</div>
            <div style={{ color: "#fff", fontSize: "19px", fontWeight: 700 }}>
              {profile?.full_name?.split(" ")[0] || "Hello"} 👋
            </div>
            {activeClientInfo && (
              <div style={{ color: "#F5C0C0", fontSize: "12px", marginTop: "3px" }}>
                Updates for {activeClientInfo.name}
              </div>
            )}
          </div>
          <button onClick={handleSignOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "7px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            Sign out
          </button>
        </div>

        {clients.length > 1 && (
          <div style={{ display: "flex", gap: "6px", padding: "0 16px 14px", overflowX: "auto" }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => handleClientSwitch(c.id)} style={{
                padding: "7px 16px", borderRadius: "20px", border: "none", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                background: activeClient === c.id ? "#fff" : "rgba(255,255,255,0.2)",
                color: activeClient === c.id ? MAROON : "#fff",
              }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        <svg viewBox="0 0 390 20" fill="none" style={{ display: "block", width: "100%" }}>
          <path d="M0 0 Q97.5 20 195 10 Q292.5 0 390 20 L390 20 L0 20 Z" fill="#F7F3F3"/>
        </svg>
      </div>

      {sessionExpired && <SessionExpiredBanner onRelogin={() => window.location.href = "/"} />}

      <div style={{ padding: "8px 16px 48px", maxWidth: "560px", margin: "0 auto" }}>

        <div style={{ background: "#fff", borderRadius: "14px", padding: "14px 16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "13px", color: "#374151" }}>Questions about care?</div>
          <a href="https://wa.me/918448381360" target="_blank" rel="noreferrer"
            style={{ background: "#25D366", color: "#fff", padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
            WhatsApp Omsorg
          </a>
        </div>

        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px", borderRadius: "10px", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}

        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ width: "32px", height: "32px", border: `3px solid ${MAROON}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12
