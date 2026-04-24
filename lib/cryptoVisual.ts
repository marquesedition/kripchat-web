const cipherAlphabet = "0123456789ABCDEF";

export function createCipherPreview(body: string, seed: string) {
  let hash = 2166136261;
  for (const character of `${seed}:${body}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return body
    .split("")
    .map((character, index) => {
      if (character.trim() === "") return character;
      hash = Math.imul(hash ^ index, 16777619);
      return cipherAlphabet[Math.abs(hash) % cipherAlphabet.length];
    })
    .join("");
}

export function revealCipherText(body: string, cipherText: string, progress: number) {
  const visibleLength = Math.floor(body.length * progress);
  return body
    .split("")
    .map((character, index) => {
      if (character.trim() === "") return character;
      return index < visibleLength ? character : cipherText[index] ?? character;
    })
    .join("");
}
