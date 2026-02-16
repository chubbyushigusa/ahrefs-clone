import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [siteExplorer, keywords, audit, projects] = await Promise.all([
      prisma.domainAnalysis.count({
        where: { userId: user.id, createdAt: { gte: today } },
      }),
      prisma.keywordSearch.count({
        where: { userId: user.id, createdAt: { gte: today } },
      }),
      prisma.siteAudit.count({
        where: { userId: user.id, createdAt: { gte: today } },
      }),
      prisma.project.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({
      plan: user.plan,
      usage: { siteExplorer, keywords, audit, projects },
    });
  } catch {
    return NextResponse.json({ error: "使用状況の取得に失敗しました" }, { status: 500 });
  }
}
