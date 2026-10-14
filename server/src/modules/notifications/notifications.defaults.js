// Default templates seeded the first time the admin opens the Notifications
// tab. Placeholder syntax is `{{name}}` and is rendered server-side at
// dispatch time — see `renderTemplate` in notifications.service.js.

export const DEFAULT_TEMPLATES = [
  // VOUCHER_CREATED
  {
    event: 'VOUCHER_CREATED',
    channel: 'EMAIL',
    subject: 'Fee Voucher {{voucherNumber}} for {{month}}',
    body:
      'Dear Parent / Guardian,\n\n' +
      'A new fee voucher has been generated for {{studentName}} ({{class}}).\n\n' +
      'Voucher #: {{voucherNumber}}\n' +
      'Month: {{month}}\n' +
      'Total Payable: Rs. {{totalPayable}}\n' +
      'Due Date: {{dueDate}}\n\n' +
      'Please ensure the fee is paid before the due date to avoid late charges.\n\n' +
      'Regards,\n' +
      '{{schoolName}}',
  },
  {
    event: 'VOUCHER_CREATED',
    channel: 'SMS',
    body:
      '{{schoolName}}: Voucher {{voucherNumber}} generated for {{studentName}} ({{class}}). ' +
      'Amount Rs.{{totalPayable}}, Due {{dueDate}}.',
  },
  {
    event: 'VOUCHER_CREATED',
    channel: 'WHATSAPP',
    body:
      'Hello! A new fee voucher *{{voucherNumber}}* has been generated for *{{studentName}}* ({{class}}).\n\n' +
      '🧾 Amount: Rs. {{totalPayable}}\n' +
      '📅 Due: {{dueDate}}\n\n' +
      '— {{schoolName}}',
  },

  // PAYMENT_RECEIVED — reserved for future use; templates ship so the admin
  // can edit them ahead of enabling the trigger.
  {
    event: 'PAYMENT_RECEIVED',
    channel: 'EMAIL',
    subject: 'Payment received — {{voucherNumber}}',
    body:
      'Dear Parent / Guardian,\n\n' +
      'We have received Rs. {{paidAmount}} against voucher {{voucherNumber}} for {{studentName}}.\n' +
      'Outstanding balance: Rs. {{balance}}\n\n' +
      'Thank you,\n{{schoolName}}',
  },
  {
    event: 'PAYMENT_RECEIVED',
    channel: 'SMS',
    body: '{{schoolName}}: Rs.{{paidAmount}} received for {{studentName}} ({{voucherNumber}}). Balance Rs.{{balance}}.',
  },
  {
    event: 'PAYMENT_RECEIVED',
    channel: 'WHATSAPP',
    body:
      '✅ *Payment received*\n\n' +
      'Rs. {{paidAmount}} for *{{studentName}}* ({{voucherNumber}}).\n' +
      'Balance: Rs. {{balance}}\n\n' +
      '— {{schoolName}}',
  },

  // DUES_REMINDER — reserved.
  {
    event: 'DUES_REMINDER',
    channel: 'EMAIL',
    subject: 'Reminder: outstanding fee voucher {{voucherNumber}}',
    body:
      'Dear Parent / Guardian,\n\n' +
      'This is a reminder that voucher {{voucherNumber}} for {{studentName}} ({{class}}) is overdue.\n\n' +
      'Outstanding: Rs. {{balance}}\n' +
      'Original due: {{dueDate}}\n\n' +
      'Please clear the dues at your earliest convenience.\n\n' +
      '— {{schoolName}}',
  },
  {
    event: 'DUES_REMINDER',
    channel: 'SMS',
    body: '{{schoolName}}: Reminder — Rs.{{balance}} pending for {{studentName}} ({{voucherNumber}}).',
  },
  {
    event: 'DUES_REMINDER',
    channel: 'WHATSAPP',
    body:
      '⏰ *Fee reminder*\n\n' +
      '*{{studentName}}* ({{class}}) has Rs. {{balance}} pending against voucher *{{voucherNumber}}* (due {{dueDate}}).\n\n' +
      '— {{schoolName}}',
  },
];
