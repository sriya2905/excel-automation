from __future__ import annotations

from pathlib import Path
from typing import List

import pandas as pd


_HEADER_HINTS = (
    "heat no",
    "heat number",
    "customer",
    "casting",
    "item name",
    "material grade",
    "grade",
    "drawing",
    "invoice",
    "tensile",
    "carbon",
    "hardness",
    "impact",
    "elongation",
    "proof",
)


def _cell_str(value) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except (ValueError, TypeError):
        pass
    return str(value).strip()


def _normalize_rows(rows) -> list[list[str]]:
    cleaned: list[list[str]] = []
    width = 0
    for row in rows or []:
        values = [_cell_str(cell) for cell in (row or [])]
        width = max(width, len(values))
        cleaned.append(values)
    if not cleaned or width == 0:
        return []
    for row in cleaned:
        if len(row) < width:
            row.extend([""] * (width - len(row)))
    return cleaned


def _looks_like_header(row: list[str]) -> bool:
    row_text = " ".join(cell.lower() for cell in row if cell)
    if not row_text:
        return False
    if any(hint in row_text for hint in _HEADER_HINTS):
        return True
    alpha_cells = sum(1 for cell in row if any(ch.isalpha() for ch in cell))
    return alpha_cells >= 2


def _table_to_dataframe(rows: list[list[str]]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame()
    header = rows[0]
    if _looks_like_header(header):
        columns = [cell if cell else f"col_{idx + 1}" for idx, cell in enumerate(header)]
        data = rows[1:] if len(rows) > 1 else []
        return pd.DataFrame(data, columns=columns)
    columns = [f"col_{idx + 1}" for idx in range(len(header))]
    return pd.DataFrame(rows, columns=columns)


def _find_header_row(df_preview: pd.DataFrame) -> int:
    for row_idx in range(len(df_preview)):
        row = df_preview.iloc[row_idx]
        row_str = " ".join(_cell_str(x).lower() for x in row if _cell_str(x))
        if any(term in row_str for term in _HEADER_HINTS):
            return row_idx
    return 0


def load_tabular_frames(filepath: str) -> List[pd.DataFrame]:
    path = Path(filepath)
    suffix = path.suffix.lower()

    if suffix in {".xlsx", ".xls", ".xlsm"}:
        xl = pd.ExcelFile(filepath)
        frames: List[pd.DataFrame] = []
        for sheet_name in xl.sheet_names:
            preview = pd.read_excel(xl, sheet_name, header=None, nrows=25, dtype=object)
            header_row = _find_header_row(preview)
            df = pd.read_excel(xl, sheet_name, header=header_row, dtype=object)
            frames.append(df)
        return frames

    if suffix == ".pdf":
        try:
            import pdfplumber
        except Exception:
            return []

        frames = []
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                try:
                    tables = page.extract_tables() or []
                except Exception:
                    tables = []
                for table in tables:
                    rows = _normalize_rows(table)
                    if not rows:
                        continue
                    df = _table_to_dataframe(rows)
                    if not df.empty:
                        frames.append(df)
        return frames

    return []
