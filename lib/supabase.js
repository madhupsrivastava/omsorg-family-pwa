import { createClient } from "@supabase/supabase-js";

let browserClient;
export function createBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return browserClient;
}

// Server-side: verify family user and return their allowed client IDs
export async function getFamilyAccess(token) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: "Invalid session", status: 401 };

  // Verify this is a family user
  const { data: profile } = await admin
    .from("users")
    .select("id, full_name, role, active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) return { error: "Account inactive", status: 403 };
  if (profile.role !== "family") return { error: "Not a family account", status: 403 };

  // Get all client IDs this family member can access
  const { data: access } = await admin
    .from("family_client_access")
    .select("client_id, relationship, clients(id, name, care_type)")
    .eq("user_id", user.id);

  const allowedClientIds = (access || []).map(a => a.client_id);
  const linkedClients = (access || []).map(a => ({
    id: a.client_id,
    name: a.clients?.name,
    care_type: a.clients?.care_type,
    relationship: a.relationship,
  }));

  return { user: { ...user, ...profile }, allowedClientIds, linkedClients, admin };
}
