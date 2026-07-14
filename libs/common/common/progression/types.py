"""Types partagés pour le moteur de progression."""

from enum import StrEnum


class EnrollmentAction(StrEnum):
    """Action d'inscription préparée après validation d'une décision."""
    PASS_HIGHER = "PASS_HIGHER"       # classe supérieure
    STAY_SAME = "STAY_SAME"           # même classe (redoublement)
    OTHER_CLASS = "OTHER_CLASS"       # autre classe (réorientation)
    CYCLE_CHANGE = "CYCLE_CHANGE"     # changement de cycle
    EXIT = "EXIT"                     # sortie (diplômé / fin de parcours)
    EXCLUDE = "EXCLUDE"               # exclusion
    ABANDON = "ABANDON"               # abandon
    NONE = "NONE"                     # aucune action auto (ex. à délibérer)


class ProposalStatus(StrEnum):
    PROPOSED = "PROPOSED"
    ACCEPTED = "ACCEPTED"
    MODIFIED = "MODIFIED"
    REJECTED = "REJECTED"
    POSTPONED = "POSTPONED"
    APPLIED = "APPLIED"


class AuditAction(StrEnum):
    CREATED = "CREATED"
    ACCEPTED = "ACCEPTED"
    MODIFIED = "MODIFIED"
    REJECTED = "REJECTED"
    POSTPONED = "POSTPONED"
    APPLIED = "APPLIED"
    COMMENT = "COMMENT"
