import { useEffect } from "react";
import { createBrowserClient } from "../../lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createBrowserClient();

    const handleCallback = async () => {
      // With flowType:'implicit' and detectSessionInUrl:true,
      // Supabase automatically processes the hash token on init.
      // Just call getSession() and it returns the session.
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        window.location.href = "/dashboard";
      } else {
        console.error("Auth callback failed:", error);
        window.location.href = "/";
      }
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

export const getServerSideProps = () => ({ props: {} });
