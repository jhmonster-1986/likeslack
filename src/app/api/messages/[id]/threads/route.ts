import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const REPLY_INCLUDE = {
  user: { select: { id: true, name: true, avatar: true, status: true } },
  reactions: { include: { user: { select: { id: true, name: true } } } },
  files: true,
  _count: { select: { replies: true } },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: parentId } = await params;

    const parent = await prisma.message.findUnique({
      where: { id: parentId },
      include: REPLY_INCLUDE,
    });

    if (!parent) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const replies = await prisma.message.findMany({
      where: { parentId },
      include: REPLY_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ parent, replies });
  } catch (error) {
    console.error('Get thread error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: parentId } = await params;
    const { content } = await req.json();

    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const parent = await prisma.message.findUnique({ where: { id: parentId } });
    if (!parent) return NextResponse.json({ error: 'Parent message not found' }, { status: 404 });

    const reply = await prisma.message.create({
      data: {
        content,
        userId: authUser.userId,
        parentId,
        channelId: parent.channelId,
        dmChannelId: parent.dmChannelId,
      },
      include: REPLY_INCLUDE,
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error('Create reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
