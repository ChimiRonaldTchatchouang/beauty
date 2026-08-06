import { getCurrentUser } from "@/lib/auth";
import { getMonthlyUsage } from "@/lib/quota";
import { ScanFlow } from "@/components/views/ScanFlow";

export default async function ScanPage() {
  const user = (await getCurrentUser())!;
  const usage = await getMonthlyUsage(user.id, user.plan);
  const quotaReached = usage.remaining !== null && usage.remaining <= 0;
  return <ScanFlow quotaReached={quotaReached} />;
}
