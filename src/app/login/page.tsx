import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { getSession, hasAnyUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // With no account yet, the only sensible destination is setup — otherwise the
  // first run is a login screen no password can ever satisfy.
  if (!(await hasAnyUser())) redirect("/setup");
  if (await getSession()) redirect("/");

  return <LoginForm />;
}
