export const CHEM_FIELD_DEFS = [
  { element: 'C', label: 'Carbon (C%)' },
  { element: 'Si', label: 'Silicon (Si%)' },
  { element: 'Mn', label: 'Manganese (Mn%)' },
  { element: 'P', label: 'Phosphorus (P%)' },
  { element: 'S', label: 'Sulfur (S%)' },
  { element: 'Cu', label: 'Copper (Cu%)' },
  { element: 'Ni', label: 'Nickel (Ni%)' },
  { element: 'Mg', label: 'Magnesium (Mg%)' },
];

export const CHEM_ELEMENTS = CHEM_FIELD_DEFS.map(({ element }) => element);

export const MECH_ROWS = [
  { key: 'tensile', label: 'Tensile Strength' },
  { key: 'proof_stress', label: '0.2% Proof Stress' },
  { key: 'elongation', label: '% Elongation' },
  { key: 'hardness_bhn', label: 'Hardness BHN' },
  { key: 'impact_individual', label: 'Impact Individual (J)' },
  { key: 'impact_mean', label: 'Impact Mean (J)' },
];

export const BASIC_FIELD_KEYS = [
  { key: 'customer', label: 'Customer Name' },
  { key: 'material_grade', label: 'Material Grade' },
  { key: 'casting_name', label: 'Casting Name' },
  { key: 'drawing_no', label: 'Drawing No' },
  { key: 'heat_no', label: 'Heat No' },
  { key: 'casting_sl_no', label: 'Casting Sl No' },
  { key: 'invoice_no_date', label: 'Invoice No / Date' },
  { key: 'doc_ref', label: 'Doc Ref' },
  { key: 'issue_no_dt', label: 'Issue No / Date' },
  { key: 'rev_no_dt', label: 'Rev No / Date' },
];

export function emptyChemicalRows() {
  return CHEM_FIELD_DEFS.map(({ element, label }) => ({
    element,
    label,
    specified: '',
    actual: '',
  }));
}

export function emptyMechanicalRows() {
  return MECH_ROWS.map(({ key, label }) => ({
    key,
    name: label,
    specified: '',
    actual: '',
  }));
}

export function emptyBasicInfo() {
  return Object.fromEntries(BASIC_FIELD_KEYS.map((f) => [f.key, '']));
}

export const WIZARD_STEPS = [
  { id: 1, title: 'Column Mapping', short: 'Map' },
  { id: 2, title: 'Match & Fill', short: 'Edit' },
  { id: 3, title: 'Generate Report', short: 'Generate' },
];
