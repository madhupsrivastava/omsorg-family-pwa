import { useEffect } from "react";
import { createBrowserClient } from "../../lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createBrowserClient();

    const handleCallback = async () => {
      // Try PKCE code flow first (Supabase v2 default)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
        if (session) { window.location.href = "/dashboard"; return; }
        console.error("Code exchange error:", error);
      }

      // Fallback: implicit flow (hash-based tokens)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token  = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token) {
          const { data: { session }, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (session) { window.location.href = "/dashboard"; return; }
          console.error("Session set error:", error);
        }
      }

      // Nothing worked — back to login
      window.location.href = "/";
    };

    handleCallback();
  }, []);

  return (
    <div style={{
      fontFamily: "-apple-system, sans-serif",
      background: "#FFF5F5",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "16px",
    }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #8B1A1A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#8B1A1A", fontWeight: 600, fontSize: "15px" }}>Signing you in…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
