-- Add lines to this file when you modify the database.
-- Execute the appropriate statements when needed;

CREATE TABLE IF NOT EXISTS users (
    id integer NOT NULL,
    username character(255),
    api_key text,
    email character(255),
    reset_token text,
    reset_expires timestamp without time zone
);

ALTER TABLE users ADD COLUMN created TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS stats (
    period date,
    key text,
    value bigint default 0
);

ALTER TABLE stats ADD UNIQUE (period, key);
