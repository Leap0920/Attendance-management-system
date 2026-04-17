/**
 * Generate uppercase initials from a first and last name.
 * Handles missing names, single names, and empty strings.
 *
 * Examples:
 *   getInitials('Justin', 'Rivera') → 'JR'
 *   getInitials('Justin')           → 'J'
 *   getInitials(undefined, undefined) → '?'
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();

  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  if (l) return l[0].toUpperCase();
  return '?';
}
