import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { content } = await req.json();

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (message.userId !== authUser.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.message.update({
      where: { id },
      data: { content },
      include: {
        user: { select: { id: true, name: true, avatar: true, status: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        files: true,
        _count: { select: { replies: true } },
      },
    });

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (message.userId !== authUser.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.message.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
