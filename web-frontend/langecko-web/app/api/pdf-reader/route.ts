import { Buffer } from 'node:buffer';

import { NextResponse } from 'next/server';
import { PdfReader } from 'pdfreader';

type ParsedPdf = {
  pages: number;
  text: string;
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const extractTextFromBuffer = (buffer: Buffer): Promise<ParsedPdf> => {
  return new Promise((resolve, reject) => {
    const pages: string[][] = [[]];
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(new Error(typeof err === 'string' ? err : 'Failed to parse PDF file.'));
        return;
      }

      if (!item) {
        const pageTexts = pages.map((tokens) => normalizeText(tokens.join(' '))).filter(Boolean);
        resolve({
          pages: pageTexts.length,
          text: pageTexts.join('\n\n---\n\n'),
        });
        return;
      }

      if (typeof item.page === 'number') {
        currentPage = Math.max(item.page - 1, 0);
        if (!pages[currentPage]) {
          pages[currentPage] = [];
        }
        return;
      }

      if (item.text) {
        if (!pages[currentPage]) {
          pages[currentPage] = [];
        }
        pages[currentPage].push(item.text);
      }
    });
  });
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parsedPdf = await extractTextFromBuffer(Buffer.from(arrayBuffer));

    return NextResponse.json(parsedPdf);
  } catch {
    return NextResponse.json({ error: 'Failed to read PDF file.' }, { status: 500 });
  }
}
