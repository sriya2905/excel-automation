"""Load mechanical property SPECIFIED limits from Mechanical_properties_Requriment.xlsx."""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

MECHANICAL_SPEC_KEYS = [
    "tensile",
    "proof_stress",
    "elongation",
    "hardness_bhn",
    "impact_individual",
    "impact_mean",
]

# Excel column header → internal key
MECH_REQ_COLUMN_TERMS: Dict[str, List[str]] = {
    "casting_name": ["casting name", "casting", "item name", "item"],
    "grade": ["grade", "material grade", "material"],
    "tensile": ["tensile strength", "tensile"],
    "proof_stress": ["0.2% proof stress", "0.2 proof stress", "proof stress", "0.2% proof", "yield", "0.2 % proof"],
    "elongation": ["elongation", "% elongation"],
    "impact_individual": [
        "impact value single value",
        "impact value single",
        "single value",
        "impact individual",
        "impact ind",
        "single",
        "ind",
        "individual",
    ],
    "impact_mean": [
        "impact value avg value",
        "impact value avg",
        "avg value",
        "impact mean",
        "average impact",
        "mean impact",
        "avrage value",
        "avrage",
        "avg",
        "mean",
    ],
    "hardness_bhn": ["hardness bhn", "hardness", "bhn", "brinell"],
}

MECH_REQ_FIELD_ALIASES: Dict[str, List[str]] = {
    "tensile": ["tensile strength", "tensile"],
    "proof_stress": ["0.2% proof stress", "0.2 proof stress", "proof stress", "0.2% proof", "yield"],
    "elongation": ["elongation", "% elongation"],
    "hardness_bhn": ["hardness bhn", "hardness", "bhn", "brinell"],
    "impact_individual": ["impact value single value", "impact value single", "single value", "impact individual", "impact ind"],
    "impact_mean": ["impact value avg value", "impact value avg", "avg value", "impact mean", "average impact", "mean impact"],
}


def _norm_name(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _cell_str(value: Any) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except (ValueError, TypeError):
        pass
    return str(value).strip()


def _find_header_row(df_preview: pd.DataFrame) -> int:
    for row_idx in range(len(df_preview)):
        row = df_preview.iloc[row_idx]
        row_str = " ".join(_cell_str(x).lower() for x in row if _cell_str(x))
        if "casting" in row_str or "tensile" in row_str or "grade" in row_str:
            return row_idx
    return 0


def _match_column(columns: List[str], keywords: List[str]) -> Optional[int]:
    for idx, col in enumerate(columns):
        name = _cell_str(col).lower()
        for kw in keywords:
            if name == kw or kw in name:
                return idx
    return None


def _match_columns(columns: List[str], keywords: List[str]) -> List[int]:
    matches: List[int] = []
    for idx, col in enumerate(columns):
        name = _cell_str(col).lower()
        for kw in keywords:
            if name == kw or kw in name:
                matches.append(idx)
                break
    return matches


def _is_min_header(name: str) -> bool:
    name = _cell_str(name).lower()
    return any(token in name for token in (" min", " minimum", "(min)", "[min]", "_min", "-min")) or name.endswith("min")


def _is_max_header(name: str) -> bool:
    name = _cell_str(name).lower()
    return any(token in name for token in (" max", " maximum", "(max)", "[max]", "_max", "-max")) or name.endswith("max")


def _build_column_map(columns: List[str]) -> Dict[str, Optional[int]]:
    col_map: Dict[str, Optional[int]] = {}
    for field, keywords in MECH_REQ_COLUMN_TERMS.items():
        col_map[field] = _match_column(columns, keywords)
    return col_map


def _row_matches_name(row: pd.Series, df: pd.DataFrame, col_idx: Optional[int], want: str) -> bool:
    if not want or col_idx is None:
        return False
    cell = _norm_name(_cell_str(row[df.columns[col_idx]]))
    if not cell:
        return False
    if want == cell or want in cell or cell in want:
        return True
    tokens = [t for t in want.split() if len(t) > 2]
    return any(t in cell for t in tokens)


def load_mechanical_requirements_sheet(filepath: str) -> Tuple[pd.DataFrame, Dict[str, Optional[int]]]:
    preview = pd.read_excel(filepath, sheet_name=0, header=None, nrows=20, dtype=object)
    header_row = _find_header_row(preview)
    df = pd.read_excel(filepath, sheet_name=0, header=header_row, dtype=object)
    columns = [_cell_str(c) for c in df.columns]
    return df, _build_column_map(columns)

def format_specified(value):
    if value is None or str(value).strip() in ['-', 'nan', '']:
        return None
    try:
        val_str = str(value).strip()
        if '-' in val_str and not val_str.startswith('-'):
            return val_str
        float(val_str)
        return f"{val_str} Min"
    except:
        return val_str


def search_mechanical_specified(casting_name):
    try:
        mechanical_file = None
        for f in os.listdir('uploads'):
            if 'mechanical' in f.lower() or 'requirement' in f.lower() or 'requr' in f.lower():
                mechanical_file = os.path.join('uploads', f)
                break
        if not mechanical_file:
            print("Mechanical file not found")
            return {}

        xl = pd.ExcelFile(mechanical_file)
        search_term = casting_name.strip().upper()
        result = {}

        for name in xl.sheet_names:
            preview = pd.read_excel(xl, name, header=None, nrows=5, dtype=object)
            
            # Combine the first 5 rows to handle multi-row/merged headers
            combined_headers = []
            num_cols = preview.shape[1]
            for col_idx in range(num_cols):
                cells = []
                for row_idx in range(min(5, len(preview))):
                    val = _cell_str(preview.iloc[row_idx, col_idx])
                    if val:
                        cells.append(val)
                combined_headers.append(' '.join(cells))
            
            # Match columns using terms
            col_map = {}
            for field, keywords in MECH_REQ_COLUMN_TERMS.items():
                col_map[field] = None
                for idx, header in enumerate(combined_headers):
                    header_lower = header.lower()
                    if any(kw in header_lower for kw in keywords):
                        col_map[field] = idx
                        break
            
            c_col = col_map.get('casting_name')
            if c_col is None:
                continue

            df = pd.read_excel(xl, name, header=None, dtype=object)
            for idx, row in df.iterrows():
                # Skip header rows
                cell_value = _cell_str(row.iloc[c_col]).strip().upper()
                if not cell_value or any(kw in cell_value for kw in ['CASTING NAME', 'VESTAS CASTINGS', 'GAMESA CASTINGS', 'SENVION CASTINGS']):
                    continue
                
                if cell_value in search_term or search_term in cell_value:
                    print(f"Match found on sheet {name} row {idx}: {row.tolist()}")
                    
                    def clean_val(key):
                        col_idx = col_map.get(key)
                        if col_idx is None:
                            return ""
                        val = row.iloc[col_idx]
                        if pd.isna(val):
                            return ""
                        val_str = str(val).strip()
                        if val_str in ['-', '']:
                            return ""
                        # Try to convert to float/int if possible, otherwise return string
                        try:
                            if val_str.replace('.', '', 1).isdigit():
                                if '.' in val_str:
                                    return float(val_str)
                                return int(val_str)
                        except:
                            pass
                        return val_str

                    def get_val(key, fallback_idx):
                        col_idx = col_map.get(key)
                        if col_idx is not None and col_idx < len(row):
                            return row.iloc[col_idx]
                        if fallback_idx < len(row):
                            return row.iloc[fallback_idx]
                        return None

                    result = {
                        'tensile': format_specified(get_val('tensile', 2)),
                        'proof_stress': format_specified(get_val('proof_stress', 3)),
                        'elongation': format_specified(get_val('elongation', 4)),
                        'hardness': '130 - 180 BHN',
                        'impact_individual': format_specified(get_val('impact_individual', 5)),
                        'impact_mean': format_specified(get_val('impact_mean', 7))
                    }
                    break
            if result:
                break
        
        if not result:
            print(f"No match found for: {casting_name} in any sheet")
        return result
    except Exception as e:
        print(f"Error in search_mechanical_specified: {e}")
        import traceback
        traceback.print_exc()
        return {}


def search_chemical_specified_in_requirements(filepath: str, casting_name: str) -> dict:
    try:
        xl = pd.ExcelFile(filepath)
        search_term = casting_name.strip().upper()
        found_chem = {}
        CHEMICAL_ELEMENTS = ['C', 'Si', 'Mn', 'P', 'S', 'Cu', 'Ni', 'Mg']
        
        for name in xl.sheet_names:
            preview = pd.read_excel(xl, name, header=None, nrows=5, dtype=object)
            
            # Combine the first 5 rows
            combined_headers = []
            num_cols = preview.shape[1]
            for col_idx in range(num_cols):
                cells = []
                for row_idx in range(min(5, len(preview))):
                    val = _cell_str(preview.iloc[row_idx, col_idx])
                    if val:
                        cells.append(val)
                combined_headers.append(' '.join(cells))
            
            # Map casting name
            c_col = None
            for idx, h in enumerate(combined_headers):
                if any(kw in h.lower() for kw in ['casting name', 'casting', 'item name']):
                    c_col = idx
                    break
                    
            if c_col is None:
                continue
                
            # Map chemical elements
            chem_map = {}
            for el in CHEMICAL_ELEMENTS:
                # Look for exact match or word match in headers
                for idx, h in enumerate(combined_headers):
                    h_clean = re.sub(r'\s+', ' ', h.strip())
                    h_words = h_clean.split()
                    if el.lower() in [w.lower() for w in h_words]:
                        chem_map[el] = idx
                        break
                        
            df = pd.read_excel(xl, name, header=None, dtype=object)
            for idx, row in df.iterrows():
                cell_val = _cell_str(row.iloc[c_col]).strip().upper()
                if not cell_val or any(kw in cell_val for kw in ['CASTING NAME', 'VESTAS CASTINGS', 'GAMESA CASTINGS', 'SENVION CASTINGS']):
                    continue
                    
                if cell_val in search_term or search_term in cell_val:
                    print(f"Match found for chemical spec on sheet {name} row {idx}: {row.tolist()}")
                    for el, col_idx in chem_map.items():
                        val = row.iloc[col_idx]
                        if pd.notna(val) and str(val).strip() not in ['-', '']:
                            found_chem[el] = str(val).strip()
                        else:
                            found_chem[el] = ''
                    break
            if found_chem:
                break
        return found_chem
    except Exception as e:
        print(f"Error in search_chemical_specified_in_requirements: {e}")
        return {}
