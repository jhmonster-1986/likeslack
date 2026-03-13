import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const channels = await prisma.channel.findMany({
      where: {
        OR: [
          { isPrivate: false },
          { members: { some: { userId: authUser.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description, isPrivate } = await req.json();
    if (!name) return NextResponse.json({ error: 'Channel name required' }, { status: 400 });

    const existing = await prisma.channel.findFirst({ where: { name } });
    if (existing) return NextResponse.json({ error: 'Channel name already exists' }, { status: 409 });

    const channel = await prisma.channel.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        isPrivate: isPrivate || false,
        ownerId: authUser.userId,
        members: { create: { userId: authUser.userId } },
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true, messages: true } },
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
