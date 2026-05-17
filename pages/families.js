import { useState, useEffect } from "react";
import Head from "next/head";
import { createBrowserClient } from "../lib/supabase";

const G = "#8B1A1A";

function Card({ children, style }) {
  return <div style={{ background: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #f3f4f6", marginBottom: "12px", ...style }}>{children}</div>;
}

function Label({ children }) {
  return <div style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{children}</div>;
}

function Input({ ...props }) {
  return <input {...props} style={{ width: "100%", padding: "11px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", ...props.style }} />;
}

const RELATIONSHIP_OPTIONS = ["Son", "Daughter", "Spouse", "Sibling", "Parent", "Friend", "Other"];

export default function Families() {
  const supabase = createBrowserClient();
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Invite form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [relationship, setRelationship] = useState("Son");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      setSession(session);
      loadData(session.access_token);
    });
  }, []);

  const loadData = async (token) => {
    setLoading(true);
    const [clientsRes, accessRes] = await Promise.all([
      fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/families/list", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const clientsData = await clientsRes.json();
    const accessData = await accessRes.json();
    setClients(clientsData.clients || []);
    setAccess(accessData.access || []);
    setLoading(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true); setError(""); setSuccess("");

    const res = await fetch("/api/families/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ fullName, email, clientId, relationship }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error); setSending(false); return; }

    setSuccess(data.message);
    setFullName(""); setEmail(""); setClientId(""); setRelationship("Son");
    loadData(session.access_token);
    setSending(false);
  };

  // Group access by client
  const byClient = {};
  access.forEach(a => {
    const clientName = a.clients?.name || "Unknown";
    if (!byClient[clientName]) byClient[clientName] = [];
    byClient[clientName].push(a);
  });

  return (
    <>
      <Head><title>Family Access — Omsorg</title></Head>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F4F4F4; }`}</style>

      <div style={{ background: G, padding: "14px 16px 18px" }}>
        <a href="/" style={{ color: "#F5C0C0", fontSize: "12px", textDecoration: "none" }}>← Back to Portal</a>
        <div style={{ color: "#fff", fontSize: "19px", fontWeight: 700, marginTop: "8px" }}>Family Access</div>
        <div style={{ color: "#F5C0C0", fontSize: "12px" }}>Invite family members and manage client access</div>
      </div>

      <div style={{ padding: "16px", maxWidth: "560px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* Invite form */}
        <Card>
          <div style={{ fontWeight: 700, color: "#111827", marginBottom: "14px", fontSize: "15px" }}>Invite a Family Member</div>
          <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px", lineHeight: "1.5" }}>
            They will receive an email invitation to set up their account and view care updates.
          </div>

          <form onSubmit={handleInvite}>
            <div style={{ marginBottom: "12px" }}>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Priya Sharma" required />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <Label>Email Address *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@gmail.com" required />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <Label>Client / Resident *</Label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} required
                style={{ width: "100%", padding: "11px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", background: "#fff" }}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <Label>Relationship</Label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)}
                style={{ width: "100%", padding: "11px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", background: "#fff" }}>
                {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
            {success && <div style={{ background: "#D1FAE5", color: "#065F46", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>✅ {success}</div>}

            <button type="submit" disabled={sending}
              style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: sending ? "#f3f4f6" : G, color: sending ? "#9CA3AF" : "#fff", fontSize: "14px", fontWeight: 700, cursor: sending ? "not-allowed" : "pointer" }}>
              {sending ? "Sending invitation…" : "Send Invitation →"}
            </button>
          </form>
        </Card>

        {/* Family access list */}
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "20px 0 10px" }}>
          Current Family Access
        </div>

        {loading && <div style={{ textAlign: "center", color: "#9CA3AF", padding: "20px" }}>Loading…</div>}

        {!loading && Object.keys(byClient).length === 0 && (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "30px", fontSize: "14px" }}>No family access records yet.</div>
        )}

        {!loading && Object.entries(byClient).map(([clientName, entries]) => (
          <Card key={clientName}>
            <div style={{ fontWeight: 700, color: "#111827", marginBottom: "10px", fontSize: "14px" }}>👤 {clientName}</div>
            {entries.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{a.users?.full_name}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{a.users?.email} · {a.relationship}</div>
                </div>
                <div style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "20px", background: a.users?.active ? "#D1FAE5" : "#F3F4F6", color: a.users?.active ? "#065F46" : "#9CA3AF", fontWeight: 600 }}>
                  {a.users?.active ? "Active" : "Inactive"}
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </>
  );
}
