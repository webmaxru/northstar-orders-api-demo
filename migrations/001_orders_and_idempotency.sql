CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  sku text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  key_hash text PRIMARY KEY,
  request_hash text NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id),
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idempotency_records_expires_at_idx
  ON idempotency_records (expires_at);

