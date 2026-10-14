import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import cors from "cors"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import studentRoutes from "./src/modules/students/student.routes.js"
import feeHeadRoutes from "./src/modules/fee/feeHeads/feeHead.routes.js"
import feeStructureRoutes from "./src/modules/fee/feeStructure/feeStructure.routes.js"
import feeVoucherRoutes from "./src/modules/fee/feeVoucher/voucher.routes.js"
import productRoutes from "./src/modules/products/product.routes.js"
import invoiceRoutes from "./src/modules/invoices/invoice.routes.js"
import discountRoutes from "./src/modules/discounts/discount.routes.js"
import workerRoutes from "./src/modules/workers/worker.routes.js"
import cashbookRoutes from "./src/modules/cashbook/cashbook.routes.js"
import paymentMethodRoutes from "./src/modules/paymentMethods/paymentMethod.routes.js"
import expenseRoutes from "./src/modules/expenses/expense.routes.js"
import authRoutes from "./src/modules/auth/auth.routes.js"
import settingsRoutes from "./src/modules/settings/settings.routes.js"
import dataRoutes from "./src/modules/data/data.routes.js"
// [Notifications disabled — re-enable when launching the feature]
// import notificationsRoutes from "./src/modules/notifications/notifications.routes.js"
import rolesRoutes from "./src/modules/roles/roles.routes.js"
import adminUsersRoutes from "./src/modules/adminUsers/adminUsers.routes.js"
import activityRoutes from "./src/modules/activity/activity.routes.js"
import { protect } from "./src/middleware/authMiddleware.js"
import { sendError } from "./src/utils/sendError.js"


const app = express()

// app.use(cors({
//   origin: process.env.FRONTEND_URL || "",
//   credentials: true
// }))

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
  ].filter(Boolean),
  credentials: true
}))

app.use(express.json())

// Public: authentication endpoints must remain reachable without a token.
app.use("/api/auth", authRoutes)

// Every business route below requires a valid Bearer token. `protect` attaches
// the authenticated user to req.user before the route handlers run.
app.use("/api/students", protect, studentRoutes)
app.use("/api/fee-heads", protect, feeHeadRoutes)
app.use("/api/fee-structures", protect, feeStructureRoutes)
app.use("/api/products", protect, productRoutes)
app.use("/api/invoices", protect, invoiceRoutes)
app.use("/api/fee-vouchers", protect, feeVoucherRoutes)
app.use("/api/discounts", protect, discountRoutes)
app.use("/api/workers", protect, workerRoutes)
app.use("/api/cashbook", protect, cashbookRoutes)
app.use("/api/payment-methods", protect, paymentMethodRoutes)
app.use("/api/expenses", protect, expenseRoutes)
app.use("/api/settings", protect, settingsRoutes)
app.use("/api/data", protect, dataRoutes)
// [Notifications disabled — re-enable when launching the feature]
// app.use("/api/notifications", protect, notificationsRoutes)
app.use("/api/roles", protect, rolesRoutes)
app.use("/api/admin/users", protect, adminUsersRoutes)
app.use("/api/activity", protect, activityRoutes)

// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const uploadsPath = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

// Final safety net: anything that escapes the per-controller try/catch lands
// here. Sanitizes the response so Prisma errors and stack traces never reach
// the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  sendError(res, err);
});


export default app