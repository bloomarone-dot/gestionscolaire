"""Évaluation des politiques : règles, priorités, exceptions et conflits."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from common.progression.criteria import CriterionContext, get_criterion


OPERATORS = {
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    ">": lambda a, b: a is not None and b is not None and float(a) > float(b),
    ">=": lambda a, b: a is not None and b is not None and float(a) >= float(b),
    "<": lambda a, b: a is not None and b is not None and float(a) < float(b),
    "<=": lambda a, b: a is not None and b is not None and float(a) <= float(b),
    "in": lambda a, b: a in (b if isinstance(b, (list, tuple, set)) else [b]),
    "contains": lambda a, b: b in str(a or ""),
}


@dataclass
class RuleMatch:
    rule_name: str
    decision_code: str
    priority: int
    dest_action: str = "AUTO"
    rationale: str = ""
    criteria_values: dict = field(default_factory=dict)
    policy_id: int | None = None
    policy_version: int | None = None
    is_exception: bool = False


@dataclass
class PolicyBundle:
    id: int
    version: int
    name: str
    priority: int
    rules: list[dict]
    exceptions: list[dict]


class PolicyEngine:
    """Évalue les politiques actives pour un élève et retourne une proposition."""

    def __init__(self, policies: list[PolicyBundle]):
        self.policies = sorted(policies, key=lambda p: p.priority)

    def evaluate(self, ctx: CriterionContext) -> Optional[RuleMatch]:
        criteria_values = self._gather_values(ctx, self.policies)
        matches: list[RuleMatch] = []

        for policy in self.policies:
            for exc in policy.exceptions or []:
                if self._rule_matches(ctx, exc, criteria_values):
                    matches.append(RuleMatch(
                        rule_name=exc.get("name", "Exception"),
                        decision_code=exc["decision_code"],
                        priority=int(exc.get("priority", policy.priority)),
                        dest_action=exc.get("dest_action", "AUTO"),
                        rationale=exc.get("rationale", "Exception appliquée"),
                        criteria_values=dict(criteria_values),
                        policy_id=policy.id,
                        policy_version=policy.version,
                        is_exception=True,
                    ))

            for rule in policy.rules or []:
                if self._rule_matches(ctx, rule, criteria_values):
                    matches.append(RuleMatch(
                        rule_name=rule.get("name", "Règle"),
                        decision_code=rule["decision_code"],
                        priority=int(rule.get("priority", policy.priority)),
                        dest_action=rule.get("dest_action", "AUTO"),
                        rationale=rule.get("rationale", ""),
                        criteria_values=dict(criteria_values),
                        policy_id=policy.id,
                        policy_version=policy.version,
                    ))

        if not matches:
            return None

        # Résolution de conflit : priorité la plus haute (nombre le plus petit = plus prioritaire).
        matches.sort(key=lambda m: m.priority)
        winner = matches[0]
        if len(matches) > 1:
            winner.rationale = (
                f"{winner.rationale} [Conflit résolu — {len(matches)} règle(s) candidate(s), "
                f"priorité {winner.priority}]"
            ).strip()
        return winner

    def _gather_values(self, ctx: CriterionContext, policies: list[PolicyBundle]) -> dict[str, Any]:
        codes: set[str] = set()
        for p in policies:
            for block in (p.rules or []) + (p.exceptions or []):
                for cond in block.get("conditions") or []:
                    codes.add(cond.get("criterion", ""))
        values: dict[str, Any] = {}
        for code in codes:
            if not code:
                continue
            meta = get_criterion(code)
            if not meta:
                values[code] = None
                continue
            cond_cfg = next(
                (c.get("config") or {} for p in policies for block in (p.rules or []) + (p.exceptions or [])
                 for c in (block.get("conditions") or []) if c.get("criterion") == code),
                {},
            )
            try:
                values[code] = meta.evaluate(ctx, cond_cfg)
            except Exception:
                values[code] = None
        return values

    @staticmethod
    def _rule_matches(ctx: CriterionContext, rule: dict, precomputed: dict[str, Any]) -> bool:
        conditions = rule.get("conditions") or []
        if not conditions:
            return False
        logic = (rule.get("logic") or "AND").upper()
        results = []
        for cond in conditions:
            code = cond.get("criterion")
            op = cond.get("operator", ">=")
            expected = cond.get("value")
            meta = get_criterion(code) if code else None
            if meta and code not in precomputed:
                actual = meta.evaluate(ctx, cond.get("config") or {})
            else:
                actual = precomputed.get(code)
            fn = OPERATORS.get(op)
            results.append(bool(fn(actual, expected)) if fn else False)
        return all(results) if logic == "AND" else any(results)
