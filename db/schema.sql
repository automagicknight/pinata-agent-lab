-- Local, tamper-evident audit trail. This is a CACHE of what has been
-- pinned to IPFS/Pinata — it is not itself the source of truth. The
-- source of truth is the signed, hash-chained objects on IPFS.

CREATE TABLE IF NOT EXISTS trust_records (
    seq                 INTEGER PRIMARY KEY,
    cid                 TEXT NOT NULL UNIQUE,
    composite_key       TEXT NOT NULL UNIQUE,
    prev_composite_key  TEXT NOT NULL,
    event_type          TEXT NOT NULL DEFAULT 'create',
    spatial             TEXT NOT NULL,
    rule_dictionary     TEXT NOT NULL,
    signer_public_key   TEXT NOT NULL,
    signature           TEXT NOT NULL,
    pinned_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gateway_url         TEXT,
    status              TEXT DEFAULT 'PINNED'  -- PINNED | FAILED | SUPERSEDED
);

CREATE INDEX IF NOT EXISTS idx_cid ON trust_records(cid);
CREATE INDEX IF NOT EXISTS idx_composite_key ON trust_records(composite_key);
CREATE INDEX IF NOT EXISTS idx_prev ON trust_records(prev_composite_key);
