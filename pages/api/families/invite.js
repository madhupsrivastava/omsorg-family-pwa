import { requireAuth, createServerClient } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Only admin or supervisor can invite family members
  const auth = await requireAuth(req, ["admin", "supervisor"]);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { fullName, email, clientId, relationship } = req.body;

  if (!fullName || !email || !clientId) {
    return res.status(400).json({ error: "Name, email and client are required" });
  }

  const supabase = createServerClient();

  try {
    // 1. Check if user already exists
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", email);

    let userId;

    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.role !== "family") {
        return res.status(400).json({ error: "This email belongs to a staff account and cannot be used as a family login." });
      }
      userId = existing.id;
    } else {
      // 2. Create new user in Supabase Auth via admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role: "family" },
        redirectTo: `${process.env.NEXT_PUBLIC_FAMILY_PWA_URL || "https://omsorg-family-pwa.vercel.app"}/auth/callback`,
      });

      if (createError) {
        console.error("Create user error:", createError);
        return res.status(500).json({ error: createError.message });
      }

      userId = newUser.user.id;

      // 3. Ensure user row exists with family role
      const { error: upsertError } = await supabase
        .from("users")
        .upsert({
          id: userId,
          email,
          full_name: fullName,
          role: "family",
          active: true,
        });

      if (upsertError) {
        console.error("Upsert user error:", upsertError);
        return res.status(500).json({ error: upsertError.message });
      }
    }

    // 4. Check if access already linked
    const { data: existingAccess } = await supabase
      .from("family_client_access")
      .select("id")
      .eq("user_id", userId)
      .eq("client_id", clientId)
      .single();

    if (!existingAccess) {
      // 5. Link family member to client
      const { error: linkError } = await supabase
        .from("family_client_access")
        .insert({ user_id: userId, client_id: clientId, relationship: relationship || "family member" });

      if (linkError) {
        console.error("Link error:", linkError);
        return res.status(500).json({ error: linkError.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: existingUsers?.length > 0
        ? "Existing family user linked to client successfully."
        : "Invitation sent! Family member will receive an email to set up their account.",
      userId,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
