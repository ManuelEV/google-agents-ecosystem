"""Servidor MCP que envuelve la API (ficticia) del transportista AndesExpress.

Representa un sistema FUERA de Google Cloud al que el agente accede por MCP
(transporte Streamable HTTP). En la vida real este servidor llamaría a la API
REST del transportista; aquí responde con datos simulados.

    python -m andes_data.carrier_mcp.server     # http://127.0.0.1:8081/mcp
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("andesexpress", host="127.0.0.1", port=8081)

SHIPMENTS = {
    "AX-88213-CL": {"last_event": "En reparto · Valparaíso", "eta": "2026-11-14", "updated_at": "2026-11-13T09:40:00-03:00"},
    "AX-87720-CL": {"last_event": "Entregado · firmado por C. Rojas", "eta": "2026-10-30", "updated_at": "2026-10-30T16:05:00-03:00"},
    "AX-87901-CL": {"last_event": "Entregado", "eta": "2026-11-03", "updated_at": "2026-11-03T12:30:00-03:00"},
}


@mcp.tool()
def track_shipment(tracking: str) -> dict:
    """Devuelve el último evento y la fecha estimada de entrega de un envío de AndesExpress.

    Args:
        tracking: Código de seguimiento, por ejemplo "AX-88213-CL".
    """
    data = SHIPMENTS.get(tracking.strip().upper())
    if data is None:
        return {"status": "error", "error_message": f"Código de seguimiento desconocido: {tracking}"}
    return {"status": "success", "tracking": tracking.upper(), **data}


@mcp.tool()
def list_service_points(city: str) -> dict:
    """Lista puntos de retiro de AndesExpress en una ciudad (dato ficticio)."""
    return {"status": "success", "city": city, "points": [f"Punto {city} Centro", f"Punto {city} Norte"]}


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
