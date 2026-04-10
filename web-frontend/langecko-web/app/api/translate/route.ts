import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { text?: unknown };
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid text parameter.' }, { status: 400 });
    }

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepL API key not configured. Set DEEPL_API_KEY in .env.local.' },
        { status: 500 },
      );
    }

    // Free API keys end with ':fx'; Pro keys use the main domain
    const baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], target_lang: 'EN' }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `DeepL API error: ${errText}` },
        { status: response.status },
      );
    }

    const data = await response.json() as {
      translations: { text: string; detected_source_language: string }[];
    };
    const translation = data.translations[0];

    return NextResponse.json({
      translatedText: translation.text,
      detectedLanguage: translation.detected_source_language,
    });
  } catch {
    return NextResponse.json({ error: 'Translation failed.' }, { status: 500 });
  }
}
