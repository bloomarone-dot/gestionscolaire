"""Moteur de progression académique — critères extensibles et évaluation de règles."""

from common.progression.criteria import CRITERION_REGISTRY, CriterionContext, get_criterion, list_criteria
from common.progression.engine import PolicyEngine, RuleMatch

__all__ = [
    "CRITERION_REGISTRY",
    "CriterionContext",
    "PolicyEngine",
    "RuleMatch",
    "get_criterion",
    "list_criteria",
]
