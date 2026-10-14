import { prisma } from '../../config/prisma.js';
import { settingsService } from '../settings/settings.service.js';
import { resendDriver } from './drivers/resend.driver.js';
import { twilioSmsDriver, twilioWhatsappDriver } from './drivers/twilio.driver.js';
import { DEFAULT_TEMPLATES } from './notifications.defaults.js';

const DRIVERS = {
  EMAIL: resendDriver,
  SMS: twilioSmsDriver,
  WHATSAPP: twilioWhatsappDriver,
};

const ALL_EVENTS = ['VOUCHER_CREATED', 'PAYMENT_RECEIVED', 'DUES_REMINDER'];
const ALL_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];

// Substitutes {{name}} placeholders in a string with values from `vars`.
// Missing keys render as empty so a partially-filled context doesn't leak
// "{{undefined}}" into a parent's inbox.
const renderTemplate = (str, vars) => {
  if (!str) return '';
  return String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
};

const fmtMoney = (n) => Number(n || 0).toLocaleString('en-PK');
const fmtDate = (d, format) => {
  if (!d) return '';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  if (format === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
  if (format === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
  if (format === 'DD MMM YYYY') {
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()];
    return `${dd} ${M} ${yyyy}`;
  }
  return `${dd}/${mm}/${yyyy}`;
};

// Pulls the recipient address for a given channel off a Student row. Returns
// null for missing fields so the dispatcher can log SKIPPED with a clear
// reason rather than calling the driver with garbage.
const recipientFor = (student, channel) => {
  if (!student) return null;
  if (channel === 'EMAIL') return student.email || null;
  if (channel === 'SMS' || channel === 'WHATSAPP') return student.phone || null;
  return null;
};

const channelEnabled = (settings, channel) => {
  if (channel === 'EMAIL') return Boolean(settings.notificationsEmailEnabled);
  if (channel === 'SMS') return Boolean(settings.notificationsSmsEnabled);
  if (channel === 'WHATSAPP') return Boolean(settings.notificationsWhatsappEnabled);
  return false;
};

const fromAddress = (settings, channel) => {
  if (channel === 'EMAIL') return settings.notificationsEmailFrom;
  if (channel === 'SMS') return settings.notificationsSmsFrom;
  if (channel === 'WHATSAPP') return settings.notificationsWhatsappFrom;
  return null;
};

export const notificationsService = {
  // Idempotent — if a (event, channel) row exists we reuse it and only
  // create the missing ones. Lets us add new event types in the future
  // without clobbering whatever the admin has customized.
  ensureDefaults: async () => {
    const existing = await prisma.notificationTemplate.findMany({
      select: { event: true, channel: true },
    });
    const seen = new Set(existing.map((t) => `${t.event}:${t.channel}`));
    const toCreate = DEFAULT_TEMPLATES.filter((t) => !seen.has(`${t.event}:${t.channel}`));
    if (toCreate.length === 0) return;
    await prisma.notificationTemplate.createMany({ data: toCreate });
  },

  listTemplates: async () => {
    await notificationsService.ensureDefaults();
    return prisma.notificationTemplate.findMany({
      orderBy: [{ event: 'asc' }, { channel: 'asc' }],
    });
  },

  updateTemplate: async (id, data) => {
    return prisma.notificationTemplate.update({
      where: { id },
      data: {
        subject: data.subject,
        body: data.body,
        enabled: data.enabled,
      },
    });
  },

  // Recent send history — defaults to last 50, capped at 200.
  listLogs: async ({ limit = 50 } = {}) => {
    return prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, Number(limit) || 50)),
    });
  },

  // Helper for the "Send test" button. Renders the template with sample
  // data and dispatches to a single recipient via the requested channel.
  sendTest: async ({ event, channel, recipient }) => {
    if (!ALL_EVENTS.includes(event)) throw new Error('Unknown event');
    if (!ALL_CHANNELS.includes(channel)) throw new Error('Unknown channel');
    if (!recipient) throw new Error('Recipient is required');

    await notificationsService.ensureDefaults();
    const settings = await settingsService.get();
    const template = await prisma.notificationTemplate.findUnique({
      where: { event_channel: { event, channel } },
    });
    if (!template) throw new Error('Template not found');

    const vars = {
      schoolName: settings.schoolName,
      studentName: 'Sample Student',
      class: 'Class 5',
      voucherNumber: 'V-2026-TEST',
      month: 'May 2026',
      totalPayable: fmtMoney(2500),
      paidAmount: fmtMoney(2500),
      balance: fmtMoney(0),
      dueDate: fmtDate(new Date(Date.now() + 5 * 86400000), settings.dateFormat),
    };

    const subject = renderTemplate(template.subject, vars);
    const body = renderTemplate(template.body, vars);
    const from = fromAddress(settings, channel);
    if (!from) {
      const log = await prisma.notificationLog.create({
        data: {
          event, channel, recipient,
          subject: subject || null, body,
          status: 'SKIPPED',
          errorMessage: `No "from" address configured for ${channel}`,
        },
      });
      return log;
    }

    const driver = DRIVERS[channel];
    const result = await driver.send({ from, to: recipient, subject, body });
    return prisma.notificationLog.create({
      data: {
        event, channel, recipient,
        subject: subject || null, body,
        status: result.status,
        errorMessage: result.error || null,
      },
    });
  },

  // Fan-out for an event — finds the matching templates, renders, dispatches
  // across enabled channels, logs every attempt. Returns the created logs
  // so the caller (voucher service) can see what happened, but never throws
  // — a notification failure must not roll back the originating action.
  dispatchEvent: async ({ event, student, voucher }) => {
    try {
      await notificationsService.ensureDefaults();
      const settings = await settingsService.get();

      const templates = await prisma.notificationTemplate.findMany({
        where: { event, enabled: true },
      });
      if (templates.length === 0) return [];

      const vars = {
        schoolName: settings.schoolName,
        studentName: `${student?.firstName || ''} ${student?.lastName || ''}`.trim(),
        class: student?.class || '',
        voucherNumber: voucher?.voucherNumber || '',
        month: voucher?.month || '',
        totalPayable: fmtMoney(voucher?.totalPayable),
        paidAmount: fmtMoney(voucher?.paidAmount),
        balance: fmtMoney(Number(voucher?.totalPayable || 0) - Number(voucher?.paidAmount || 0)),
        dueDate: fmtDate(voucher?.dueDate, settings.dateFormat),
      };

      const logs = [];
      for (const template of templates) {
        const channel = template.channel;
        const recipient = recipientFor(student, channel);

        const baseLog = {
          event, channel,
          studentId: student?.id || null,
          voucherId: voucher?.id || null,
          subject: renderTemplate(template.subject, vars) || null,
          body: renderTemplate(template.body, vars),
          recipient: recipient || '(none)',
        };

        if (!channelEnabled(settings, channel)) {
          logs.push(await prisma.notificationLog.create({
            data: { ...baseLog, status: 'SKIPPED', errorMessage: `${channel} channel disabled` },
          }));
          continue;
        }
        if (!recipient) {
          logs.push(await prisma.notificationLog.create({
            data: { ...baseLog, status: 'SKIPPED', errorMessage: `No recipient on student for ${channel}` },
          }));
          continue;
        }
        const from = fromAddress(settings, channel);
        if (!from) {
          logs.push(await prisma.notificationLog.create({
            data: { ...baseLog, status: 'SKIPPED', errorMessage: `No "from" address configured for ${channel}` },
          }));
          continue;
        }

        const driver = DRIVERS[channel];
        const result = await driver.send({ from, to: recipient, subject: baseLog.subject, body: baseLog.body });
        logs.push(await prisma.notificationLog.create({
          data: { ...baseLog, status: result.status, errorMessage: result.error || null },
        }));
      }
      return logs;
    } catch (e) {
      console.error('[notifications.dispatchEvent]', e);
      return [];
    }
  },
};
