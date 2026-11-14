"""Evaluación integrada en pytest (CI).

    cd examples && pytest andes_prod/tests -q

Los criterios juzgados por LLM (final_response_match_v2, safety_v1) usan el
Gen AI Evaluation Service: necesitas GOOGLE_API_KEY o proyecto + ADC.
"""

import pytest
from google.adk.evaluation.agent_evaluator import AgentEvaluator


@pytest.mark.asyncio
async def test_smoke_evalset():
    await AgentEvaluator.evaluate(
        agent_module="andes_prod",
        eval_dataset_file_path_or_dir="andes_prod/evals/andes_ops.evalset.json",
    )
