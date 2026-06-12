import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, Contact, Deal } from '@/lib/crm-db';

export async function POST(req: NextRequest) {
  try {
    // Authenticate via Bearer token
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
    const { name, phone, email, address, tags, notes, dealTitle, amount, status } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Field "name" (string) is required' }, { status: 400 });
    }

    // Helper to format string or array properties
    const toArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(String).filter(Boolean);
      if (typeof val === 'string') {
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [String(val)];
    };

    const contactId = 'c_' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    const newContact: Contact = {
      id: contactId,
      name: name.trim(),
      phones: toArray(phone),
      emails: toArray(email),
      addresses: address ? [String(address)] : [],
      tags: toArray(tags),
      notes: notes ? String(notes) : 'Создано автоматически через API-интеграцию.',
      dealIds: [],
      updatedAt: timestamp
    };

    let createdDeal: Deal | null = null;

    if (dealTitle && typeof dealTitle === 'string' && dealTitle.trim() !== '') {
      const dealId = 'd_' + Math.random().toString(36).substr(2, 9);
      
      let dealStatus: 'Новая' | 'В работе' | 'Ожидание' | 'Успешно' | 'Потеряна' = 'Новая';
      if (status && ['Новая', 'В работе', 'Ожидание', 'Успешно', 'Потеряна'].includes(status)) {
        dealStatus = status as any;
      }

      createdDeal = {
        id: dealId,
        title: dealTitle.trim(),
        description: 'Сделка создана автоматически при добавлении контакта из API.',
        amount: Number(amount) || 0,
        contactId: contactId,
        status: dealStatus,
        updatedAt: timestamp
      };

      newContact.dealIds.push(dealId);
      db.deals.push(createdDeal);
    }

    db.contacts.push(newContact);
    writeDB(db);

    return NextResponse.json({
      success: true,
      message: 'Contact successfully created via API',
      contact: newContact,
      deal: createdDeal || undefined
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

    return NextResponse.json(db.contacts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing request' }, { status: 500 });
  }
}
