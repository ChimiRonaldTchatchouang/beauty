import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { skinProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMonthlyUsage } from "@/lib/quota";
import { ProfileView } from "@/components/views/ProfileView";

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  const [profile] = await db
    .select()
    .from(skinProfiles)
    .where(eq(skinProfiles.userId, user.id))
    .limit(1);
  const usage = await getMonthlyUsage(user.id, user.plan);

  return (
    <ProfileView
      user={{
        name: user.name,
        email: user.email,
        plan: user.plan,
        lang: user.lang,
        notifyRoutine: user.notifyRoutine,
        notifyScan: user.notifyScan,
      }}
      profile={profile ?? null}
      usage={usage}
    />
  );
}
