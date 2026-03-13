import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // Auto-join #general channel
    const general = await prisma.channel.findFirst({ where: { name: 'general' } });
    if (general) {
      await prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: general.id, userId: user.id } },
        create: { channelId: general.id, userId: user.id },
        update: {},
      });
    }

    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    const cookieStore = await cookies();
    cookieStore.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, status: user.status, createdAt: user.createdAt },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
