// Who can open the admin panel: emails in ADMIN_EMAILS (comma-separated), kept out of the public code.
export function isAdmin(email: string | undefined) {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase())
  return admins.includes(email.toLowerCase())
}
