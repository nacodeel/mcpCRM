import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, Deal } from '@/lib/crm-db';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header. Use Bearer <token>' }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const db = readDB();

    if (token !== db.apiKey) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, amount, contactId, status } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Field "title" (string) is required' }, { status: 400 });
    }

    if (!contactId || typeof contactId !== 'string') {
      return NextResponse.json({ error: 'Field "contactId" (string) is required' }, { status: 400 });
    }

    // Verify contact exists
    const contactExists = db.contacts.some((c) => c.id === contactId);
    if (!contactExists) {
      return NextResponse.json({ error: `Contact with ID "${contactId}" not found` }, { status: 404 });
    }

    const dealId = 'd_' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    let dealStatus: 'Новая' | 'В работе' | 'Ожидание' | 'Успешно' | 'Потеряна' = 'Новая';
    if (status && ['Новая', 'В работе', 'Ожидание', 'Успешно', 'Потеряна'].includes(status)) {
      dealStatus = status as any;
    }

    const newDeal: Deal = {
      id: dealId,
      title: title.trim(),
      description: description ? String(description) : '',
      amount: Number(amount) || 0,
      contactId: contactId,
      status: dealStatus,
      updatedAt: timestamp
    };

    // Link this deal back in the contact's array
    const contactIndex = db.contacts.findIndex((c) => c.id === contactId);
    if (contactIndex >= 0) {
      db.contacts[contactIndex].dealIds.push(dealId);
      db.contacts[contactIndex].updatedAt = timestamp;
    }

    db.deals.push(newDeal);
    writeDB(db);

    return NextResponse.json({
      success: true,
      message: 'Deal successfully created via API',
      deal: newDeal
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing request' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header. Use Bearer <token>' }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const db = readDB();

    if (token !== db.apiKey) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    return NextResponse.json(db.deals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing request' }, { status: 500 });
  }
}
