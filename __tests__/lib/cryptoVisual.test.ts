import { createCipherPreview, revealCipherText } from "@/lib/cryptoVisual";

describe("cryptoVisual helpers", () => {
  it("creates deterministic cipher previews for the same body and seed", () => {
    const body = "Payload ready for secure relay";
    const first = createCipherPreview(body, "seed-1");
    const second = createCipherPreview(body, "seed-1");
    const third = createCipherPreview(body, "seed-2");

    expect(first).toBe(second);
    expect(first).not.toBe(third);
    expect(first).toHaveLength(body.length);
  });

  it("reveals progressively more of the original text", () => {
    const body = "Uploading document now";
    const cipher = createCipherPreview(body, "ops-seed");

    expect(revealCipherText(body, cipher, 0)).toBe(cipher);
    expect(revealCipherText(body, cipher, 1)).toBe(body);
    expect(revealCipherText(body, cipher, 0.5)).toContain("Uploading");
  });
});
