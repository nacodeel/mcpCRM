from types import SimpleNamespace

from app.core.permissions import has_scope, is_admin


def test_is_admin_by_role() -> None:
    user = SimpleNamespace(role="ADMIN", is_superuser=False)
    assert is_admin(user)


def test_scope_groups() -> None:
    # Legacy compatibility tests
    assert has_scope(["crm:write"], "contacts:write")
    assert has_scope(["crm:admin"], "deals:delete")
    assert not has_scope(["contacts:read"], "contacts:write")
    
    # New CRUD scopes tests
    assert has_scope(["read"], "read")
    assert has_scope(["create"], "create")
    assert has_scope(["update"], "update")
    assert has_scope(["delete"], "delete")
    
    # New scopes satisfying legacy requirements
    assert has_scope(["read"], "contacts:read")
    assert has_scope(["delete"], "contacts:delete")
    assert has_scope(["delete"], "deals:delete")
    assert has_scope(["create", "update"], "contacts:write")
    assert not has_scope(["create"], "contacts:write") # requires both create and update to satisfy crm:write/contacts:write
    
    # Legacy scopes satisfying new requirements
    assert has_scope(["crm:read"], "read")
    assert has_scope(["crm:write"], "create")
    assert has_scope(["crm:write"], "update")
    assert has_scope(["crm:write"], "delete")
    assert has_scope(["contacts:write"], "create")
    assert has_scope(["contacts:write"], "update")
    assert not has_scope(["contacts:write"], "delete")

