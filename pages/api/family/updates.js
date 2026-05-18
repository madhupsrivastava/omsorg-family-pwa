import { getFamilyAccess } from "../../../lib/supabase";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

// ONLY returns published updates for the family member's linked clients
// Internal fields are NEVER selected or returned
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorised" });

  const access = await getFamilyAccess(token);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const { allowedClientIds, linkedClients, admin } = access;
  if (!allowedClientIds.length) {
    return res.status(200).json({ updates: [], clients: [] });
  }

  const { clientId } = req.query;
  let queryClientIds = allowedClientIds;
  if (clientId) {
    if (!allowedClientIds.includes(clientId)) {
      return res.status(403).json({ error: "You do not have access to this client" });
    }
    queryClientIds = [clientId];
  }

  // Query published updates (now also selecting category + staff_name)
  const { data: updates, error } = await admin
    .from("updates")
    .select(`
      id,
      client_id,
      client_name,
      date,
      update_type,
      category,
      published_update,
      supervisor_name,
      staff_name,
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

  // Fetch attached media for these updates and generate signed URLs
  const updateIds = (updates || []).map(u => u.id);
  const mediaByUpdate = {};

  if (updateIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await admin
      .from("update_media")
      .select("id, update_id, media_url, media_type, caption")
      .in("update_id", updateIds);

    if (mediaError) {
      console.error("Media query error (continuing without media):", mediaError);
    } else if (mediaRows && mediaRows.length > 0) {
      const paths = mediaRows.map(m => m.media_url);
      const { data: signedData, error: signedError } = await admin.storage
        .from("update-media")
        .createSignedUrls(paths, SIGNED_URL_EXPIRY);

      if (!signedError && signedData) {
        const urlMap = {};
        signedData.forEach(item => {
          if (item.signedUrl && !item.error) urlMap[item.path] = item.signedUrl;
        });

        mediaRows.forEach(m => {
          if (!mediaByUpdate[m.update_id]) mediaByUpdate[m.update_id] = [];
          mediaByUpdate[m.update_id].push({
            id: m.id,
            url: urlMap[m.media_url],
            type: m.media_type,
            caption: m.caption,
          });
        });
      } else if (signedError) {
        console.error("Signed URL error:", signedError);
      }
    }
  }

  const updatesWithMedia = (updates || []).map(u => ({
    ...u,
    media: mediaByUpdate[u.id] || [],
  }));

  return res.status(200).json({
    updates: updatesWithMedia,
    clients: linkedClients,
  });
}
