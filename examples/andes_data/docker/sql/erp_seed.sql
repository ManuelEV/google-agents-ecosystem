-- Inventario del ERP (en producción: Postgres on-prem u otra nube, fuera de Google Cloud)
CREATE TABLE inventory (
  sku          TEXT NOT NULL,
  name         TEXT NOT NULL,
  warehouse    TEXT NOT NULL,
  stock        INTEGER NOT NULL,
  restock_date DATE,
  PRIMARY KEY (sku, warehouse)
);

INSERT INTO inventory VALUES
  ('ZAP-TRK-41',  'Zapatillas trekking Cordillera 41', 'Santiago',   3,  NULL),
  ('MOCH-30L-AZ', 'Mochila 30L azul',                  'Santiago',   0,  '2026-11-18'),
  ('BOT-TERM-1L', 'Botella térmica 1L',                'Santiago',   42, NULL),
  ('POL-POLAR-M', 'Polar Patagonia M',                 'Concepción', 11, NULL);
