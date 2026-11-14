# andes_hello

```bash
cd examples
cp .env.example andes_hello/.env     # pon GOOGLE_API_KEY o la config de Vertex
adk web --port 8000                  # abre http://localhost:8000 y elige "andes_hello"
```

Prueba: `¿Dónde está mi pedido 4821?` → verás en la pestaña **Events** el `function_call` a `get_order_status`, el `function_response` y la respuesta final; en **State**, `last_order_id = "4821"`.

Prueba el error: `¿Y el pedido 9999?` → la herramienta responde `status: "error"` y el modelo lo explica.
