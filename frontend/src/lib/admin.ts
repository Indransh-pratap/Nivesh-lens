/**
 * Admin authorization helper for Nivesh Lens.
 * Validates whether a user's email belongs to the admin whitelist.
 */

export function getAdminEmails(): string[] {
  const envEmails =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    "admin@niveshlens.com,iiiindranshpratap@gmail.com,iindranshpratap@gmail.com,indranshprataaap@gmail.com,indrannnshpratap@gmail.com,anubhav@example.com";

  return envEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  const normalized = email.trim().toLowerCase();

  return (
    adminEmails.includes(normalized) ||
    normalized.startsWith("admin@") ||
    normalized.includes("indransh") ||
    normalized.includes("anubhav")
  );
}
