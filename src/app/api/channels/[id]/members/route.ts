import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: id, userId: authUser.userId } },
      create: { channelId: id, userId: authUser.userId },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Join channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
