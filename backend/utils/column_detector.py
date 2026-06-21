import pandas as pd


class ColumnDetector:
    """Detect header row and column indices for Metallurgy-style sheets."""

    def __init__(self):
        self.search_terms = {
            "heat_no": ["heat no", "heat number", "heat_no", "heat"],
            "casting_name": [
                "casting name",
                "item name",
                "casting_name",
                "item",
                "material grade",
                "grade",
                "description",
            ],
            "customer": ["customer", "customer name"],
            "casting_sl_no": ["casting sl no", "casting serial", "sl no", "serial"],
            "material_grade": ["material grade", "grade", "material"],
            "drawing_no": ["drawing no", "drawing number", "drg no", "drg"],
            "invoice_no_date": ["invoice", "invoice no", "invoice date", "inv no"],
            "chemical": {
                "C": ["c (tc)", "carbon", "tc", "c "],
                "Si": ["si", "silicon"],
                "Mn": ["mn", "manganese"],
                "P": ["p", "phosphorus"],
                "S": ["s", "sulfur", "sulphur"],
                "Cu": ["cu", "copper"],
                "Ni": ["ni", "nickel"],
                "Mg": ["mg", "magnesium"],
            },
            "mechanical": {
                "tensile": ["tensile", "tensile strength", "uts"],
                "proof_stress": ["proof", "proof stress", "0.2% proof", "yield"],
                "elongation": ["elongation", "% elongation"],
                "hardness_bhn": ["hardness", "bhn", "brinell", "hb"],
                "impact_individual": ["impact individual", "impact ind", "individual impact", "impact (j)"],
                "impact_mean": ["impact mean", "mean impact", "avg impact"],
            },
            # Specification / limits sheet — same elements, min/max/range style headers
            "specified_mechanical": {
                "tensile": ["tensile min", "uts min", "tensile", "min tensile"],
                "proof_stress": ["proof min", "proof stress min", "yield min", "proof"],
                "elongation": ["elongation min", "% elongation min", "elongation"],
                "hardness_bhn": ["hardness", "bhn", "brinell", "hb range", "hardness range"],
                "impact_individual": ["impact min", "impact individual", "charpy", "impact"],
                "impact_mean": ["impact mean min", "mean impact", "impact mean"],
            },
            "specified_chemical": {
                "C": ["c max", "c min", "c range", "carbon", "c "],
                "Si": ["si max", "si min", "si range", "silicon", "si "],
                "Mn": ["mn max", "mn min", "manganese", "mn "],
                "P": ["p max", "phosphorus", "p "],
                "S": ["s max", "sulfur", "sulphur", "s "],
                "Cu": ["cu max", "copper", "cu "],
                "Ni": ["ni max", "nickel", "ni "],
                "Mg": ["mg max", "magnesium", "mg "],
            },
        }

    def detect(self, filepath: str, sheet_name=0):
        df_preview = pd.read_excel(filepath, sheet_name=sheet_name, header=None, nrows=25)

        header_row = None
        for row_idx in range(len(df_preview)):
            row = df_preview.iloc[row_idx]
            row_str = " ".join([str(x).lower().strip() for x in row if pd.notna(x)])
            if any(
                term in row_str
                for term in ["heat no", "heat number", "customer", "casting", "tensile", "carbon", "grade"]
            ):
                header_row = row_idx
                break

        if header_row is None:
            header_row = 0

        df = pd.read_excel(filepath, sheet_name=sheet_name, header=header_row, dtype=object)
        columns = [str(col).lower().strip() for col in df.columns]

        column_map = {
            "chemical": {},
            "mechanical": {},
            "specified_chemical": {},
            "specified_mechanical": {},
        }

        for field in (
            "heat_no",
            "casting_name",
            "customer",
            "casting_sl_no",
            "material_grade",
            "drawing_no",
            "invoice_no_date",
        ):
            keywords = self.search_terms[field]
            for col_idx, col_name in enumerate(columns):
                if any(kw in col_name for kw in keywords):
                    column_map[field] = col_idx
                    break

        for element, keywords in self.search_terms["chemical"].items():
            for col_idx, col_name in enumerate(columns):
                if col_name == element.lower():
                    column_map["chemical"][element] = col_idx
                    break
                if any(
                    col_name == kw or col_name.startswith(kw + "(") or col_name.startswith(kw + " ")
                    for kw in keywords
                ):
                    column_map["chemical"][element] = col_idx
                    break

        for prop, keywords in self.search_terms["mechanical"].items():
            for col_idx, col_name in enumerate(columns):
                if any(kw in col_name for kw in keywords):
                    column_map["mechanical"][prop] = col_idx
                    break

        for prop, keywords in self.search_terms["specified_mechanical"].items():
            for col_idx, col_name in enumerate(columns):
                if any(kw in col_name for kw in keywords):
                    column_map["specified_mechanical"][prop] = col_idx
                    break

        for element, keywords in self.search_terms["specified_chemical"].items():
            for col_idx, col_name in enumerate(columns):
                if any(kw in col_name for kw in keywords):
                    column_map["specified_chemical"][element] = col_idx
                    break

        return column_map, header_row
