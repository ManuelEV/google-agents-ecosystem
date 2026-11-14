-- Base de pedidos (en producción: Cloud SQL para PostgreSQL)
CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  tier        TEXT NOT NULL DEFAULT 'standard',
  city        TEXT
);

CREATE TABLE orders (
  order_id    TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  state       TEXT NOT NULL,            -- preparando | en_ruta | entregado | devuelto
  total_clp   INTEGER NOT NULL,
  carrier     TEXT,
  tracking    TEXT,
  eta         DATE,
  created     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id  TEXT NOT NULL REFERENCES orders(order_id),
  sku       TEXT NOT NULL,
  name      TEXT NOT NULL,
  qty       INTEGER NOT NULL,
  price_clp INTEGER NOT NULL
);

INSERT INTO customers VALUES
  ('cus_7781', 'Camila Rojas', 'camila.rojas@example.cl', 'plus', 'Valparaíso'),
  ('cus_1032', 'Tomás Fuentes', 'tomas.fuentes@example.cl', 'standard', 'Santiago');

INSERT INTO orders VALUES
  ('4821', 'cus_7781', 'en_ruta',    69990, 'AndesExpress', 'AX-88213-CL', '2026-11-14', '2026-11-10 10:12:00-03'),
  ('5102', 'cus_7781', 'preparando', 65970, NULL,           NULL,          NULL,         '2026-11-12 18:40:00-03'),
  ('4790', 'cus_7781', 'entregado',  29990, 'AndesExpress', 'AX-87720-CL', '2026-10-30', '2026-10-28 09:05:00-03'),
  ('4903', 'cus_1032', 'entregado',  12990, 'AndesExpress', 'AX-87901-CL', '2026-11-03', '2026-11-01 15:22:00-03');

INSERT INTO order_items VALUES
  ('4821', 'ZAP-TRK-41',  'Zapatillas trekking Cordillera 41', 1, 69990),
  ('5102', 'MOCH-30L-AZ', 'Mochila 30L azul',                  1, 39990),
  ('5102', 'BOT-TERM-1L', 'Botella térmica 1L',                2, 12990),
  ('4790', 'POL-POLAR-M', 'Polar Patagonia M',                 1, 29990),
  ('4903', 'BOT-TERM-1L', 'Botella térmica 1L',                1, 12990);
