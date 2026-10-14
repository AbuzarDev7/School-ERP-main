// Resend driver. Loads the SDK lazily so the server can boot — and
// notifications can be drafted/edited — even before `npm install resend`.
// When the package or API key is missing, the driver returns a "skipped"
// outcome that the dispatcher records in NotificationLog.

let cachedResend = null;
let resolved = false; // prevents re-importing on every send when the package is genuinely absent

const loadClient = async () => {
  if (resolved) return cachedResend;
  resolved = true;
  try {
    const mod = await import('resend');
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[notifications.resend] RESEND_API_KEY not set; email channel disabled.');
      return null;
    }
    cachedResend = new mod.Resend(apiKey);
    return cachedResend;
  } catch (e) {
    if (e?.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn('[notifications.resend] resend package not installed; run `npm install resend` to enable email.');
    } else {
      console.error('[notifications.resend] driver load failed:', e?.message);
    }
    return null;
  }
};

export const resendDriver = {
  channel: 'EMAIL',

  isReady: async () => Boolean(await loadClient()),

  send: async ({ from, to, subject, body }) => {
    const client = await loadClient();
    if (!client) {
      return { status: 'SKIPPED', error: 'Email driver not configured (missing package or API key)' };
    }
    try {
      const { error } = await client.emails.send({
        from,
        to,
        subject: subject || '(no subject)',
        text: body,
      });
      if (error) return { status: 'FAILED', error: error.message || String(error) };
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: e?.message || 'Unknown email error' };
    }
  },
};
