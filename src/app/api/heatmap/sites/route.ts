import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// List user's registered sites
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const sites = await prisma.heatmapSite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { pageviews: true },
        },
      },
    });

    return NextResponse.json({ sites });
  } catch (e) {
    console.error("heatmap/sites GET error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// Register new site
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { domain, name } = await req.json();
    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "ドメインを入力してください" }, { status: 400 });
    }

    // Normalize domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    // Check if domain already registered
    const existing = await prisma.heatmapSite.findUnique({
      where: { domain: cleanDomain },
    });
    if (existing) {
      if (existing.userId === session.user.id) {
        return NextResponse.json({ site: existing });
      }
      return NextResponse.json({ error: "このドメインは既に登録されています" }, { status: 409 });
    }

    const site = await prisma.heatmapSite.create({
      data: {
        userId: session.user.id,
        domain: cleanDomain,
        name: name || cleanDomain,
      },
    });

    return NextResponse.json({ site }, { status: 201 });
  } catch (e) {
    console.error("heatmap/sites POST error:", e);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

// Delete a site
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { siteId } = await req.json();
    if (!siteId) {
      return NextResponse.json({ error: "サイトIDが必要です" }, { status: 400 });
    }

    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    await prisma.heatmapSite.delete({ where: { id: siteId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("heatmap/sites DELETE error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
