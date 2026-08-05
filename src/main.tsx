import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import App from "./App";
import { SessionProvider } from "./lib/auth/session-provider";
import { getQueryClient } from "./lib/supabase/query-client";
import { Toaster } from "sonner";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={getQueryClient()}>
      <SessionProvider>
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
