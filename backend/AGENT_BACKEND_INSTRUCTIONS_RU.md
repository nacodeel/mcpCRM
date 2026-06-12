# Инструкция для ИИ-агента, который будет дорабатывать backend-template

## Главный принцип

Этот backend не должен содержать собственного ORM/db-layer.

Единственный источник моделей, CRUD, транзакций и сценариев — внешний модуль `database`.

Запрещено создавать в `app/`:

```text
app/db/base.py
app/db/session.py
app/db/models.py
app/db/repositories.py
```

Если нужен доступ к БД, используй:

```python
from app.api.deps import DbManagerDep, CrudDep, TxCrudDep
```

или service layer, который получает `DatabaseSessionManager`.

---

## Как добавлять endpoint

1. Определи логическую группу.
2. Создай файл в `app/api/v1/...`.
3. Создай Pydantic schemas в `app/modules/<module>/schemas.py`.
4. Создай/расширь service в `app/modules/<module>/service.py`.
5. В service используй `database.crud` или `database.crud.scenarios`.
6. Подключи router в `app/api/v1/router.py`.

---

## Правильный паттерн endpoint

```python
@router.post("/contacts")
async def create_contact(
    payload: ContactCreate,
    current_user: CurrentUserDep,
    service: CrmServiceDep,
):
    return await service.create_contact(current_user.id, payload)
```

Endpoint отвечает только за HTTP:

- валидация payload;
- зависимости;
- статус-коды;
- response model.

Endpoint не должен содержать бизнес-логику.

---

## Правильный паттерн service

```python
class CrmService:
    def __init__(self, db):
        self.db = db

    async def create_contact(self, user_id: int, payload: ContactCreate):
        async with self.db.transactional_crud() as crud:
            return await crud.scenarios.create_contact_full(
                user_id=user_id,
                **payload.model_dump(exclude_none=True),
            )
```

---

## Работа с транзакциями

Для чтения можно использовать:

```python
async with db.crud() as crud:
    ...
```

Для записи обязательно:

```python
async with db.transactional_crud() as crud:
    ...
```

Не вызывай `commit()` вручную в endpoint'ах.

---

## Авторизация

Для обычных web endpoint'ов используй:

```python
CurrentUserDep
AdminUserDep
```

Для MCP endpoint'ов используй:

```python
McpPrincipalDep
```

Не смешивай JWT auth и MCP key auth в одном dependency без явной необходимости.

---

## Ошибки

Бросай application errors:

```python
from app.core.exceptions import NotFoundError, ConflictError, ForbiddenError
```

Не возвращай вручную:

```python
{"error": "..."}
```

Формат ошибок централизован.

---

## Enum labels

Если database-модуль поддерживает `.ru`, возвращай backend response так, чтобы frontend мог получить и значение, и русский label.

Пример:

```json
{
  "status": "LEAD",
  "status_ru": "Лид"
}
```

Не переводи enum вручную в API-слое, если это уже делает database.

---

## MCP keys

Raw MCP key нельзя хранить в БД.

При создании ключа raw key можно показать только один раз.

Для проверки ключа используй методы database-модуля:

```python
crud.mcp_keys.valid_by_raw_key(raw_key)
```

или fallback:

```python
hash_key(raw_key)
crud.mcp_keys.valid_by_hash(key_hash)
```

---

## Запреты

Нельзя:

- писать SQL в endpoint'ах;
- создавать отдельные ORM-модели в `app/`;
- дублировать CRUD из `database`;
- хранить raw MCP keys;
- делать sync database calls;
- смешивать HTTP schemas и ORM models;
- возвращать ORM-объекты без сериализации, если response model этого не поддерживает;
- отключать auth на защищенных endpoint'ах без явного решения.
