import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { skinProfiles, centers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MeProfile } from "@/components/patient/MeProfile";

export default async function MeProfilePage() {
  const user = (await getCurrentUser())!;
  const [profile] = await db.select().from(skinProfiles).where(eq(skinProfiles.userId, user.id)).limit(1);
  let centerName: string | null = null;
  if (user.centerId) {
    const [c] = await db.select({ name: centers.name }).from(centers).where(eq(centers.id, user.centerId)).limit(1);
    centerName = c?.name ?? null;
  }

  return (
    <MeProfile
      user={{ name: user.name, email: user.email, lang: user.lang, consented: Boolean(user.consentAt) }}
      centerName={centerName}
      profile={{
        skinType: profile?.skinType ?? null,
        ageRange: profile?.ageRange ?? null,
        concerns: profile?.concerns ?? [],
      }}
    />
  );
}
