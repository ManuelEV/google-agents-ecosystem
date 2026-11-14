# andes_workflow · multi-agente

Dos formas de componer el mismo sistema:

| | `agent.py` (coordinador) | `graph.py` (Workflow) |
|---|---|---|
| Quién decide la ruta | el LLM del raíz, leyendo las `description` de los sub-agentes | una función Python (`route`) a partir de una etiqueta del clasificador |
| Humano en el circuito | `request_refund` con `require_confirmation` | nodo `supervisor_review` con `RequestInput` |
| Cuándo conviene | conversaciones abiertas, aclaraciones, muchos casos | flujos regulados, auditables y testeables |

```bash
cd examples
adk web --port 8000      # elige andes_workflow (usa las mismas herramientas que andes_data)
```

En `adk web` → **Events** verás `transfer_to_agent` / las llamadas a `pedidos_agent`, `devoluciones_agent`… y cómo vuelve el control al coordinador con `finish_task`.
