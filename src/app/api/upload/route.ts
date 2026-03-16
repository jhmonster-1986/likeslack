import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const savedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);

      const fileRecord = await prisma.fileAttachment.create({
        data: {
          name: file.name,
          url: `/uploads/${uniqueName}`,
          size: file.size,
          type: file.type,
        },
      });

      savedFiles.push(fileRecord);
    }

    return NextResponse.json({ files: savedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
