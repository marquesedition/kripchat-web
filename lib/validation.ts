export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(normalizeUsername(value));
}

export function sanitizeMessage(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 2000);
}
