import { redirect } from "next/navigation";

import { SetupForm } from "@/components/SetupForm";
import { hasAnyUser } from "@/lib/auth";

// Whether this page should exist is a database question, so it can never be
// answered once at build time and cached.
export const dynamic = "force-dynamic";

/**
 * Creates the one account, then closes for good.
 *
 * The check runs here as well as inside the action: the page must not render a form
 * that cannot work, and the action must not trust that the page checked.
 */
export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/login");
  return <SetupForm />;
}
