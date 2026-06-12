from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import ContactStatus, DealStatus, UserRole
from ..types import pg_enum
from ..utils import build_full_name
from .base import Base, TimestampMixin, UpdatedAtMixin

if TYPE_CHECKING:
    from collections.abc import Sequence


class User(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", name="uq_users_username"),
        Index("idx_users_username", "username"),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(
        pg_enum(UserRole, "user_role"),
        nullable=False,
        default=UserRole.USER,
        server_default=UserRole.USER.value,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    mcp_keys: Mapped[list[McpKey]] = relationship(
        "McpKey",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    contacts: Mapped[list[Contact]] = relationship(
        "Contact",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    contact_tags: Mapped[list[ContactTag]] = relationship(
        "ContactTag",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="ContactTag.user_id",
        overlaps="contact,tags",
    )
    contact_notes: Mapped[list[ContactNote]] = relationship(
        "ContactNote",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="ContactNote.user_id",
        overlaps="contact,notes",
    )
    deals: Mapped[list[Deal]] = relationship(
        "Deal",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Deal.user_id",
        overlaps="contact,deals",
    )

    @property
    def role_ru(self) -> str:
        return self.role.ru


class McpKey(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "mcp_keys"
    __table_args__ = (
        UniqueConstraint("key_hash", name="uq_mcp_keys_key_hash"),
        Index("idx_mcp_keys_user_id", "user_id"),
        Index("idx_mcp_keys_key_hash", "key_hash"),
        Index("idx_mcp_keys_active", "is_active"),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("crm.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False)
    scopes: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        default=list,
        server_default=text("'{}'::text[]"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship("User", back_populates="mcp_keys")

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        now = datetime.now(tz=self.expires_at.tzinfo)
        return self.expires_at <= now


class Contact(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_contacts_id_user_id"),
        Index("idx_contacts_user_id", "user_id"),
        Index("idx_contacts_user_status", "user_id", "status"),
        Index("idx_contacts_full_name", "full_name"),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("crm.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    middle_name: Mapped[str | None] = mapped_column(String(120))
    full_name: Mapped[str | None] = mapped_column(String(320))
    birth_date: Mapped[date | None] = mapped_column(Date)
    source: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[ContactStatus] = mapped_column(
        pg_enum(ContactStatus, "contact_status"),
        nullable=False,
        default=ContactStatus.NEW,
        server_default=ContactStatus.NEW.value,
    )

    user: Mapped[User] = relationship("User", back_populates="contacts")
    phones: Mapped[list[ContactPhone]] = relationship(
        "ContactPhone",
        back_populates="contact",
        cascade="all, delete-orphan",
    )
    emails: Mapped[list[ContactEmail]] = relationship(
        "ContactEmail",
        back_populates="contact",
        cascade="all, delete-orphan",
    )
    addresses: Mapped[list[ContactAddress]] = relationship(
        "ContactAddress",
        back_populates="contact",
        cascade="all, delete-orphan",
    )
    tags: Mapped[list[ContactTag]] = relationship(
        "ContactTag",
        back_populates="contact",
        cascade="all, delete-orphan",
        foreign_keys="[ContactTag.contact_id, ContactTag.user_id]",
        overlaps="user,contact_tags",
    )
    notes: Mapped[list[ContactNote]] = relationship(
        "ContactNote",
        back_populates="contact",
        cascade="all, delete-orphan",
        foreign_keys="[ContactNote.contact_id, ContactNote.user_id]",
        overlaps="user,contact_notes",
    )
    deals: Mapped[list[Deal]] = relationship(
        "Deal",
        back_populates="contact",
        cascade="all, delete-orphan",
        foreign_keys="[Deal.contact_id, Deal.user_id]",
        overlaps="user,deals",
    )

    @property
    def status_ru(self) -> str:
        return self.status.ru

    def rebuild_full_name(self) -> None:
        self.full_name = build_full_name(
            last_name=self.last_name,
            first_name=self.first_name,
            middle_name=self.middle_name,
        )


class ContactPhone(Base, TimestampMixin):
    __tablename__ = "contact_phones"
    __table_args__ = (
        UniqueConstraint("contact_id", "phone", name="uq_contact_phones_contact_phone"),
        Index("idx_contact_phones_contact_id", "contact_id"),
        Index("idx_contact_phones_phone", "phone"),
        Index(
            "idx_contact_phones_primary",
            "contact_id",
            unique=True,
            postgresql_where=text("is_primary IS TRUE"),
        ),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    contact_id: Mapped[int] = mapped_column(
        ForeignKey("crm.contacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(String(64), nullable=False)
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    contact: Mapped[Contact] = relationship("Contact", back_populates="phones")


class ContactEmail(Base, TimestampMixin):
    __tablename__ = "contact_emails"
    __table_args__ = (
        UniqueConstraint("contact_id", "email", name="uq_contact_emails_contact_email"),
        Index("idx_contact_emails_contact_id", "contact_id"),
        Index("idx_contact_emails_email", "email"),
        Index(
            "idx_contact_emails_primary",
            "contact_id",
            unique=True,
            postgresql_where=text("is_primary IS TRUE"),
        ),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    contact_id: Mapped[int] = mapped_column(
        ForeignKey("crm.contacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    contact: Mapped[Contact] = relationship("Contact", back_populates="emails")


class ContactAddress(Base, TimestampMixin):
    __tablename__ = "contact_addresses"
    __table_args__ = (
        Index("idx_contact_addresses_contact_id", "contact_id"),
        Index(
            "idx_contact_addresses_primary",
            "contact_id",
            unique=True,
            postgresql_where=text("is_primary IS TRUE"),
        ),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    contact_id: Mapped[int] = mapped_column(
        ForeignKey("crm.contacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    contact: Mapped[Contact] = relationship("Contact", back_populates="addresses")


class ContactTag(Base, TimestampMixin):
    __tablename__ = "contact_tags"
    __table_args__ = (
        ForeignKeyConstraint(
            ["contact_id", "user_id"],
            ["crm.contacts.id", "crm.contacts.user_id"],
            ondelete="CASCADE",
            name="fk_contact_tags_contact_user_contacts",
        ),
        UniqueConstraint("user_id", "contact_id", "tag", name="uq_contact_tags_user_contact_tag"),
        Index("idx_contact_tags_user_id", "user_id"),
        Index("idx_contact_tags_contact_id", "contact_id"),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("crm.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    contact_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tag: Mapped[str] = mapped_column(String(120), nullable=False)

    user: Mapped[User] = relationship(
        "User",
        back_populates="contact_tags",
        foreign_keys=[user_id],
        overlaps="contact,tags",
    )
    contact: Mapped[Contact] = relationship(
        "Contact",
        back_populates="tags",
        foreign_keys=[contact_id, user_id],
        overlaps="user,contact_tags",
    )


class ContactNote(Base, TimestampMixin):
    __tablename__ = "contact_notes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["contact_id", "user_id"],
            ["crm.contacts.id", "crm.contacts.user_id"],
            ondelete="CASCADE",
            name="fk_contact_notes_contact_user_contacts",
        ),
        Index("idx_contact_notes_user_id", "user_id"),
        Index("idx_contact_notes_contact_id", "contact_id"),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("crm.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    contact_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[User] = relationship(
        "User",
        back_populates="contact_notes",
        foreign_keys=[user_id],
        overlaps="contact,notes",
    )
    contact: Mapped[Contact] = relationship(
        "Contact",
        back_populates="notes",
        foreign_keys=[contact_id, user_id],
        overlaps="user,contact_notes",
    )


class Deal(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "deals"
    __table_args__ = (
        ForeignKeyConstraint(
            ["contact_id", "user_id"],
            ["crm.contacts.id", "crm.contacts.user_id"],
            ondelete="CASCADE",
            name="fk_deals_contact_user_contacts",
        ),
        Index("idx_deals_user_id", "user_id"),
        Index("idx_deals_contact_id", "contact_id"),
        Index("idx_deals_user_status", "user_id", "status"),
        {"schema": "crm"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("crm.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    contact_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="RUB",
        server_default="RUB",
    )
    comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[DealStatus] = mapped_column(
        pg_enum(DealStatus, "deal_status"),
        nullable=False,
        default=DealStatus.NEW,
        server_default=DealStatus.NEW.value,
    )
    close_date: Mapped[date | None] = mapped_column(Date)

    user: Mapped[User] = relationship(
        "User",
        back_populates="deals",
        foreign_keys=[user_id],
        overlaps="contact,deals",
    )
    contact: Mapped[Contact] = relationship(
        "Contact",
        back_populates="deals",
        foreign_keys=[contact_id, user_id],
        overlaps="user,deals",
    )

    @property
    def status_ru(self) -> str:
        return self.status.ru


__all__ = [
    "User",
    "McpKey",
    "Contact",
    "ContactPhone",
    "ContactEmail",
    "ContactAddress",
    "ContactTag",
    "ContactNote",
    "Deal",
]
