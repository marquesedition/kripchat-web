export function formatOpsCode(username?: string | null) {
  const clean = (username ?? "secure_peer").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const left = clean.slice(0, 2).padEnd(2, "X");
  const seed = clean.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  return `${left}-${String(seed % 1000).padStart(3, "0")}`;
}

export function formatShortId(value: string) {
  return value.slice(0, 4).toUpperCase();
}
