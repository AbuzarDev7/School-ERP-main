// Single Twilio client backs both SMS and WhatsApp — same SDK, different
// "from" address format. We build two driver objects but share the lazy
// loader so we only resolve the SDK once per process.

let cachedClient = null;
let resolved = false;

const loadClient = async () => {
  if (resolved) return cachedClient;
  resolved = true;
  try {
    const mod = await import('twilio');
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      console.warn('[notifications.twilio] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set; SMS + WhatsApp disabled.');
      return null;
    }
    const factory = mod.default || mod;
    cachedClient = factory(sid, token);
    return cachedClient;
  } catch (e) {
    if (e?.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn('[notifications.twilio] twilio package not installed; run `npm install twilio` to enable SMS + WhatsApp.');
    } else {
      console.error('[notifications.twilio] driver load failed:', e?.message);
    }
    return null;
  }
};

const sendVia = async ({ from, to, body }) => {
  const client = await loadClient();
  if (!client) {
    return { status: 'SKIPPED', error: 'Twilio driver not configured (missing package or credentials)' };
  }
  try {
    await client.messages.create({ from, to, body });
    return { status: 'SENT' };
  } catch (e) {
    return { status: 'FAILED', error: e?.message || 'Unknown Twilio error' };
  }
};

export const twilioSmsDriver = {
  channel: 'SMS',
  isReady: async () => Boolean(await loadClient()),
  send: async ({ from, to, body }) => sendVia({ from, to, body }),
};

// WhatsApp uses Twilio's `whatsapp:` URI prefix on both ends. We normalize
// here so callers don't have to remember to prefix the recipient.
const ensureWhatsappPrefix = (n) => {
  if (!n) return n;
  return n.startsWith('whatsapp:') ? n : `whatsapp:${n}`;
};

export const twilioWhatsappDriver = {
  channel: 'WHATSAPP',
  isReady: async () => Boolean(await loadClient()),
  send: async ({ from, to, body }) =>
    sendVia({ from: ensureWhatsappPrefix(from), to: ensureWhatsappPrefix(to), body }),
};
