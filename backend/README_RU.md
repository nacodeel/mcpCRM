# FastAPI Universal Backend Template

Боевой универсальный шаблон backend-приложения на FastAPI, рассчитанный на работу с внешним модулем `database`.

Идея шаблона простая:

```text
FastAPI backend не владеет ORM-моделями.
FastAPI backend не содержит собственного app/db слоя.
FastAPI backend подключает внешний модуль database через Docker volume, Python package или копирование в корень проекта.
database является единственным источником SQLAlchemy models, CRUD, scenarios и session manager.
```

Шаблон уже содержит:

- FastAPI app factory;
- lifespan lifecycle;
- подключение внешнего `database`-модуля;
- JWT авторизацию;
- MCP-key авторизацию;
- role-based permissions;
- scope-based permissions;
- request-id middleware;
- security headers middleware;
- structured JSON logging;
- health/readiness endpoints;
- grouped API routers;
- базовые service modules;
- Dockerfile;
- docker-compose;
- `.env.example`;
- Makefile;
- тестовый каркас.

---

## 1. Ожидаемый внешний `database`-модуль

В корне проекта должна появиться папка:

```text
database/
  __init__.py
  session.py
  crud/
  models/
```

Минимально ожидается, что `database.session` экспортирует:

```python
build_session_manager(...)
DatabaseSessionManager
```

А `DatabaseSessionManager` имеет методы:

```python
session()
transaction()
crud()
transactional_crud()
init_database()
dispose()
```

CRUD facade должен примерно поддерживать:

```python
crud.users.get_by_username(username)
crud.users.get(user_id)
crud.mcp_keys.valid_by_raw_key(raw_key) или valid_by_hash(key_hash)
crud.mcp_keys.touch_used(key_id)
crud.scenarios.*
```

Если каких-то методов нет, соответствующий endpoint или service нужно адаптировать под конкретный database-модуль.

---

## 2. Как подключить database через Docker

Положи сгенерированный database-модуль рядом с backend:

```text
project/
  app/
  database/
  docker-compose.yml
```

В `docker-compose.yml` уже есть volume:

```yaml
volumes:
  - ./database:/app/database:ro
```

Если хочешь не монтировать, а копировать в image, добавь в Dockerfile:

```dockerfile
COPY database ./database
```

---

## 3. Быстрый старт

```bash
cp .env.example .env
```

Отредактируй:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/app
SECRET_KEY=change-me
```

Запуск:

```bash
docker compose up --build
```

Проверка:

```bash
curl http://localhost:8000/api/v1/health/live
curl http://localhost:8000/api/v1/health/ready
```

---

## 4. Структура проекта

```text
app/
  main.py
  factory.py

  api/
    deps.py
    router.py
    v1/
      router.py
      health.py
      auth.py
      users.py
      mcp.py
      admin.py
      crm/
        contacts.py
        deals.py
        dashboard.py
        search.py

  core/
    config.py
    exceptions.py
    logging.py
    middleware.py
    pagination.py
    permissions.py
    responses.py
    security.py

  integrations/
    database.py

  modules/
    auth/
      schemas.py
      service.py
    users/
      schemas.py
      service.py
    mcp/
      schemas.py
      service.py
    crm/
      schemas.py
      service.py

  observability/
    health.py
    telemetry.py
```

---

## 5. Главный request flow

### Web/JWT

```text
HTTP request
  ↓
router
  ↓
Depends(get_current_user)
  ↓
service
  ↓
database.manager.transactional_crud()
  ↓
database.crud / database.crud.scenarios
  ↓
PostgreSQL
```

### MCP key

```text
HTTP request
  ↓
Authorization: Bearer <raw_mcp_key>
  ↓
Depends(get_mcp_principal)
  ↓
McpService
  ↓
crud.mcp_keys.valid_by_raw_key(...)
  ↓
crud.scenarios.mcp_ingest_contact(...)
  ↓
PostgreSQL
```

---

## 6. Где писать свои endpoint'ы

Логические группы уже подготовлены:

```text
app/api/v1/auth.py
app/api/v1/users.py
app/api/v1/mcp.py
app/api/v1/admin.py
app/api/v1/crm/contacts.py
app/api/v1/crm/deals.py
app/api/v1/crm/dashboard.py
app/api/v1/crm/search.py
```

Добавляй новые группы так:

```text
app/api/v1/crm/tasks.py
app/api/v1/billing/invoices.py
app/api/v1/files/uploads.py
```

Потом подключай их в:

```text
app/api/v1/router.py
```

---

## 7. Правило работы с БД

Внутри endpoint'ов не пиши SQL руками.

Правильно:

```python
@router.post("/contacts")
async def create_contact(
    payload: ContactCreate,
    current_user: CurrentUserDep,
    service: CrmServiceDep,
):
    return await service.create_contact(current_user.id, payload)
```

В service:

```python
async with self.db.transactional_crud() as crud:
    return await crud.scenarios.create_contact_full(...)
```

Неправильно:

```python
await session.execute(text("INSERT INTO ..."))
```

Исключение: health-check и редкие технические diagnostics.

---

## 8. Авторизация

### JWT login

Endpoint:

```text
POST /api/v1/auth/token
```

Ожидает OAuth2 form fields:

```text
username
password
```

Возвращает:

```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### Current user

```text
GET /api/v1/users/me
```

Требует JWT.

### Admin-only

Используй dependency:

```python
AdminUserDep
```

Он ожидает, что у пользователя есть role `ADMIN` или `is_superuser=True`.

---

## 9. MCP авторизация

MCP endpoint'ы используют raw key:

```http
Authorization: Bearer mcp_xxx
```

Dependency:

```python
McpPrincipalDep
```

Scopes проверяются через:

```python
require_scope(principal, "contacts:write")
```

Стандартные scopes:

```text
crm:read
crm:write
crm:admin
contacts:read
contacts:write
contacts:delete
deals:read
deals:write
deals:delete
search:read
dashboard:read
```

---

## 10. Logging

Логи JSON-формата.

Каждый request получает:

```text
x-request-id
```

Он также попадает в логи через contextvar.

---

## 11. Production checklist

Перед production:

- поменять `SECRET_KEY`;
- выключить `DEBUG`;
- указать `BACKEND_CORS_ORIGINS`;
- настроить reverse proxy;
- включить HTTPS;
- ограничить trusted hosts;
- настроить backup БД;
- настроить migrations;
- добавить rate limiting на auth endpoints;
- добавить интеграционные тесты под конкретный database-модуль.

---

## 12. Проверки

```bash
make lint
make typecheck
make test
```

Минимально без зависимостей можно проверить синтаксис:

```bash
python -m compileall app
```

---

## 13. Alembic migrations

Шаблон содержит Alembic-конфигурацию, которая берет metadata из внешнего `database`-модуля:

```text
migrations/env.py
```

Перед запуском миграций `database/` должен быть смонтирован или скопирован в корень проекта.

Команды:

```bash
make migration MSG="init crm"
make migrate
```

Для PostgreSQL-схем включено `include_schemas=True`.

Если ты используешь `init.sql` как главный bootstrap-файл, Alembic можно использовать только для следующих изменений после baseline.
