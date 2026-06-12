from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from functools import cached_property
from math import ceil
from typing import Any, Generic, TypeVar

from sqlalchemy import JSON, Result, Select, delete, func, inspect, select, update as sa_update
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute
from sqlalchemy.orm.attributes import flag_modified

ModelT = TypeVar("ModelT")
OrderBy = str | InstrumentedAttribute


class BaseCRUD(Generic[ModelT]):
    """Generic async repository for SQLAlchemy 2.0 models.

    The class intentionally contains only database mechanics: select, create,
    update, delete, pagination, get-or-create and safe mass operations.
    Domain scenarios live in entity CRUD classes or in `CrmScenarioCRUD`.
    """

    model: type[ModelT]
    default_ordering: tuple[str, ...] = ("id",)

    def __init__(self, session: AsyncSession, model: type[ModelT]):
        self.session = session
        self.model = model

    @property
    def db(self) -> AsyncSession:
        return self.session

    @cached_property
    def mapper(self):
        return inspect(self.model)

    @cached_property
    def pk_column(self) -> InstrumentedAttribute:
        primary_key = self.mapper.primary_key
        if len(primary_key) != 1:
            raise ValueError(f"{self.model.__name__} has a composite primary key")
        return getattr(self.model, primary_key[0].key)

    @cached_property
    def json_field_names(self) -> set[str]:
        names: set[str] = set()
        for column_attr in self.mapper.column_attrs:
            column = column_attr.columns[0]
            if isinstance(column.type, (JSON, JSONB)):
                names.add(column_attr.key)
        return names

    def query(self, *filters: Any, options: Sequence[Any] | None = None) -> Select[Any]:
        stmt = select(self.model)
        if options:
            stmt = stmt.options(*options)
        if filters:
            stmt = stmt.where(*filters)
        return stmt

    def by_id_filter(self, obj_id: Any):
        return self.pk_column == obj_id

    def apply_filter_by(self, stmt: Any, filter_by: Mapping[str, Any] | None = None) -> Any:
        if not filter_by:
            return stmt
        payload = {key: value for key, value in filter_by.items() if value is not None}
        return stmt.filter_by(**payload) if payload else stmt

    def apply_ordering(
        self,
        stmt: Select[Any],
        order_by: OrderBy | Sequence[OrderBy] | None = None,
    ) -> Select[Any]:
        values = order_by or self.default_ordering
        if isinstance(values, (str, InstrumentedAttribute)):
            values = (values,)

        ordering = []
        for item in values:
            if isinstance(item, str):
                desc = item.startswith("-")
                name = item[1:] if desc else item
                if not hasattr(self.model, name):
                    raise AttributeError(f"{self.model.__name__} has no attribute '{name}'")
                column = getattr(self.model, name)
                ordering.append(column.desc() if desc else column.asc())
            else:
                ordering.append(item)
        return stmt.order_by(*ordering)

    def apply_pagination(
        self,
        stmt: Select[Any],
        *,
        offset: int | None = None,
        limit: int | None = None,
    ) -> Select[Any]:
        if offset is not None:
            if offset < 0:
                raise ValueError("offset must be >= 0")
            stmt = stmt.offset(offset)
        if limit is not None:
            if limit < 0:
                raise ValueError("limit must be >= 0")
            stmt = stmt.limit(limit)
        return stmt

    def apply_collection_options(
        self,
        stmt: Select[Any],
        *,
        filter_by: Mapping[str, Any] | None = None,
        order_by: OrderBy | Sequence[OrderBy] | None = None,
        offset: int | None = None,
        limit: int | None = None,
    ) -> Select[Any]:
        stmt = self.apply_filter_by(stmt, filter_by=filter_by)
        stmt = self.apply_ordering(stmt, order_by=order_by)
        stmt = self.apply_pagination(stmt, offset=offset, limit=limit)
        return stmt

    async def execute(self, stmt: Any) -> Result[Any]:
        return await self.session.execute(stmt)

    async def scalar(self, stmt: Any) -> Any:
        return await self.session.scalar(stmt)

    async def get(self, obj_id: Any, *, options: Sequence[Any] | None = None) -> ModelT | None:
        return await self.session.get(self.model, obj_id, options=list(options) if options else None)

    async def get_by_id(self, obj_id: Any, *, options: Sequence[Any] | None = None) -> ModelT | None:
        return await self.get(obj_id, options=options)

    async def require(
        self,
        obj_id: Any,
        *,
        options: Sequence[Any] | None = None,
        error_message: str | None = None,
    ) -> ModelT:
        obj = await self.get(obj_id, options=options)
        if obj is None:
            raise NoResultFound(error_message or f"{self.model.__name__}<{obj_id}> not found")
        return obj

    async def get_or_raise(
        self,
        obj_id: Any,
        *,
        options: Sequence[Any] | None = None,
        error_message: str | None = None,
    ) -> ModelT:
        return await self.require(obj_id, options=options, error_message=error_message)

    async def get_one(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        options: Sequence[Any] | None = None,
    ) -> ModelT | None:
        stmt = self.apply_filter_by(self.query(*filters, options=options), filter_by=filter_by)
        result = await self.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_one_required(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        options: Sequence[Any] | None = None,
        error_message: str | None = None,
    ) -> ModelT:
        obj = await self.get_one(*filters, filter_by=filter_by, options=options)
        if obj is None:
            raise NoResultFound(error_message or f"{self.model.__name__} not found")
        return obj

    async def list(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        options: Sequence[Any] | None = None,
        order_by: OrderBy | Sequence[OrderBy] | None = None,
        offset: int | None = None,
        limit: int | None = None,
    ) -> list[ModelT]:
        stmt = self.query(*filters, options=options)
        stmt = self.apply_collection_options(
            stmt,
            filter_by=filter_by,
            order_by=order_by,
            offset=offset,
            limit=limit,
        )
        result = await self.execute(stmt)
        return list(result.unique().scalars().all())

    async def first(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        options: Sequence[Any] | None = None,
        order_by: OrderBy | Sequence[OrderBy] | None = None,
    ) -> ModelT | None:
        stmt = self.query(*filters, options=options)
        stmt = self.apply_collection_options(stmt, filter_by=filter_by, order_by=order_by, limit=1)
        result = await self.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def count(self, *filters: Any, filter_by: Mapping[str, Any] | None = None) -> int:
        stmt = select(func.count()).select_from(self.model)
        if filters:
            stmt = stmt.where(*filters)
        stmt = self.apply_filter_by(stmt, filter_by=filter_by)
        value = await self.scalar(stmt)
        return int(value or 0)

    async def exists(self, *filters: Any, filter_by: Mapping[str, Any] | None = None) -> bool:
        return (await self.count(*filters, filter_by=filter_by)) > 0

    async def paginate(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        options: Sequence[Any] | None = None,
        order_by: OrderBy | Sequence[OrderBy] | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        if limit <= 0:
            raise ValueError("limit must be > 0")
        if offset < 0:
            raise ValueError("offset must be >= 0")

        items = await self.list(
            *filters,
            filter_by=filter_by,
            options=options,
            order_by=order_by,
            offset=offset,
            limit=limit,
        )
        total = await self.count(*filters, filter_by=filter_by)
        return {
            "items": items,
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_next": offset + len(items) < total,
            "has_prev": offset > 0,
        }

    async def page(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        options: Sequence[Any] | None = None,
        order_by: OrderBy | Sequence[OrderBy] | None = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict[str, Any]:
        if page <= 0:
            raise ValueError("page must be > 0")
        if per_page <= 0:
            raise ValueError("per_page must be > 0")
        offset = (page - 1) * per_page
        payload = await self.paginate(
            *filters,
            filter_by=filter_by,
            options=options,
            order_by=order_by,
            offset=offset,
            limit=per_page,
        )
        total = int(payload["total"])
        payload.update(
            {
                "page": page,
                "per_page": per_page,
                "pages": ceil(total / per_page) if total else 0,
            }
        )
        return payload

    def prepare_create_data(self, data: Mapping[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in data.items() if value is not None}

    def prepare_update_data(self, data: Mapping[str, Any], *, exclude_none: bool = True) -> dict[str, Any]:
        if exclude_none:
            return {key: value for key, value in data.items() if value is not None}
        return dict(data)

    async def flush(self) -> None:
        await self.session.flush()

    async def refresh(self, obj: ModelT, attrs: Iterable[str] | None = None) -> ModelT:
        await self.session.refresh(obj, attribute_names=list(attrs) if attrs else None)
        return obj

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()

    async def save(
        self,
        obj: ModelT,
        *,
        refresh: bool = False,
        refresh_attrs: Iterable[str] | None = None,
        flush: bool = True,
    ) -> ModelT:
        self.session.add(obj)
        if flush:
            await self.flush()
        if refresh:
            await self.refresh(obj, attrs=refresh_attrs)
        return obj

    async def create(self, *, refresh: bool = True, **data: Any) -> ModelT:
        payload = self.prepare_create_data(data)
        obj = self.model(**payload)
        return await self.save(obj, refresh=refresh)

    async def create_many(
        self,
        rows: Sequence[Mapping[str, Any]],
        *,
        refresh: bool = False,
    ) -> list[ModelT]:
        objects = [self.model(**self.prepare_create_data(row)) for row in rows]
        if not objects:
            return []
        self.session.add_all(objects)
        await self.flush()
        if refresh:
            for obj in objects:
                await self.refresh(obj)
        return objects

    def apply_updates(self, obj: ModelT, data: Mapping[str, Any]) -> ModelT:
        allowed_fields = {attr.key for attr in self.mapper.attrs}
        unknown_fields = sorted(set(data) - allowed_fields)
        if unknown_fields:
            fields = ", ".join(unknown_fields)
            raise AttributeError(f"{self.model.__name__} has no mapped attributes: {fields}")

        for field, value in data.items():
            setattr(obj, field, value)
            if field in self.json_field_names and value is not None:
                flag_modified(obj, field)
        return obj

    async def update(
        self,
        obj: ModelT,
        *,
        refresh: bool = True,
        exclude_none: bool = True,
        **data: Any,
    ) -> ModelT:
        payload = self.prepare_update_data(data, exclude_none=exclude_none)
        if payload:
            self.apply_updates(obj, payload)
        return await self.save(obj, refresh=refresh)

    async def update_by_id(
        self,
        obj_id: Any,
        *,
        refresh: bool = True,
        exclude_none: bool = True,
        **data: Any,
    ) -> ModelT:
        obj = await self.require(obj_id)
        return await self.update(obj, refresh=refresh, exclude_none=exclude_none, **data)

    async def update_many(
        self,
        *filters: Any,
        values: Mapping[str, Any],
        filter_by: Mapping[str, Any] | None = None,
        allow_all: bool = False,
    ) -> int:
        payload = self.prepare_update_data(values, exclude_none=False)
        if not payload:
            return 0
        if not filters and not filter_by and not allow_all:
            raise ValueError("Refusing to update all rows without filters. Pass allow_all=True to override.")

        stmt = sa_update(self.model).execution_options(synchronize_session=False)
        if filters:
            stmt = stmt.where(*filters)
        stmt = self.apply_filter_by(stmt, filter_by=filter_by)
        stmt = stmt.values(**payload)
        result = await self.execute(stmt)
        return int(result.rowcount or 0)

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.flush()

    async def delete_by_id(self, obj_id: Any) -> bool:
        obj = await self.get(obj_id)
        if obj is None:
            return False
        await self.delete(obj)
        return True

    async def delete_many(
        self,
        *filters: Any,
        filter_by: Mapping[str, Any] | None = None,
        allow_all: bool = False,
    ) -> int:
        if not filters and not filter_by and not allow_all:
            raise ValueError("Refusing to delete all rows without filters. Pass allow_all=True to override.")

        stmt = delete(self.model).execution_options(synchronize_session=False)
        if filters:
            stmt = stmt.where(*filters)
        stmt = self.apply_filter_by(stmt, filter_by=filter_by)
        result = await self.execute(stmt)
        return int(result.rowcount or 0)

    async def get_or_create(
        self,
        *,
        defaults: Mapping[str, Any] | None = None,
        refresh: bool = True,
        **lookup: Any,
    ) -> tuple[ModelT, bool]:
        obj = await self.get_one(filter_by=lookup)
        if obj is not None:
            return obj, False

        payload = self.prepare_create_data({**lookup, **dict(defaults or {})})
        savepoint = await self.session.begin_nested()
        try:
            obj = self.model(**payload)
            self.session.add(obj)
            await self.flush()
        except IntegrityError:
            await savepoint.rollback()
            existing = await self.get_one(filter_by=lookup)
            if existing is None:
                raise
            return existing, False
        else:
            await savepoint.commit()
            if refresh:
                await self.refresh(obj)
            return obj, True

    async def update_or_create(
        self,
        *,
        defaults: Mapping[str, Any] | None = None,
        refresh: bool = True,
        **lookup: Any,
    ) -> tuple[ModelT, bool]:
        obj, created = await self.get_or_create(defaults=defaults, refresh=refresh, **lookup)
        if created or not defaults:
            return obj, created
        obj = await self.update(obj, refresh=refresh, exclude_none=False, **dict(defaults))
        return obj, False

    async def touch(self, obj: ModelT, *, refresh: bool = True) -> ModelT:
        return await self.save(obj, refresh=refresh)
