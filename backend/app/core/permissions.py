from typing import Any

from app.core.exceptions import ForbiddenError

ADMIN_ROLE_VALUES = {"ADMIN", "admin", "SUPERUSER", "superuser"}


def role_value(user: Any) -> str | None:
    role = getattr(user, "role", None)
    if role is None:
        return None
    return getattr(role, "value", str(role))


def is_admin(user: Any) -> bool:
    if bool(getattr(user, "is_superuser", False)):
        return True
    role = role_value(user)
    return role in ADMIN_ROLE_VALUES


def require_admin_user(user: Any) -> Any:
    if not is_admin(user):
        raise ForbiddenError("Admin privileges are required")
    return user


def has_scope(scopes: list[str] | tuple[str, ...] | set[str], required: str) -> bool:
    scope_set = set(scopes)
    if "*" in scope_set or "crm:admin" in scope_set:
        return True
    if required in scope_set:
        return True

    # Normalize required scope to check bidirectionally
    is_read = required == "read" or required == "crm:read" or required.endswith(":read")
    is_delete = required == "delete" or required.endswith(":delete")
    is_create = required == "create"
    is_update = required == "update"
    is_write = required == "crm:write" or required.endswith(":write")

    if is_read:
        return "read" in scope_set or "crm:read" in scope_set or "crm:write" in scope_set

    if is_delete:
        return "delete" in scope_set or "crm:write" in scope_set

    if is_create:
        return "create" in scope_set or "crm:write" in scope_set or "contacts:write" in scope_set

    if is_update:
        return "update" in scope_set or "crm:write" in scope_set or "contacts:write" in scope_set

    if is_write:
        return ("create" in scope_set and "update" in scope_set) or "crm:write" in scope_set

    return False


def require_scope(scopes: list[str] | tuple[str, ...] | set[str], required: str) -> None:
    if not has_scope(scopes, required):
        raise ForbiddenError(f"Required scope is missing: {required}")

