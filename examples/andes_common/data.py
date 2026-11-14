"""Datos simulados de Andes Market (retail online chileno ficticio)."""

CUSTOMERS = {
    "cus_7781": {"name": "Camila Rojas", "email": "camila.rojas@example.cl", "tier": "plus", "city": "Valparaíso"},
    "cus_1032": {"name": "Tomás Fuentes", "email": "tomas.fuentes@example.cl", "tier": "standard", "city": "Santiago"},
}

ORDERS = {
    "4821": {
        "order_id": "4821",
        "customer_id": "cus_7781",
        "state": "en_ruta",
        "items": [{"sku": "ZAP-TRK-41", "name": "Zapatillas trekking Cordillera 41", "qty": 1, "price_clp": 69990}],
        "total_clp": 69990,
        "carrier": "AndesExpress",
        "tracking": "AX-88213-CL",
        "eta": "2026-11-14",
        "created": "2026-11-10",
    },
    "5102": {
        "order_id": "5102",
        "customer_id": "cus_7781",
        "state": "preparando",
        "items": [
            {"sku": "MOCH-30L-AZ", "name": "Mochila 30L azul", "qty": 1, "price_clp": 39990},
            {"sku": "BOT-TERM-1L", "name": "Botella térmica 1L", "qty": 2, "price_clp": 12990},
        ],
        "total_clp": 65970,
        "carrier": None,
        "tracking": None,
        "eta": None,
        "created": "2026-11-12",
    },
    "4790": {
        "order_id": "4790",
        "customer_id": "cus_7781",
        "state": "entregado",
        "items": [{"sku": "POL-POLAR-M", "name": "Polar Patagonia M", "qty": 1, "price_clp": 29990}],
        "total_clp": 29990,
        "carrier": "AndesExpress",
        "tracking": "AX-87720-CL",
        "eta": "2026-10-30",
        "created": "2026-10-28",
    },
}

INVENTORY = {
    "ZAP-TRK-41": {"name": "Zapatillas trekking Cordillera 41", "stock": 3, "warehouse": "Santiago"},
    "MOCH-30L-AZ": {"name": "Mochila 30L azul", "stock": 0, "warehouse": "Santiago", "restock": "2026-11-18"},
    "BOT-TERM-1L": {"name": "Botella térmica 1L", "stock": 42, "warehouse": "Santiago"},
    "POL-POLAR-M": {"name": "Polar Patagonia M", "stock": 11, "warehouse": "Concepción"},
}

# Reembolsos hasta este monto se aprueban solos; sobre él, un supervisor confirma.
REFUND_POLICY = {"auto_approve_max_clp": 50_000, "window_days": 30}
