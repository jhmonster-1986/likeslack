import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MESSAGE_INCLUDE = {
  user: { select: { id: true, name: true, avatar: true, status: true } },
  reactions: { include: { user: { select: { id: true, name: true } } } },
  files: true,
  _count: { select: { replies: true } },
};

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');
    const dmChannelId = searchParams.get('dmChannelId');
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!channelId && !dmChannelId) {
      return NextResponse.json({ error: 'channelId or dmChannelId required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      parentId: null,
      ...(channelId && { channelId }),
      ...(dmChannelId && { dmChannelId }),
      ...(before && { createdAt: { lt: new Date(before) } }),
    };

    const messages = await prisma.message.findMany({
      where,
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, channelId, dmChannelId, fileIds } = await req.json();
    if (!content && (!fileIds || fileIds.length === 0)) {
      return NextResponse.json({ error: 'Content or files required' }, { status: 400 });
    }
    if (!channelId && !dmChannelId) {
      return NextResponse.json({ error: 'channelId or dmChannelId required' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content: content || '',
        userId: authUser.userId,
        channelId,
        dmChannelId,
        ...(fileIds && fileIds.length > 0 && {
          files: { connect: fileIds.map((id: string) => ({ id })) },
        }),
      },
      include: MESSAGE_INCLUDE,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
