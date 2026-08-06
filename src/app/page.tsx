import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));
  redirect("/login");
}
