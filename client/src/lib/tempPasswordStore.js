// Browser-local cache of temporary passwords the current admin generated.
//
// PURPOSE: When an admin invites a user (or resets their password), the server
// returns the plaintext temp password exactly once. The admin then needs to
// share it with the invitee — usually verbally or via a chat app — but often
// closes the dialog before doing so. Re-resetting wastes effort and would
// invalidate the previous password if the invitee already has it. This store
// keeps a copy of the last generated temp password per user, scoped to this
// admin's browser only.
//
// SECURITY NOTES:
//  * Plaintext is stored in localStorage. Anyone with access to this browser
//    (or a same-origin XSS payload) can read it. Acceptable given that the
//    admin generated the password in this same browser context moments ago.
//  * Cleared on user deletion and on admin sign-out so a shared machine
//    doesn't leak it across accounts.
//  * Never sent back to the server.

const KEY_PREFIX = "addsmint_temp_pwd_";

const keyFor = (userId) => `${KEY_PREFIX}${userId}`;

export function saveTempPassword(userId, password) {
  if (!userId || !password) return;
  try {
    localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ password, createdAt: new Date().toISOString() })
    );
  } catch {
    // Quota or disabled storage — silently no-op so it doesn't break the
    // invite/reset flow. Worst case: admin must re-reset to recover the
    // password.
  }
}

export function loadTempPassword(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.password) return null;
    return parsed; // { password, createdAt }
  } catch {
    return null;
  }
}

export function clearTempPassword(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* no-op */
  }
}

// Reads everything in storage at once — used to seed the UsersTab state on
// mount so the per-row "show stored password" affordance is instantly
// available for every user that has one cached.
export function loadAllTempPasswords() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) {
        const userId = k.slice(KEY_PREFIX.length);
        try {
          const parsed = JSON.parse(localStorage.getItem(k));
          if (parsed?.password) out[userId] = parsed;
        } catch {
          /* skip malformed entry */
        }
      }
    }
  } catch {
    /* no-op */
  }
  return out;
}

// Wipe-everything used by AuthContext.logout so leaving the admin account
// on a shared machine doesn't expose generated passwords to the next person
// who signs in.
export function clearAllTempPasswords() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* no-op */
  }
}
