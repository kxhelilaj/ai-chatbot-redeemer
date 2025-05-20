import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const PDFS_DIR = path.join(process.cwd(), 'pdfs');

export async function POST(request: NextRequest) {
  try {
    await fs.mkdir(PDFS_DIR, { recursive: true });

    const formData = await request.formData();
    const files = formData.getAll('pdfs') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No PDF files' }, { status: 400 });
    }

    const savedFiles = [];
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(PDFS_DIR, file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
      await fs.writeFile(filePath, buffer);
      savedFiles.push(file.name);
    }

    await execPromise('npx tsx src/scripts/ingest.ts');

    return NextResponse.json({ message: 'Success', files: savedFiles });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
