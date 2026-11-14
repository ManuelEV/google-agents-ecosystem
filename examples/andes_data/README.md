# andes_data · datos dentro y fuera de Google

```
                      ┌──────────────── MCP Toolbox (tools.yaml) ────────────────┐
  agente ADK ──MCP──▶ │ orders-db   → Cloud SQL Postgres     (dentro de Google)   │
      │               │ erp-db      → Postgres on-prem/otra nube (fuera)          │
      │               │ analytics   → BigQuery                (dentro)            │
      │               └───────────────────────────────────────────────────────────┘
      ├──MCP (Streamable HTTP)──▶ carrier_mcp/server.py  → API AndesExpress (fuera)
      └──función Python──▶ request_refund (con confirmación humana sobre $50.000)
```

## Probar en local (sin Google Cloud)

```bash
cd examples
docker compose -f andes_data/docker/compose.yaml up -d      # 2 Postgres + Toolbox en :5000
python -m andes_data.carrier_mcp.server &                   # MCP del transportista en :8081
cp .env.example andes_data/.env                              # + GOOGLE_API_KEY
adk web --port 8000                                          # elige andes_data
```

Preguntas para probar:

- `¿Qué pedidos tiene camila.rojas@example.cl?` → `search_orders_by_customer` (orders-db)
- `¿Hay stock de MOCH-30L-AZ?` → `get_stock` (erp-db, fuera de Google)
- `¿Dónde viene el pedido 4821?` → `get_order` + `track_shipment` (MCP externo)
- `Quiero devolver el pedido 4790, me llegó roto` → `request_refund` ($29.990, se aprueba solo)
- `Reembolsa $65.000 del pedido 5102` → ADK pausa y muestra la confirmación en `adk web`

## Producción

- `toolbox --config andes_data/toolbox/tools.yaml` con las variables de `.env.example`. En Cloud Run, corre Toolbox como **sidecar** y conecta a Cloud SQL con IAM (sin contraseñas).
- Al ERP on-prem se llega por VPN / Interconnect o IP privada; Toolbox es el único componente con credenciales de esa base.
- `ToolboxToolset(..., credentials=CredentialStrategy.workload_identity(target_audience=TOOLBOX_URL))` para que el agente se autentique con su identidad.
- BigQuery usa ADC: la identidad del agente necesita `roles/bigquery.dataViewer` + `roles/bigquery.jobUser` sobre el dataset.
