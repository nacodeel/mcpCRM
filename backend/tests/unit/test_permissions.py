from types import SimpleNamespace

from app.core.permissions import has_scope, is_admin


def test_is_admin_by_role() -> None:
    user = SimpleNamespace(role="ADMIN", is_superuser=False)
    assert is_admin(user)


def test_scope_groups() -> None:
    assert has_scope(["crm:write"], "contacts:write")
    assert has_scope(["crm:admin"], "deals:delete")
    assert not has_scope(["contacts:read"], "contacts:write")
