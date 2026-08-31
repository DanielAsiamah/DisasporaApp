/**
 * devConfig.js
 *
 * Developer / tester accounts that receive special in-app privileges:
 *   - Infinite hearts (hearts never decrease, always refill on login)
 *
 * Add any email that should have dev-mode access to DEV_EMAILS below.
 * Matching is case-insensitive.
 */
export const DEV_EMAILS = [
  'danielasiamah2003@gmail.com',
];

/**
 * Returns true if the given email belongs to a dev/tester account.
 * @param {string|null|undefined} email
 * @returns {boolean}
 */
export function isDevAccount(email) {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return DEV_EMAILS.some((dev) => dev.toLowerCase() === lower);
}
