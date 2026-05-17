import { getFamilyAccess } from "../../../lib/supabase";

// ONLY returns published updates for the family member's linked clients
// Internal fields are NEVER selected or returned
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorised" });

  // Verify family access — returns allowed client IDs
  const access = await getFamilyAccess(token);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const { allowedClientIds, linkedClients, admin } = access;

  if (!allowedClientIds.length) {
    return res.status(200).json({ updates: [], clients: [] });
  }

  // Get clientId from query — validate it is in the allowed list
  const { clientId } = req.query;
  let queryClientIds = allowedClientIds;

  if (clientId) {
    // SECURITY: even if someone passes a different clientId, we verify it's allowed
    if (!allowedClientIds.includes(clientId)) {
      return res.status(403).json({ error: "You do not have access to this client" });
    }
    queryClientIds = [clientId];
  }

  // Query ONLY published updates, ONLY allowed clients
  // NEVER select internal fields: rough_notes, concern_details, health_observations,
  //   mood_behaviour, medication_status, meals_taken, etc.
  const { data: updates, error } = await admin
    .from("updates")
    .select(`
      id,
      client_id,
      client_name,
      date,
      update_type,
      published_update,
      supervisor_name,
      published_at,
      language
    `)
    .in("client_id", queryClientIds)
    .eq("approval_status", "published")
    .order("date", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Updates query error:", error);
    return res.status(500).json({ error: "Failed to fetch updates" });
  }

  return res.status(200).json({
    updates: updates || [],
    clients: linkedClients,
  });
}
