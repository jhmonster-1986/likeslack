import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } },
        _count: { select: { members: true, messages: true } },
      },
    });

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

    // Join channel if not a member
    const isMember = channel.members.some((m) => m.userId === authUser.userId);
    if (!isMember && !channel.isPrivate) {
      await prisma.channelMember.create({ data: { channelId: id, userId: authUser.userId } });
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Get channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (channel.ownerId !== authUser.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.channel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
