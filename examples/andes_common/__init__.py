"""Datos y prompts compartidos por los cuatro agentes de ejemplo.

Todo es inventado (Andes Market no existe). Los formatos son reales: las
herramientas devuelven dicts con una clave "status", como recomienda ADK.
"""

from .data import CUSTOMERS, INVENTORY, ORDERS, REFUND_POLICY
from .prompts import ROOT_INSTRUCTION

__all__ = ["CUSTOMERS", "INVENTORY", "ORDERS", "REFUND_POLICY", "ROOT_INSTRUCTION"]
