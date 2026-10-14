// Static catalog. Adding a permission here makes it available in the role
// editor's checkbox list on the next server boot — no migration required.
// Removing one is a soft delete: the row stays in the DB but disappears
// from the editor; existing role assignments are silently ignored.

export const PERMISSION_CATALOG = [
  // Students
  { key: 'students.view', label: 'View students', category: 'Students' },
  { key: 'students.create', label: 'Register new students', category: 'Students' },
  { key: 'students.edit', label: 'Edit student records', category: 'Students' },
  { key: 'students.delete', label: 'Deactivate / delete students', category: 'Students' },

  // Fees
  { key: 'fees.view', label: 'View fee structure & heads', category: 'Fees' },
  { key: 'fees.manage', label: 'Manage fee structure & heads', category: 'Fees' },

  // Vouchers
  { key: 'vouchers.view', label: 'View vouchers', category: 'Vouchers' },
  { key: 'vouchers.create', label: 'Generate vouchers', category: 'Vouchers' },
  { key: 'vouchers.edit', label: 'Edit unpaid vouchers', category: 'Vouchers' },
  { key: 'vouchers.delete', label: 'Delete vouchers', category: 'Vouchers' },
  { key: 'vouchers.collect', label: 'Collect fee payments', category: 'Vouchers' },

  // Payments / cashbook
  { key: 'payments.view', label: 'View payment methods & cashbook', category: 'Payments' },
  { key: 'payments.manage', label: 'Manage payment methods & transfers', category: 'Payments' },

  // Expenses
  { key: 'expenses.view', label: 'View expenses', category: 'Expenses' },
  { key: 'expenses.manage', label: 'Record & manage expenses', category: 'Expenses' },

  // Salary
  { key: 'salary.view', label: 'View staff & payroll', category: 'Salary' },
  { key: 'salary.manage', label: 'Manage staff, advances & payroll', category: 'Salary' },

  // Commerce
  { key: 'products.view', label: 'View products', category: 'Commerce' },
  { key: 'products.manage', label: 'Manage products', category: 'Commerce' },
  { key: 'invoices.view', label: 'View invoices', category: 'Commerce' },
  { key: 'invoices.manage', label: 'Create & manage invoices', category: 'Commerce' },

  // Reports
  { key: 'reports.view', label: 'View reports', category: 'Reports' },

  // Admin / settings
  { key: 'settings.view', label: 'View settings', category: 'Admin' },
  { key: 'settings.manage', label: 'Manage settings', category: 'Admin' },
  { key: 'users.manage', label: 'Manage users & roles', category: 'Admin' },
  { key: 'activity.view', label: 'View activity log', category: 'Admin' },
  { key: 'data.export', label: 'Export data', category: 'Admin' },
  { key: 'data.danger', label: 'Reset academic year / wipe data', category: 'Admin' },
];

// System roles — created on first boot, can be edited but never deleted
// or renamed. Permissions referenced by key; the seeder resolves them to
// the actual rows after the catalog is in place.
//
// "Admin" gets every permission in the catalog (we expand at seed time);
// the others get a curated baseline that the admin can tweak later.
export const SYSTEM_ROLES = [
  {
    name: 'Admin',
    description: 'Full access to every feature.',
    permissions: '*', // expanded to all keys at seed time
  },
  {
    name: 'Teacher',
    description: 'Read-only access to students, vouchers and reports.',
    permissions: [
      'students.view',
      'vouchers.view',
      'vouchers.collect',
      'payments.view',
      'reports.view',
    ],
  },
  {
    name: 'Cashier',
    description: 'Voucher generation, fee collection and basic reports.',
    permissions: [
      'students.view',
      'vouchers.view',
      'vouchers.create',
      'vouchers.edit',
      'vouchers.collect',
      'payments.view',
      'reports.view',
    ],
  },
];
