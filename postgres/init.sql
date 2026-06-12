CREATE SCHEMA IF NOT EXISTS crm;

-- =====================================================
-- ENUMS
-- =====================================================

DO $$
BEGIN
    CREATE TYPE crm.user_role AS ENUM (
        'ADMIN',
        'USER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE crm.contact_status AS ENUM (
        'NEW',
        'LEAD',
        'ACTIVE',
        'CUSTOMER',
        'INACTIVE',
        'LOST'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE crm.deal_status AS ENUM (
        'NEW',
        'CONTACTED',
        'NEGOTIATION',
        'PROPOSAL_SENT',
        'WAITING_RESPONSE',
        'WON',
        'LOST',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.users (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(240) NOT NULL,
    password_hash TEXT,

    role crm.user_role NOT NULL DEFAULT 'USER',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MCP KEYS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.mcp_keys (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES crm.users(id)
        ON DELETE CASCADE,

    name VARCHAR(120) NOT NULL,

    key_hash TEXT NOT NULL UNIQUE,

    scopes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CONTACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.contacts (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES crm.users(id)
        ON DELETE CASCADE,

    first_name VARCHAR(120),
    last_name VARCHAR(120),
    middle_name VARCHAR(120),

    full_name VARCHAR(320),

    birth_date DATE,

    source VARCHAR(120),

    status crm.contact_status NOT NULL DEFAULT 'NEW',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, user_id)
);

-- =====================================================
-- CONTACT PHONES
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.contact_phones (
    id BIGSERIAL PRIMARY KEY,

    contact_id BIGINT NOT NULL
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE,

    phone VARCHAR(64) NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (contact_id, phone)
);

-- =====================================================
-- CONTACT EMAILS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.contact_emails (
    id BIGSERIAL PRIMARY KEY,

    contact_id BIGINT NOT NULL
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE,

    email VARCHAR(320) NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (contact_id, email)
);

-- =====================================================
-- CONTACT ADDRESSES
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.contact_addresses (
    id BIGSERIAL PRIMARY KEY,

    contact_id BIGINT NOT NULL
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE,

    address TEXT NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CONTACT TAGS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.contact_tags (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES crm.users(id)
        ON DELETE CASCADE,

    contact_id BIGINT NOT NULL,

    tag VARCHAR(120) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (contact_id, user_id)
        REFERENCES crm.contacts(id, user_id)
        ON DELETE CASCADE,

    UNIQUE (user_id, contact_id, tag)
);

-- =====================================================
-- CONTACT NOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.contact_notes (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES crm.users(id)
        ON DELETE CASCADE,

    contact_id BIGINT NOT NULL,

    note TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (contact_id, user_id)
        REFERENCES crm.contacts(id, user_id)
        ON DELETE CASCADE
);

-- =====================================================
-- DEALS
-- =====================================================

CREATE TABLE IF NOT EXISTS crm.deals (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES crm.users(id)
        ON DELETE CASCADE,

    contact_id BIGINT NOT NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    amount NUMERIC(14,2),

    currency VARCHAR(10) NOT NULL DEFAULT 'RUB',

    comment TEXT,

    status crm.deal_status NOT NULL DEFAULT 'NEW',

    close_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (contact_id, user_id)
        REFERENCES crm.contacts(id, user_id)
        ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_username
    ON crm.users(username);

CREATE INDEX IF NOT EXISTS idx_mcp_keys_user_id
    ON crm.mcp_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_mcp_keys_key_hash
    ON crm.mcp_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_mcp_keys_active
    ON crm.mcp_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id
    ON crm.contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_user_status
    ON crm.contacts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_contacts_full_name
    ON crm.contacts(full_name);

CREATE INDEX IF NOT EXISTS idx_contact_phones_contact_id
    ON crm.contact_phones(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_phones_phone
    ON crm.contact_phones(phone);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_phones_primary
    ON crm.contact_phones(contact_id)
    WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_contact_emails_contact_id
    ON crm.contact_emails(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_emails_email
    ON crm.contact_emails(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_emails_primary
    ON crm.contact_emails(contact_id)
    WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_contact_addresses_contact_id
    ON crm.contact_addresses(contact_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_addresses_primary
    ON crm.contact_addresses(contact_id)
    WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_contact_tags_user_id
    ON crm.contact_tags(user_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id
    ON crm.contact_tags(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_notes_user_id
    ON crm.contact_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id
    ON crm.contact_notes(contact_id);

CREATE INDEX IF NOT EXISTS idx_deals_user_id
    ON crm.deals(user_id);

CREATE INDEX IF NOT EXISTS idx_deals_contact_id
    ON crm.deals(contact_id);

CREATE INDEX IF NOT EXISTS idx_deals_user_status
    ON crm.deals(user_id, status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crm.set_contact_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name = NULLIF(
        concat_ws(
            ' ',
            NULLIF(btrim(NEW.last_name), ''),
            NULLIF(btrim(NEW.first_name), ''),
            NULLIF(btrim(NEW.middle_name), '')
        ),
        ''
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trg_users_updated_at ON crm.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON crm.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mcp_keys_updated_at ON crm.mcp_keys;
CREATE TRIGGER trg_mcp_keys_updated_at
BEFORE UPDATE ON crm.mcp_keys
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON crm.contacts;
CREATE TRIGGER trg_contacts_updated_at
BEFORE UPDATE ON crm.contacts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_full_name ON crm.contacts;
CREATE TRIGGER trg_contacts_full_name
BEFORE INSERT OR UPDATE OF first_name, last_name, middle_name
ON crm.contacts
FOR EACH ROW
EXECUTE FUNCTION crm.set_contact_full_name();

DROP TRIGGER IF EXISTS trg_deals_updated_at ON crm.deals;
CREATE TRIGGER trg_deals_updated_at
BEFORE UPDATE ON crm.deals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();