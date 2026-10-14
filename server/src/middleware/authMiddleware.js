// server/src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Refuse to boot without a real secret. Falling back to a hardcoded value
  // would silently sign tokens that anyone with the source can forge.
  throw new Error("JWT_SECRET environment variable is required. Set it in .env before starting the server.");
}

// Prisma error codes that indicate the database is unreachable rather than a
// real auth failure. Returning 401 for these would log a valid user out on
// every transient connection blip, which was the cause of users being kicked
// out of "Remember me" sessions.
const PRISMA_CONNECTION_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Connection timed out
  'P1008', // Operations timed out
  'P1017', // Server closed the connection
  'P2024', // Connection pool timeout
]);

const isConnectionError = (err) =>
  PRISMA_CONNECTION_CODES.has(err?.code) ||
  /can't reach database server/i.test(err?.message || '');

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = header.split(' ')[1];

  // Verify the JWT first so signature/expiry failures stay as 401 (the
  // client's axios interceptor uses that to decide when to clear the
  // session). Infrastructure errors below should never reach this catch.
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('[auth.protect.jwt]', error.name || error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  // Tokens minted before sessions were introduced have no sessionId. We
  // reject them so the user re-logs in and gets a tracked session — this
  // is a one-time forced re-auth after the security upgrade.
  if (!decoded.sessionId) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true, avatarUrl: true, lastLoginAt: true },
        },
      },
    });
    if (!session || session.userId !== decoded.userId) {
      return res.status(401).json({ message: 'Session not found' });
    }
    if (session.revokedAt) {
      return res.status(401).json({ message: 'This session was signed out remotely' });
    }
    if (session.expiresAt && session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    req.user = session.user;
    req.session = { id: session.id };

    // Touch lastUsedAt — fire-and-forget so a transient DB blip doesn't
    // fail the request.
    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return next();
  } catch (error) {
    // DB unreachable → 503, not 401. A 401 here would cause the client to
    // wipe a perfectly valid session on every transient pool hiccup.
    if (isConnectionError(error)) {
      console.error('[auth.protect.db]', error.code || error.message);
      return res.status(503).json({
        message: 'Service temporarily unavailable. Please try again in a moment.',
      });
    }
    console.error('[auth.protect]', error.name || error.message);
    return res.status(500).json({ message: 'Authentication check failed' });
  }
};

export const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user info' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient role' });
    }
    next();
  };
};