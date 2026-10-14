// Single funnel for controller error responses.
//
// Goal: stop leaking Prisma error messages, SQL fragments, and stack traces
// to clients. Errors fall into two buckets:
//
//   1. Intentional user-facing errors — code throws `new Error("Friendly
//      message")` and sets `err.statusCode` to a 4xx. Pass the message
//      through as-is.
//
//   2. Everything else — Prisma errors, programming bugs, unexpected DB
//      failures. Log full details server-side, return a generic message
//      and a correlation id the user can quote in support requests.
//
// Zod errors are already handled at controller call sites; this helper does
// not need a special branch for them.
import { randomUUID } from "crypto";

const isUserFacing = (err) => {
  const code = err?.statusCode;
  return typeof code === "number" && code >= 400 && code < 500;
};

export const sendError = (res, err, fallbackStatus = 500) => {
  if (isUserFacing(err)) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  const correlationId = randomUUID();
  console.error(`[error ${correlationId}]`, err);
  return res.status(fallbackStatus).json({
    error: "Something went wrong on the server. Please try again.",
    correlationId,
  });
};
