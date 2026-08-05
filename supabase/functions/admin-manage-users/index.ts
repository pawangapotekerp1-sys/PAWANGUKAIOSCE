import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleAdminManageUsersRequest } from "./handler.ts";

Deno.serve((req) =>
  handleAdminManageUsersRequest(req, {
    handleCors,
    jsonResponse,
    requireAdmin,
  }));
