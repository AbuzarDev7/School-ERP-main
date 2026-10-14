import { createBrowserRouter } from "react-router-dom"
import DashboardLayout from "@/layouts/DashboardLayout"
import Dashboard from "@/screens/dashboard/Dashboard"
import Students from "@/screens/students/Students"
import StudentFormScreen from "@/screens/students/StudentFormScreen"
import FeeHeads from "@/screens/fees/FeeHeads"
import FeeStructure from "@/screens/fees/FeeStructure"
import VoucherGenerator from "@/screens/fees/VoucherGenerator"
import Payments from "@/screens/payments/Payments"
import Reports from "@/screens/reports/Reports"
import Product from "@/screens/products/Products"
import Invoices from "@/screens/invoices/Invoices"
import SalaryManagement from "@/screens/salary/SalaryManagement" // Ensure path casing matches the folder
import PaymentMethods from "@/screens/paymentMethods/PaymentMethods"
import Expenses from "@/screens/expenses/Expenses"
import Login from "@/screens/auth/Login"
import Signup from "@/screens/auth/Signup"
import Settings from "@/screens/settings/Settings"
import NotFound from "@/screens/error/NotFound"
import UserManagement from "@/screens/users/UserManagement"
import ProtectedRoute from "@/components/ProtectedRoute"


// Pages (temporary placeholders)

export const router = createBrowserRouter([
  {
    // Public routes for authentication
    // These routes render directly without a layout wrapper
    path: "/auth",
    children: [
      { path: "login", element: <Login /> },
      // { path: "signup", element: <Signup /> }, // Uncomment if you want to enable signup
    ],
  },
  {
    path: "/", // Protected routes
    element: <ProtectedRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT"]} />, // All authenticated users can access
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "students", element: <Students /> },
          { path: "students/new", element: <StudentFormScreen /> },
          { path: "fees", children: [
            // { path: "", element: <FeeHeads /> },
            { path: "", element: <FeeStructure /> },
            { path: "vouchers", element: <VoucherGenerator /> },
          ] },
          { path: "commerce", children: [
            { path: "products", element: <Product /> },
            { path: "invoices", element: <Invoices /> },
          ] },
          { path: "payments", element: <Payments /> },
          { path: "salary", element: <SalaryManagement /> },
          { path: "payment-methods", element: <PaymentMethods /> },
          { path: "expenses", element: <Expenses /> },
          { path: "reports", element: <Reports /> },
          { path: "settings", element: <Settings /> },
          { path: "users", element: <UserManagement /> },
          // 404 sits inside the layout so users keep the sidebar + header
          // context. Any unknown path under "/" lands here.
          { path: "*", element: <NotFound /> },
        ]
      }
    ],
  },
])