import type { ShieldPrimitive } from "./types";

export const KRIPCHAT_SHIELD_PROTOCOL = {
  name: "KripChat Shield Protocol",
  version: 1,
  envelopeAlgorithm: "kripchat-shield-v1",
  sessionMode: "hybrid-signal-ratchet",
  primitives: ["x25519", "ml-kem", "hkdf-sha256", "aes-256-gcm", "xchacha20-poly1305", "ed25519"] satisfies ShieldPrimitive[],
  goals: [
    "one independent encrypted envelope per recipient device",
    "forward secrecy through per-device ratcheted sessions",
    "post-compromise recovery after new DH ratchet steps",
    "hybrid post-quantum key agreement for new sessions",
    "metadata minimization through generic push bodies and padded message buckets"
  ],
  nonGoals: [
    "inventing unaudited custom cryptographic primitives",
    "claiming Signal-grade or audited security before external review",
    "using UI-only plan limits as a security boundary"
  ]
} as const;

export function buildShieldSessionId(input: {
  conversationId: string;
  localDeviceId: string;
  remoteDeviceId: string;
}) {
  const orderedDevicePair = [input.localDeviceId, input.remoteDeviceId].sort().join(":");
  return `shield:v1:${input.conversationId}:${orderedDevicePair}`;
}

export function getShieldPaddingBucket(plaintextBytes: number) {
  if (plaintextBytes <= 256) return 256;
  if (plaintextBytes <= 1024) return 1024;
  if (plaintextBytes <= 4096) return 4096;
  if (plaintextBytes <= 16384) return 16384;
  return 65536;
}
