import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { router } from "./app/router"
import "./index.css"
import Providers from "./app/providers"

import { Toaster } from "@/components/ui/sonner"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
  <Providers>
    <RouterProvider router={router} />
  </Providers>
  <Toaster position="bottom-right" richColors closeButton />
  </React.StrictMode>
)