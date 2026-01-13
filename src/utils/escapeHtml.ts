/**
 * Escape HTML entities to prevent XSS attacks
 * Use this for any user-generated content that will be inserted into innerHTML
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape HTML entities for use in HTML attributes
 * Same as escapeHtml but also escapes backticks
 */
export function escapeAttr(str: string | null | undefined): string {
  if (!str) return '';

  return escapeHtml(str).replace(/`/g, '&#96;');
}
