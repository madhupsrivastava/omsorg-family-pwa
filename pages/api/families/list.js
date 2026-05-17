import { requireAuth, createServerClient } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const auth = await requireAuth(req, ["admin", "supervisor", "staff"]);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("family_client_access")
    .select(`
      id,
      relationship,
      created_at,
      users!family_client_access_user_id_fkey (
        id, email, full_name, role, active
      ),
      clients!family_client_access_client_id_fkey (
        id, name, care_type
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ access: data || [] });
}
