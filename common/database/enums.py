from __future__ import annotations

import enum
from typing import Any


class LocalizedEnum(str, enum.Enum):
    """Base enum with localized labels.

    Usage:
        ContactStatus.LEAD.value -> "LEAD"
        str(ContactStatus.LEAD) -> "LEAD"
        ContactStatus.LEAD.ru -> "Лид"
        ContactStatus.LEAD.label("ru") -> "Лид"
    """

    def __str__(self) -> str:
        return self.value

    @classmethod
    def ru_labels(cls) -> dict[str, str]:
        return {}

    @property
    def ru(self) -> str:
        return self.ru_labels().get(self.value, self.value)

    def label(self, locale: str = "ru") -> str:
        if locale == "ru":
            return self.ru
        return self.value

    def as_dict(self, locale: str = "ru") -> dict[str, Any]:
        return {
            "value": self.value,
            "label": self.label(locale),
            "ru": self.ru,
        }

    @classmethod
    def choices(cls, locale: str = "ru") -> list[dict[str, str]]:
        return [
            {
                "value": item.value,
                "label": item.label(locale),
                "ru": item.ru,
            }
            for item in cls
        ]


class UserRole(LocalizedEnum):
    ADMIN = "ADMIN"
    USER = "USER"

    @classmethod
    def ru_labels(cls) -> dict[str, str]:
        return {
            "ADMIN": "Администратор",
            "USER": "Пользователь",
        }


class ContactStatus(LocalizedEnum):
    NEW = "NEW"
    LEAD = "LEAD"
    ACTIVE = "ACTIVE"
    CUSTOMER = "CUSTOMER"
    INACTIVE = "INACTIVE"
    LOST = "LOST"

    @classmethod
    def ru_labels(cls) -> dict[str, str]:
        return {
            "NEW": "Новый",
            "LEAD": "Лид",
            "ACTIVE": "Активный",
            "CUSTOMER": "Клиент",
            "INACTIVE": "Неактивный",
            "LOST": "Потерян",
        }


class DealStatus(LocalizedEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    NEGOTIATION = "NEGOTIATION"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    WAITING_RESPONSE = "WAITING_RESPONSE"
    WON = "WON"
    LOST = "LOST"
    CANCELLED = "CANCELLED"

    @classmethod
    def ru_labels(cls) -> dict[str, str]:
        return {
            "NEW": "Новая",
            "CONTACTED": "Связались",
            "NEGOTIATION": "Переговоры",
            "PROPOSAL_SENT": "Предложение отправлено",
            "WAITING_RESPONSE": "Ждем ответа",
            "WON": "Выиграна",
            "LOST": "Проиграна",
            "CANCELLED": "Отменена",
        }


__all__ = [
    "LocalizedEnum",
    "UserRole",
    "ContactStatus",
    "DealStatus",
]
