-- Additive. Do not delete/recreate D1. Apply only to staging until promotion approved.
CREATE TABLE IF NOT EXISTS game_owners (
 account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 owner TEXT NOT NULL CHECK(owner IN ('DO','D1')), epoch TEXT NOT NULL, updated_at INTEGER NOT NULL, activated INTEGER NOT NULL DEFAULT 0, handoff_revision INTEGER, handoff_checksum TEXT
);
CREATE TABLE IF NOT EXISTS game_checkpoints (
 account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL, state_gzip BLOB NOT NULL, checksum TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS games_do_insert_fence BEFORE INSERT ON games
WHEN EXISTS(SELECT 1 FROM game_owners WHERE account_id=NEW.account_id AND owner='DO')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_OWNED_BY_DURABLE_OBJECT'); END;
CREATE TRIGGER IF NOT EXISTS games_do_update_fence BEFORE UPDATE ON games
WHEN EXISTS(SELECT 1 FROM game_owners WHERE account_id=OLD.account_id AND owner='DO')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_OWNED_BY_DURABLE_OBJECT'); END;
CREATE TRIGGER IF NOT EXISTS games_do_delete_fence BEFORE DELETE ON games
WHEN EXISTS(SELECT 1 FROM game_owners WHERE account_id=OLD.account_id AND owner='DO')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_OWNED_BY_DURABLE_OBJECT'); END;
