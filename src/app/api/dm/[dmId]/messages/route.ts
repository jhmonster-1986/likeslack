import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ dmId: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { dmId } = await params;

    const messages = await prisma.message.findMany({
      where: { dmChannelId: dmId, parentId: null },
      include: {
        user: { select: { id: true, name: true, avatar: true, status: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        files: true,
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get DM messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
