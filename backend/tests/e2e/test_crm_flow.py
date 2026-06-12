import pytest
from httpx import AsyncClient

@pytest.fixture(autouse=True)
async def cleanup_db(client, app):
    # Retrieve db manager from application state to clean up tables
    db = getattr(app.state, "db", None)
    if db:
        async with db.transactional_crud() as crud:
            # Clean dependent tables first
            await crud.session.execute(sa_text('TRUNCATE crm.deals, crm.contacts, crm.mcp_keys, crm.users CASCADE'))
    yield



from sqlalchemy import text as sa_text

@pytest.mark.asyncio
async def test_crm_full_flow(client) -> None:
    # 1. Bootstrap Admin User
    bootstrap_payload = {
        "username": "admin_test",
        "name": "Test Admin",
        "password": "testpassword123"
    }
    response = await client.post("/api/v1/users/bootstrap-admin", json=bootstrap_payload)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "admin_test"
    assert user_data["role"] == "ADMIN"

    # 2. Get JWT Token
    login_payload = {
        "username": "admin_test",
        "password": "testpassword123"
    }
    response = await client.post("/api/v1/auth/token", data=login_payload)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get /me endpoint
    response = await client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    me_data = response.json()
    assert me_data["username"] == "admin_test"

    # 4. Create Contact
    contact_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "phones": ["+79998887766"],
        "emails": ["john.doe@example.com"],
        "addresses": ["Moscow, Russia"],
        "tags": ["vip", "partner"],
        "note": "Important contact"
    }
    response = await client.post("/api/v1/crm/contacts", json=contact_payload, headers=headers)
    assert response.status_code == 201
    contact_data = response.json()["data"]
    assert contact_data["first_name"] == "John"
    assert contact_data["last_name"] == "Doe"
    contact_id = contact_data["id"]

    # 5. List Contacts
    response = await client.get("/api/v1/crm/contacts", headers=headers)
    assert response.status_code == 200
    contacts_list = response.json()["data"]["items"]
    assert len(contacts_list) >= 1
    assert contacts_list[0]["id"] == contact_id



    # 6. Create Deal for Contact
    deal_payload = {
        "contact_id": contact_id,
        "title": "Big Sale",
        "amount": 150000.50,
        "description": "Sale of CRM licenses"
    }
    response = await client.post("/api/v1/crm/deals", json=deal_payload, headers=headers)
    assert response.status_code == 201
    deal_data = response.json()["data"]
    assert deal_data["title"] == "Big Sale"
    assert float(deal_data["amount"]) == 150000.50
    deal_id = deal_data["id"]

    # 7. Update Deal
    deal_update_payload = {
        "title": "Big Sale - Negotiating",
        "status": "NEGOTIATION"
    }
    response = await client.patch(f"/api/v1/crm/deals/{deal_id}", json=deal_update_payload, headers=headers)
    assert response.status_code == 200
    updated_deal_data = response.json()["data"]
    assert updated_deal_data["title"] == "Big Sale - Negotiating"
    assert updated_deal_data["status"] == "NEGOTIATION"

    # 8. List Notifications
    response = await client.get("/api/v1/notifications", headers=headers)
    assert response.status_code == 200
    notifications_data = response.json()["data"]
    assert len(notifications_data) >= 2  # Contact created, Deal created, Deal updated

    # 9. Clean up and delete
    response = await client.delete(f"/api/v1/crm/deals/{deal_id}", headers=headers)
    assert response.status_code == 204

    response = await client.delete(f"/api/v1/crm/contacts/{contact_id}", headers=headers)
    assert response.status_code == 204

