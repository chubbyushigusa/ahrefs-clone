import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

const PLAN_LIMITS = {
  free: { siteExplorer: -1, audit: -1, keywords: -1, rankTracker: -1 },
  pro: { siteExplorer: 50, audit: 5, keywords: 100, rankTracker: 50 },
  business: { siteExplorer: -1, audit: -1, keywords: -1, rankTracker: -1 },
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
}

export async function checkUsageLimit(userId: string, plan: string, feature: keyof typeof PLAN_LIMITS.free) {
  const limits = getPlanLimits(plan);
  const limit = limits[feature];
  if (limit === -1) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let count = 0;
  switch (feature) {
    case "siteExplorer":
      count = await prisma.domainAnalysis.count({
        where: { userId, createdAt: { gte: today } },
      });
      break;
    case "audit":
      count = await prisma.siteAudit.count({
        where: { userId, createdAt: { gte: today } },
      });
      break;
    case "keywords":
      count = await prisma.keywordSearch.count({
        where: { userId, createdAt: { gte: today } },
      });
      break;
    case "rankTracker":
      count = await prisma.trackedKeyword.count({
        where: { project: { userId } },
      });
      break;
  }

  return count < limit;
}
