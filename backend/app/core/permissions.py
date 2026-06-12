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
    if required in scope_set:
        return True
    if "*" in scope_set:
        return True
    if required.startswith("contacts:") and "crm:write" in scope_set:
        return True
    if required.startswith("deals:") and "crm:write" in scope_set:
        return True
    if required.endswith(":read") and "crm:read" in scope_set:
        return True
    return "crm:admin" in scope_set


def require_scope(scopes: list[str] | tuple[str, ...] | set[str], required: str) -> None:
    if not has_scope(scopes, required):
        raise ForbiddenError(f"Required scope is missing: {required}")
