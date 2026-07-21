/**
 * Only same-origin relative paths are valid redirect targets.
 * Blocks absolute/protocol-relative URLs to prevent open-redirect attacks.
 */
export const isSafeRedirect = (path: string | null | undefined): path is string => {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  return true;
};

/**
 * Appends ?redirectTo=<path> to a URL, only if redirectTo is present and safe.
 * Use this any time you navigate/link to /login, /signup, or the Google OAuth entrypoint.
 */
export const withRedirect = (path: string, redirectTo?: string | null): string => {
  if (!isSafeRedirect(redirectTo)) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirectTo=${encodeURIComponent(redirectTo)}`;
};