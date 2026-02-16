import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/^www\./, "");
  d = d.replace(/\/.*$/, "");
  return d;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        trackedKeywords: {
          include: {
            rankingHistory: {
              orderBy: { checkedAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "プロジェクト取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { name, domain } = await req.json();
    if (!name?.trim() || !domain?.trim()) {
      return NextResponse.json({ error: "プロジェクト名とドメインを入力してください" }, { status: 400 });
    }

    const cleanedDomain = cleanDomain(domain);

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        domain: cleanedDomain,
        userId: session.user.id,
      },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "プロジェクト作成に失敗しました" }, { status: 500 });
  }
}
