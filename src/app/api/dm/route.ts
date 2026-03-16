import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dmChannels = await prisma.dMChannel.findMany({
      where: { members: { some: { userId: authUser.userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ dmChannels });
  } catch (error) {
    console.error('Get DMs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await req.json();
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });

    // Check if DM channel already exists between these two users
    const existing = await prisma.dMChannel.findFirst({
      where: {
        AND: [
          { members: { some: { userId: authUser.userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, status: true } } },
        },
      },
    });

    if (existing) return NextResponse.json({ dmChannel: existing });

    const dmChannel = await prisma.dMChannel.create({
      data: {
        members: {
          create: [{ userId: authUser.userId }, { userId: targetUserId }],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, status: true } } },
        },
      },
    });

    return NextResponse.json({ dmChannel }, { status: 201 });
  } catch (error) {
    console.error('Create DM error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
