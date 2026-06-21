from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class AuthLoginRequest(BaseModel):
    username: str
    password: str


class AuthSetupRequest(BaseModel):
    passwords: Dict[str, str]


class HeatSearchRequest(BaseModel):
    heat_no: str
    casting_name: str = ""
    item_name: str = ""  # alias
    metallurgy_filename: str = ""
    specification_filename: Optional[str] = None
    metallurgy_spec_filename: Optional[str] = None  # alias
    mechanical_requirements_filename: Optional[str] = None
    column_mapping: Optional[Dict[str, str]] = None


class DetectColumnsRequest(BaseModel):
    metallurgy_filename: str


class PreviewMappedRequest(BaseModel):
    heat_no: str
    casting_name: str = ""
    item_name: str = ""
    metallurgy_filename: str
    specification_filename: Optional[str] = None
    metallurgy_spec_filename: Optional[str] = None
    mechanical_requirements_filename: Optional[str] = None
    column_mapping: Dict[str, str] = Field(default_factory=dict)


class BasicInfoIn(BaseModel):
    customer: str = ""
    material_grade: str = ""
    drawing_no: str = ""
    casting_sl_no: str = ""
    invoice_no_date: str = ""
    heat_no: str = ""
    casting_name: str = ""
    doc_ref: str = ""
    issue_no_dt: str = ""
    rev_no_dt: str = ""


class ChemicalRowIn(BaseModel):
    element: str
    specified: str = ""
    actual: str = ""


class MechanicalRowIn(BaseModel):
    key: str = ""
    name: str = ""
    specified: str = ""
    actual: str = ""


class GenerateReportRequest(BaseModel):
    heat_no: str = Field(..., min_length=1)
    casting_name: str = ""
    item_name: str = ""
    template_filename: str = ""
    metallurgy_actual_filename: str = ""
    specification_filename: Optional[str] = None
    metallurgy_spec_filename: Optional[str] = None
    mechanical_requirements_filename: Optional[str] = None
    customer: str = ""
    material_grade: str = ""
    drawing_no: str = ""
    casting_sl_no: str = ""
    invoice_no_date: str = ""
    doc_ref: str = ""
    issue_no_dt: str = ""
    rev_no_dt: str = ""
    basic_info: Optional[BasicInfoIn] = None
    chemical_actual: Optional[Dict[str, str]] = None
    chemical_specified: Optional[Dict[str, str]] = None
    mechanical_actual: Optional[Dict[str, str]] = None
    mechanical_specified: Optional[Dict[str, str]] = None
    chemical: List[ChemicalRowIn] = Field(default_factory=list)
    mechanical: List[MechanicalRowIn] = Field(default_factory=list)
