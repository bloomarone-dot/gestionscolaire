"""Schéma Template bulletin v1 — structure sérialisable, versionnable, validable.

Source de vérité du moteur v2 (opt-in). Indépendant du frontend et du PDF ReportLab.
Aucun code exécutable : textes interpolés via catalogue de variables uniquement.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator

from app.engine.variables import (
    VariableValidationError,
    validate_bind_path,
    validate_interpolated_text,
)

TEMPLATE_SCHEMA_VERSION = 1

COMPONENT_TYPES = frozenset({
    # Design
    "text",
    "image",
    "shape",
    "spacer",
    # School
    "institution_header",
    "school_logo",
    # Student
    "student_block",
    "student_photo",
    # Academic
    "grades_table",
    # Summary
    "summary_block",
    "attendance_block",
    # Signatures
    "signatures_row",
    # Other
    "qr_code",
    "page_number",
})


class TemplateValidationError(ValueError):
    """Definition de template invalide."""


# ── Page / frame ─────────────────────────────────────────────────────────────

class PageMarginsMm(BaseModel):
    top: float = Field(10.0, ge=0, le=80)
    right: float = Field(10.0, ge=0, le=80)
    bottom: float = Field(10.0, ge=0, le=80)
    left: float = Field(10.0, ge=0, le=80)


class PageSpec(BaseModel):
    size: Literal["A4"] = "A4"
    orientation: Literal["portrait", "landscape"] = "portrait"
    margins: PageMarginsMm = Field(default_factory=PageMarginsMm)


class FrameMm(BaseModel):
    """Position / taille absolues en millimètres (origine haut-gauche de la page utile)."""
    x_mm: float = Field(..., ge=-5, le=300)
    y_mm: float = Field(..., ge=-5, le=420)
    width_mm: float = Field(..., gt=0, le=320)
    height_mm: float = Field(..., gt=0, le=450)


# ── Data binding (période / colonnes de notes) ───────────────────────────────

class SequenceColumnBinding(BaseModel):
    """Colonne de séquence/devoir liée à `Note.type_evaluation` (pas de hardcode moteur)."""
    key: str = Field(..., min_length=1, max_length=40, pattern=r"^[a-zA-Z][a-zA-Z0-9_]*$")
    label: str = Field(..., min_length=1, max_length=80)
    source_type_evaluation: str = Field(
        ...,
        min_length=1,
        max_length=60,
        description="Valeur exacte de Note.type_evaluation (ex. sequence_5, devoir_1).",
    )


class SubjectGroupOverride(BaseModel):
    """Surcharge optionnelle des groupes (sinon ClasseMatiere.groupe + fallback legacy)."""
    id: str = Field(..., min_length=1, max_length=40)
    label: str = Field(..., min_length=1, max_length=120)
    order: int = Field(0, ge=0, le=100)
    # Au moins une stratégie de matching
    groupe_numbers: list[int] = Field(default_factory=list)  # match ClasseMatiere.groupe
    subject_ids: list[int] = Field(default_factory=list)
    subject_name_contains: list[str] = Field(default_factory=list)
    show_subtotal: bool = True

    @model_validator(mode="after")
    def _at_least_one_match(self) -> SubjectGroupOverride:
        if not (self.groupe_numbers or self.subject_ids or self.subject_name_contains):
            raise ValueError(
                f"Groupe « {self.id} » : indiquer groupe_numbers, subject_ids ou subject_name_contains."
            )
        for n in self.groupe_numbers:
            if n < 1 or n > 20:
                raise ValueError("groupe_numbers doit être entre 1 et 20")
        return self


class DataBindingSpec(BaseModel):
    period_mode: Literal["trimestre", "sequence", "annual", "custom"] = "trimestre"
    sequence_columns: list[SequenceColumnBinding] = Field(default_factory=list)
    groups_mode: Literal["from_classe_matiere", "from_template", "legacy_infer"] = "from_classe_matiere"
    groups: list[SubjectGroupOverride] = Field(default_factory=list)
    include_ungrouped: bool = True
    complementary_section: bool = True

    @model_validator(mode="after")
    def _groups_consistency(self) -> DataBindingSpec:
        if self.groups_mode == "from_template" and not self.groups:
            raise ValueError("groups_mode=from_template exige au moins un groupe dans data_binding.groups")
        keys = [c.key for c in self.sequence_columns]
        if len(keys) != len(set(keys)):
            raise ValueError("sequence_columns.key doit être unique")
        return self


# ── Colonnes grades_table ────────────────────────────────────────────────────

class GradesColumnAlign(str, Enum):
    left = "left"
    center = "center"
    right = "right"


class GradesTableColumn(BaseModel):
    id: str = Field(..., min_length=1, max_length=40, pattern=r"^[a-zA-Z][a-zA-Z0-9_]*$")
    label: str = Field(..., min_length=1, max_length=80)
    bind: str = Field(
        ...,
        min_length=1,
        max_length=80,
        description="Chemin sûr : subject.* ou grades.<sequence_key> ou summary champs ligne.",
    )
    width: float = Field(..., gt=0, le=1.0, description="Fraction relative de la largeur du tableau")
    align: GradesColumnAlign = GradesColumnAlign.left
    visible: bool = True
    numeric_format: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Ex. '0.00' — format d'affichage, pas d'expression.",
    )

    @field_validator("bind")
    @classmethod
    def _bind_safe(cls, v: str) -> str:
        return validate_bind_path(v, context="grades_table.column.bind")

    @field_validator("numeric_format")
    @classmethod
    def _format_safe(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re_fullmatch_simple_format(v):
            raise ValueError("numeric_format invalide (ex. 0.00, 0.##)")
        return v


def re_fullmatch_simple_format(value: str) -> bool:
    import re
    return bool(re.fullmatch(r"[0#.,\s%]{1,12}", value))


# ── Props par type de composant ──────────────────────────────────────────────

class TextStyleProps(BaseModel):
    font_family: Literal["Helvetica", "Times-Roman", "Courier"] = "Helvetica"
    font_size_pt: float = Field(10.0, ge=5, le=72)
    bold: bool = False
    italic: bool = False
    color: str = Field("#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    align: GradesColumnAlign = GradesColumnAlign.left


class TextComponentProps(BaseModel):
    content: str = Field(..., min_length=0, max_length=4000)
    style: TextStyleProps = Field(default_factory=TextStyleProps)

    @field_validator("content")
    @classmethod
    def _content_safe(cls, v: str) -> str:
        validate_interpolated_text(v, context="text.content")
        return v


class ImageComponentProps(BaseModel):
    source: Literal["school.logo", "student.photo", "url", "static"] = "school.logo"
    url: Optional[str] = Field(default=None, max_length=2000)
    fit: Literal["contain", "cover", "stretch"] = "contain"

    @model_validator(mode="after")
    def _url_if_needed(self) -> ImageComponentProps:
        if self.source in ("url", "static") and not self.url:
            raise ValueError("image.url requis lorsque source=url|static")
        if self.url and any(x in self.url.lower() for x in ("javascript:", "data:text/html")):
            raise ValueError("image.url schéma interdit")
        return self


class ShapeComponentProps(BaseModel):
    shape: Literal["line", "rectangle"] = "rectangle"
    stroke_color: str = Field("#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    stroke_width_pt: float = Field(0.5, ge=0, le=20)
    fill_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class SpacerComponentProps(BaseModel):
    note: str = Field(default="", max_length=120)


class InstitutionHeaderProps(BaseModel):
    show_ministry: bool = True
    show_logo: bool = True
    show_motto: bool = True
    show_delegations: bool = True
    title: str = Field(default="{{school.name}}", max_length=200)
    subtitle: str = Field(default="", max_length=200)

    @field_validator("title", "subtitle")
    @classmethod
    def _safe(cls, v: str) -> str:
        validate_interpolated_text(v, context="institution_header")
        return v


class SchoolLogoProps(BaseModel):
    fit: Literal["contain", "cover"] = "contain"


class StudentBlockField(str, Enum):
    full_name = "full_name"
    first_name = "first_name"
    last_name = "last_name"
    matricule = "matricule"
    class_name = "class"
    gender = "gender"
    age = "age"
    status = "status"
    repeat_status = "repeat_status"
    photo = "photo"
    date_of_birth = "date_of_birth"


class StudentBlockProps(BaseModel):
    fields: list[StudentBlockField] = Field(
        default_factory=lambda: [
            StudentBlockField.full_name,
            StudentBlockField.matricule,
            StudentBlockField.class_name,
            StudentBlockField.gender,
        ]
    )
    show_labels: bool = True
    columns: int = Field(2, ge=1, le=4)


class StudentPhotoProps(BaseModel):
    fit: Literal["contain", "cover"] = "contain"
    placeholder: bool = True


class GradesTableProps(BaseModel):
    columns: list[GradesTableColumn] = Field(..., min_length=1, max_length=20)
    show_group_headers: bool = True
    show_group_subtotals: bool = True
    show_header: bool = True
    repeat_header_on_page_break: bool = True
    border_color: str = Field("#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    header_background: str = Field("#EEEEEE", pattern=r"^#[0-9A-Fa-f]{6}$")
    font_size_pt: float = Field(8.0, ge=5, le=18)
    row_height_mm: float = Field(6.0, ge=3, le=20)

    @model_validator(mode="after")
    def _columns_ok(self) -> GradesTableProps:
        ids = [c.id for c in self.columns]
        if len(ids) != len(set(ids)):
            raise ValueError("grades_table.columns.id doit être unique")
        visible = [c for c in self.columns if c.visible]
        if not visible:
            raise ValueError("grades_table : au moins une colonne visible")
        total_w = sum(c.width for c in visible)
        if total_w <= 0:
            raise ValueError("grades_table : somme des largeurs invalide")
        # Tolérance : on normalise au rendu ; ici on refuse seulement des valeurs absurdes
        if total_w > 1.5:
            raise ValueError("grades_table : somme des width visibles > 1.5 (utiliser des fractions ~1.0)")
        return self


class SummaryField(str, Enum):
    general_average = "general_average"
    class_average = "class_average"
    rank = "rank"
    class_size = "class_size"
    total_points = "total_points"
    total_coefficients = "total_coefficients"
    decision = "decision"
    observation = "observation"


class SummaryBlockProps(BaseModel):
    fields: list[SummaryField] = Field(
        default_factory=lambda: [
            SummaryField.general_average,
            SummaryField.class_average,
            SummaryField.rank,
            SummaryField.class_size,
        ]
    )
    show_labels: bool = True


class AttendanceBlockProps(BaseModel):
    """Stubs documentés : absences/sanctions non disponibles en domaine tant que non implémentés."""
    show_absences: bool = True
    show_sanctions: bool = True
    stub_label_absences: str = Field(default="—", max_length=40)
    stub_label_sanctions: str = Field(default="—", max_length=40)
    note: str = Field(
        default="Données d'assiduité non branchées (stub).",
        max_length=200,
    )


class SignatureSlot(str, Enum):
    parent = "parent"
    teacher = "teacher"
    principal = "principal"
    custom = "custom"


class SignatureSlotSpec(BaseModel):
    slot: SignatureSlot
    label: str = Field(..., min_length=1, max_length=80)

    @field_validator("label")
    @classmethod
    def _label_safe(cls, v: str) -> str:
        validate_interpolated_text(v, context="signature.label")
        return v


class SignaturesRowProps(BaseModel):
    slots: list[SignatureSlotSpec] = Field(
        default_factory=lambda: [
            SignatureSlotSpec(slot=SignatureSlot.parent, label="Parent / Tuteur"),
            SignatureSlotSpec(slot=SignatureSlot.teacher, label="Professeur principal"),
            SignatureSlotSpec(slot=SignatureSlot.principal, label="Le Chef d'établissement"),
        ],
        min_length=1,
        max_length=6,
    )


class QrCodeProps(BaseModel):
    # Contenu limité à des variables whitelistées ou texte court non exécutable
    content: str = Field(default="{{student.matricule}}", max_length=200)

    @field_validator("content")
    @classmethod
    def _qr_safe(cls, v: str) -> str:
        validate_interpolated_text(v, context="qr_code.content")
        return v


class PageNumberProps(BaseModel):
    format: str = Field(default="Page {{page}} / {{pages}}", max_length=80)

    @field_validator("format")
    @classmethod
    def _fmt(cls, v: str) -> str:
        # page/pages = métadonnées de rendu uniquement (hors catalogue scolaire)
        import re
        for m in re.finditer(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}", v):
            if m.group(1) not in ("page", "pages"):
                raise ValueError(
                    "page_number.format : seules les variables {{page}} et {{pages}} sont autorisées"
                )
        if "{%" in v or "${" in v:
            raise ValueError("page_number.format : syntaxe interdite")
        return v


PropsModel = Union[
    TextComponentProps,
    ImageComponentProps,
    ShapeComponentProps,
    SpacerComponentProps,
    InstitutionHeaderProps,
    SchoolLogoProps,
    StudentBlockProps,
    StudentPhotoProps,
    GradesTableProps,
    SummaryBlockProps,
    AttendanceBlockProps,
    SignaturesRowProps,
    QrCodeProps,
    PageNumberProps,
    dict,  # fallback avant discrimination — remplacé par validate
]


_PROPS_BY_TYPE: dict[str, type[BaseModel]] = {
    "text": TextComponentProps,
    "image": ImageComponentProps,
    "shape": ShapeComponentProps,
    "spacer": SpacerComponentProps,
    "institution_header": InstitutionHeaderProps,
    "school_logo": SchoolLogoProps,
    "student_block": StudentBlockProps,
    "student_photo": StudentPhotoProps,
    "grades_table": GradesTableProps,
    "summary_block": SummaryBlockProps,
    "attendance_block": AttendanceBlockProps,
    "signatures_row": SignaturesRowProps,
    "qr_code": QrCodeProps,
    "page_number": PageNumberProps,
}


class TemplateComponent(BaseModel):
    id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$")
    type: str = Field(..., min_length=1, max_length=40)
    frame: FrameMm
    z_index: int = Field(0, ge=0, le=1000)
    visible: bool = True
    props: dict[str, Any] = Field(default_factory=dict)

    @field_validator("type")
    @classmethod
    def _known_type(cls, v: str) -> str:
        if v not in COMPONENT_TYPES:
            raise ValueError(
                f"Type de composant inconnu « {v} ». "
                f"Autorisés : {', '.join(sorted(COMPONENT_TYPES))}"
            )
        return v

    @model_validator(mode="after")
    def _props_match_type(self) -> TemplateComponent:
        model = _PROPS_BY_TYPE[self.type]
        try:
            parsed = model.model_validate(self.props)
        except Exception as exc:
            raise ValueError(f"Composant « {self.id} » ({self.type}) : {exc}") from exc
        self.props = parsed.model_dump(mode="json")
        return self


class BulletinTemplateV1(BaseModel):
    """Définition complète d'un modèle de bulletin — schema_version = 1."""

    schema_version: Literal[1] = 1
    name: str = Field(default="", max_length=160)
    page: PageSpec = Field(default_factory=PageSpec)
    data_binding: DataBindingSpec = Field(default_factory=DataBindingSpec)
    components: list[TemplateComponent] = Field(default_factory=list, max_length=80)
    meta: dict[str, Any] = Field(
        default_factory=dict,
        description="Métadonnées non exécutables (auteur UI, notes). Pas de code.",
    )

    @field_validator("meta")
    @classmethod
    def _meta_safe(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(v) > 30:
            raise ValueError("meta : trop de clés (max 30)")
        for key, val in v.items():
            if not isinstance(key, str) or len(key) > 40:
                raise ValueError("meta : clé invalide")
            if isinstance(val, str):
                if len(val) > 500:
                    raise ValueError("meta : valeur texte trop longue")
                validate_interpolated_text(val, context=f"meta.{key}")
            elif val is not None and not isinstance(val, (bool, int, float)):
                raise ValueError("meta : types autorisés str|bool|number|null uniquement")
        return v

    @model_validator(mode="after")
    def _components_unique(self) -> BulletinTemplateV1:
        ids = [c.id for c in self.components]
        if len(ids) != len(set(ids)):
            raise ValueError("components.id doit être unique")
        # grades_table.bind grades.* doit référencer une sequence_columns.key si préfixe grades.
        seq_keys = {c.key for c in self.data_binding.sequence_columns}
        for comp in self.components:
            if comp.type != "grades_table":
                continue
            for col in comp.props.get("columns") or []:
                bind = col.get("bind") or ""
                if bind.startswith("grades."):
                    key = bind.split(".", 1)[1]
                    if seq_keys and key not in seq_keys:
                        raise ValueError(
                            f"Colonne « {col.get('id')} » bind=grades.{key} "
                            f"absent de data_binding.sequence_columns"
                        )
        return self


def validate_template_definition(data: dict[str, Any] | BulletinTemplateV1) -> BulletinTemplateV1:
    """Valide et normalise une définition de template v1.

    Lève ``TemplateValidationError`` (message lisible) en cas d'échec.
    """
    try:
        if isinstance(data, BulletinTemplateV1):
            # Re-validate pour garantir l'état normalisé
            return BulletinTemplateV1.model_validate(data.model_dump(mode="json"))
        if not isinstance(data, dict):
            raise TemplateValidationError("La définition doit être un objet JSON")
        version = data.get("schema_version", TEMPLATE_SCHEMA_VERSION)
        if version != TEMPLATE_SCHEMA_VERSION:
            raise TemplateValidationError(
                f"schema_version={version} non supporté (attendu {TEMPLATE_SCHEMA_VERSION})"
            )
        return BulletinTemplateV1.model_validate(data)
    except TemplateValidationError:
        raise
    except VariableValidationError as exc:
        raise TemplateValidationError(str(exc)) from exc
    except Exception as exc:
        # Pydantic ValidationError → message compact
        raise TemplateValidationError(str(exc)) from exc


def empty_template_v1(*, name: str = "") -> dict[str, Any]:
    """Squelette minimal valide (éditeur phase 1)."""
    return BulletinTemplateV1(name=name, components=[]).model_dump(mode="json")
