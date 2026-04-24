const sendEvents: number[] = [];

export function canSendMessage(now = Date.now()) {
  const windowMs = 10_000;
  while (sendEvents.length && now - sendEvents[0] > windowMs) {
    sendEvents.shift();
  }
  if (sendEvents.length >= 8) return false;
  sendEvents.push(now);
  return true;
}
