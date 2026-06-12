import logging
from decimal import Decimal
from typing import Any

from app.integrations.database import DatabaseSessionManagerProtocol
from app.core.security import hash_password

logger = logging.getLogger(__name__)

async def bootstrap_database(db: DatabaseSessionManagerProtocol) -> None:
    """Check if database is empty and bootstrap default data if so."""
    try:
        from database.models import User, McpKey
        from database.enums import UserRole, ContactStatus, DealStatus
        from database.utils import hash_key
    except ImportError as err:
        logger.error("Failed to import database models for seeding: %s", err)
        return

    async with db.transactional_crud() as crud:
        # Check if users already exist
        user_count = await crud.users.count()
        if user_count > 0:
            logger.info("Database already seeded (found %d users). Skipping.", user_count)
            return

        logger.info("Database is empty. Starting bootstrap seeding...")

        # 1. Create Default Admin User
        admin_pass = "adminpassword"
        admin = User(
            username="admin",
            name="Никита",
            password_hash=hash_password(admin_pass),
            role=UserRole.ADMIN,
            is_active=True,
        )
        crud.session.add(admin)
        await crud.flush()

        logger.info(
            "Created default admin user. Username: 'admin', Password: '%s'",
            admin_pass,
        )

        # 2. Create Default MCP Key
        raw_mcp_key = "agent_crm_default_secret_key_12345"
        mcp_key = McpKey(
            user_id=admin.id,
            name="Default API Key",
            key_hash=hash_key(raw_mcp_key),
            scopes=["contacts:read", "contacts:write"],
            is_active=True,
        )
        crud.session.add(mcp_key)
        await crud.flush()

        logger.info(
            "Created default MCP key. Raw Key: '%s' (scopes: read/write)",
            raw_mcp_key,
        )

        # 3. Create Default Contacts & Deals
        # Dimitri Kozlov
        await crud.scenario.create_contact_with_deal(
            user_id=admin.id,
            first_name="Дмитрий",
            last_name="Козлов",
            phones=["+7 (999) 111-22-33", "+7 (900) 123-45-67"],
            emails=["d.kozlov@ai-labs.ru", "dmitry@kozlov.io"],
            addresses=["Москва, Садовническая ул., д. 42"],
            tags=["AI Agent", "Client", "Warm"],
            contact_status=ContactStatus.ACTIVE,
            note="Интересуется интеграцией ИИ-помощника в свой отдел продаж. Готовы обсуждать детали пилота.",
            deal_title="ИИ-Ассистент для отдела продаж",
            deal_description="Интеграция умного голосового ассистента в CRM заказчика для квалификации лидов на входящей линии.",
            deal_amount=Decimal("250000"),
            deal_status=DealStatus.NEGOTIATION,
        )

        # Anna Smirnova
        await crud.scenario.create_contact_with_deal(
            user_id=admin.id,
            first_name="Анна",
            last_name="Смирнова",
            phones=["+7 (905) 555-44-33"],
            emails=["smirnova.anna@retail.org"],
            addresses=["Санкт-Петербург, Невский пр., д. 15"],
            tags=["Retail", "Hot"],
            contact_status=ContactStatus.ACTIVE,
            note="Планируют запуск умного чат-ботика для поддержки покупателей на сайте и в Telegram.",
            deal_title="Чат-бот поддержки Retail",
            deal_description="Мультиязычный чат-бот для ритейл платформы с базой знаний и интеграцией с каталогом товаров.",
            deal_amount=Decimal("120000"),
            deal_status=DealStatus.WON,
        )

        # Alexander Petrov
        await crud.scenario.create_contact_with_deal(
            user_id=admin.id,
            first_name="Александр",
            last_name="Петров",
            phones=["+7 (911) 456-78-90"],
            emails=["a.petrov@techflow.io"],
            addresses=["Новосибирск, ул. Ленина, д. 12"],
            tags=["Enterprise", "Partner"],
            contact_status=ContactStatus.ACTIVE,
            note="Обсудили пилотный проект по автоматизации внутреннего документооборота с помощью LLM.",
            deal_title="Автоматизация документооборота",
            deal_description="Внедрение системы извлечения сущностей из договоров и счетов на базе ИИ-агента.",
            deal_amount=Decimal("450000"),
            deal_status=DealStatus.WAITING_RESPONSE,
        )

        # Elena Sokolova
        await crud.scenario.create_contact_with_deal(
            user_id=admin.id,
            first_name="Елена",
            last_name="Соколова",
            phones=["+7 (903) 777-88-99"],
            emails=["e.sokolova@creative.media"],
            addresses=[],
            tags=["Lead"],
            contact_status=ContactStatus.NEW,
            note="Поступил запрос коммерческого предложения на разработку голосового ИИ-агента для обзвона базы.",
            deal_title="Голосовой бот поддержки (пилот)",
            deal_description="Разработка и пилотное тестирование робота для обработки частых вопросов в службе поддержки.",
            deal_amount=Decimal("180000"),
            deal_status=DealStatus.NEW,
        )

        # Mikhail Morozov
        await crud.scenario.create_contact_with_deal(
            user_id=admin.id,
            first_name="Михаил",
            last_name="Морозов",
            phones=["+7 (926) 333-22-11"],
            emails=["m.morozov@fintech.group"],
            addresses=["Москва, Сити, Башня Федерация"],
            tags=["Lead", "Finance"],
            contact_status=ContactStatus.NEW,
            note="Встреча назначена на пятницу. Очень важна информационная безопасность и локальное развертывание модели.",
            deal_title="ИИ-Комплаенс аудит документов",
            deal_description="Финансовый комплаенс и автоматическая проверка транзакций на предмет рисков.",
            deal_amount=Decimal("890000"),
            deal_status=DealStatus.LOST,
        )

        logger.info("Database bootstrap seeding completed successfully.")
