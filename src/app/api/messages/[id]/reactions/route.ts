import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: messageId } = await params;
    const { emoji } = await req.json();

    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: authUser.userId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: 'removed' });
    } else {
      const reaction = await prisma.reaction.create({
        data: { emoji, messageId, userId: authUser.userId },
        include: { user: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ action: 'added', reaction });
    }
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
