"""SGIL template field definitions for column mapping and Match & Fill UI."""

CHEMICAL_ELEMENTS = ["C", "Si", "Mn", "P", "S", "Cu", "Ni", "Mg"]

MECHANICAL_FIELDS = [
    {"key": "tensile", "label": "Tensile Strength"},
    {"key": "proof_stress", "label": "0.2% Proof Stress"},
    {"key": "elongation", "label": "% Elongation"},
    {"key": "hardness_bhn", "label": "Hardness BHN"},
    {"key": "impact_individual", "label": "Impact Individual (J)"},
    {"key": "impact_mean", "label": "Impact Mean (J)"},
]

BASIC_FIELDS = [
    {"key": "heat_no", "label": "Heat No", "cell": "D10"},
    {"key": "casting_name", "label": "Casting Name", "cell": "D8"},
    {"key": "customer", "label": "Customer Name", "cell": "D6"},
    {"key": "material_grade", "label": "Material Grade", "cell": "K6"},
    {"key": "drawing_no", "label": "Drawing No", "cell": "K8"},
    {"key": "casting_sl_no", "label": "Casting Sl No", "cell": "K10"},
    {"key": "invoice_no_date", "label": "Invoice No / Date", "cell": "K12"},
    {"key": "doc_ref", "label": "Doc Ref", "cell": "L2"},
    {"key": "issue_no_dt", "label": "Issue No / Date", "cell": "L3"},
    {"key": "rev_no_dt", "label": "Rev No / Date", "cell": "L4"},
]


def template_field_catalog() -> list[dict]:
    """Flat list of mappable template fields grouped by category."""
    fields = []
    for f in BASIC_FIELDS:
        fields.append(
            {
                "id": f["key"],
                "label": f["label"],
                "category": "Basic Information",
                "cell": f.get("cell", ""),
                "value_kind": "basic",
            }
        )
    for el in CHEMICAL_ELEMENTS:
        fields.append(
            {
                "id": f"chem_actual_{el}",
                "label": f"{el}% — Actual",
                "category": "Chemical Composition",
                "cell": f"Row 19 / {el}",
                "value_kind": "chemical_actual",
                "element": el,
            }
        )
        fields.append(
            {
                "id": f"chem_spec_{el}",
                "label": f"{el}% — Specified (limit)",
                "category": "Chemical Composition",
                "cell": f"Row 17–18 / {el}",
                "value_kind": "chemical_specified",
                "element": el,
            }
        )
    for m in MECHANICAL_FIELDS:
        fields.append(
            {
                "id": f"mech_actual_{m['key']}",
                "label": f"{m['label']} — Actual",
                "category": "Mechanical Properties",
                "cell": "Template mech row",
                "value_kind": "mechanical_actual",
                "mech_key": m["key"],
            }
        )
        fields.append(
            {
                "id": f"mech_spec_{m['key']}",
                "label": f"{m['label']} — Specified (limit)",
                "category": "Mechanical Properties",
                "cell": "Template mech row",
                "value_kind": "mechanical_specified",
                "mech_key": m["key"],
            }
        )
    return fields
