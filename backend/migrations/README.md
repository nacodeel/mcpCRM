# Migrations

Alembic is configured to use metadata from the external `database` module.

Before running migrations, mount or copy `database/` into the project root.

Recommended commands:

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

For PostgreSQL schemas, `include_schemas=True` is enabled in `env.py`.
