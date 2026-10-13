// Shared by proxy.ts and lib/dal.ts. The cookie holds a random token; only
// its SHA-256 hash is stored in the sessions collection.
export const SESSION_COOKIE = "fusion_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
