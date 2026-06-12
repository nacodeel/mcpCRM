import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, generateNewApiKey, CRMDatabase, Contact, Deal } from '@/lib/crm-db';

export async function GET() {
  const db = readDB();
  return NextResponse.json(db);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const db = readDB();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'save_contact': {
        const contactData = payload as Contact;
        const index = db.contacts.findIndex((c) => c.id === contactData.id);
        
        const timestamp = new Date().toISOString();
        if (index >= 0) {
          // Update
          db.contacts[index] = {
            ...contactData,
            updatedAt: timestamp,
          };
        } else {
          // Create
          const newContact: Contact = {
            ...contactData,
            id: contactData.id || 'c_' + Math.random().toString(36).substr(2, 9),
            dealIds: contactData.dealIds || [],
            updatedAt: timestamp,
          };
          db.contacts.push(newContact);
        }
        writeDB(db);
        break;
      }

      case 'delete_contact': {
        const { id } = payload;
        // Filter out contact
        db.contacts = db.contacts.filter((c) => c.id !== id);
        // Delete all deals related to this contact
        db.deals = db.deals.filter((d) => d.contactId !== id);
        writeDB(db);
        break;
      }

      case 'save_deal': {
        const dealData = payload as Deal;
        const index = db.deals.findIndex((d) => d.id === dealData.id);
        const timestamp = new Date().toISOString();
        
        let savedDeal: Deal;

        if (index >= 0) {
          // Update
          savedDeal = {
            ...dealData,
            updatedAt: timestamp,
          };
          db.deals[index] = savedDeal;
        } else {
          // Create
          savedDeal = {
            ...dealData,
            id: dealData.id || 'd_' + Math.random().toString(36).substr(2, 9),
            updatedAt: timestamp,
          };
          db.deals.push(savedDeal);
        }

        // Make sure the linked contact has this dealId in its dealIds list
        const contactIndex = db.contacts.findIndex((c) => c.id === savedDeal.contactId);
        if (contactIndex >= 0) {
          const contact = db.contacts[contactIndex];
          if (!contact.dealIds.includes(savedDeal.id)) {
            contact.dealIds.push(savedDeal.id);
            contact.updatedAt = timestamp;
          }
        }

        writeDB(db);
        break;
      }

      case 'delete_deal': {
        const { id } = payload;
        const deal = db.deals.find((d) => d.id === id);
        if (deal) {
          // Remove from target contact's deal list
          const contact = db.contacts.find((c) => c.id === deal.contactId);
          if (contact) {
            contact.dealIds = contact.dealIds.filter((dId) => dId !== id);
            contact.updatedAt = new Date().toISOString();
          }
        }
        db.deals = db.deals.filter((d) => d.id !== id);
        writeDB(db);
        break;
      }

      case 'regenerate_apiKey': {
        db.apiKey = generateNewApiKey();
        writeDB(db);
        break;
      }

      case 'update_profile': {
        db.profile = {
          ...db.profile,
          ...payload,
        };
        writeDB(db);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, db });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
