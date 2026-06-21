import {
  BASIC_FIELD_KEYS,
  emptyBasicInfo,
  emptyChemicalRows,
  emptyMechanicalRows,
} from './reportFields';

export function createManualPreviewState(searchKeys = {}, message = '') {
  const basic = emptyBasicInfo();
  basic.heat_no = searchKeys.heatNo || '';
  basic.casting_name = searchKeys.castingName || '';

  return {
    rowFound: false,
    message,
    basic,
    chemical: emptyChemicalRows(),
    mechanical: emptyMechanicalRows(),
  };
}

export const initialReportState = {
  wizardStep: 0,
  files: {
    metallurgyFilename: '',
    templateFilename: '',
    specFilename: '',
    mechReqFilename: '',
  },
  searchKeys: { heatNo: '', castingName: '' },
  excelColumns: [],
  templateFields: [],
  columnMapping: {},
  ...createManualPreviewState(),
};

export function reportReducer(state, action) {
  switch (action.type) {
    case 'SET_FILE':
      if (action.field === 'metallurgyFilename') {
        return {
          ...state,
          files: { ...state.files, [action.field]: action.value },
          wizardStep: 0,
          excelColumns: [],
          templateFields: [],
          columnMapping: {},
          ...createManualPreviewState(state.searchKeys),
        };
      }
      return {
        ...state,
        files: { ...state.files, [action.field]: action.value },
      };
    case 'SET_SEARCH_KEY':
      return {
        ...state,
        searchKeys: { ...state.searchKeys, [action.field]: action.value },
      };
    case 'SET_WIZARD_STEP':
      return { ...state, wizardStep: action.step };
    case 'SET_MAPPING_DATA':
      return {
        ...state,
        excelColumns: action.excelColumns,
        templateFields: action.templateFields,
        columnMapping: action.columnMapping,
      };
    case 'SET_COLUMN_MAPPING':
      return {
        ...state,
        columnMapping: { ...state.columnMapping, [action.fieldId]: action.excelColumn },
      };
    case 'LOAD_PREVIEW':
      return {
        ...state,
        rowFound: action.rowFound,
        loadMessage: action.message || '',
        basic: action.basic,
        chemical: action.chemical,
        mechanical: action.mechanical,
        wizardStep: 2,
      };
    case 'SET_BASIC':
      return {
        ...state,
        basic: { ...state.basic, [action.key]: action.value },
      };
    case 'SET_CHEM':
      return {
        ...state,
        chemical: state.chemical.map((r) =>
          r.element === action.element ? { ...r, [action.field]: action.value } : r,
        ),
      };
    case 'SET_MECH':
      return {
        ...state,
        mechanical: state.mechanical.map((r) =>
          r.key === action.key ? { ...r, [action.field]: action.value } : r,
        ),
      };
    case 'RESET_WIZARD':
      return {
        ...initialReportState,
        files: state.files,
        searchKeys: state.searchKeys,
        ...createManualPreviewState(state.searchKeys),
      };
    default:
      return state;
  }
}

export function previewToReportState(apiData, searchKeys) {
  const bi = apiData.basic_info || {};
  const basic = emptyBasicInfo();
  BASIC_FIELD_KEYS.forEach(({ key }) => {
    basic[key] = bi[key] ?? '';
  });
  if (!basic.heat_no) basic.heat_no = searchKeys.heatNo || '';
  if (!basic.casting_name) basic.casting_name = searchKeys.castingName || '';

  const chemSpec = apiData.chemical_specified || {};
  const chemAct = apiData.chemical_actual || {};
  const chemical = emptyChemicalRows().map((row) => ({
    ...row,
    specified: chemSpec[row.element] ?? '',
    actual: chemAct[row.element] ?? '',
  }));

  const mechSpec = apiData.mechanical_specified || {};
  const mechAct = apiData.mechanical_actual || {};
  const mechanical = emptyMechanicalRows().map((row) => ({
    ...row,
    specified: mechSpec[row.key] ?? '',
    actual: mechAct[row.key] ?? '',
  }));

  return {
    rowFound: apiData.row_found !== false && apiData.success !== false,
    message: apiData.message || '',
    basic,
    chemical,
    mechanical,
  };
}

export function reportStateToGenerateBody(state) {
  const chemical_actual = {};
  const chemical_specified = {};
  state.chemical.forEach((r) => {
    chemical_actual[r.element] = r.actual;
    chemical_specified[r.element] = r.specified;
  });
  const mechanical_actual = {};
  const mechanical_specified = {};
  state.mechanical.forEach((r) => {
    mechanical_actual[r.key] = r.actual;
    mechanical_specified[r.key] = r.specified;
  });

  return {
    heat_no: (state.basic.heat_no || state.searchKeys.heatNo || '').trim(),
    casting_name: (state.basic.casting_name || state.searchKeys.castingName || '').trim(),
    template_filename: state.files.templateFilename,
    metallurgy_actual_filename: state.files.metallurgyFilename,
    specification_filename: state.files.specFilename || null,
    mechanical_requirements_filename: state.files.mechReqFilename || null,
    customer: state.basic.customer || '',
    material_grade: state.basic.material_grade || '',
    drawing_no: state.basic.drawing_no || '',
    casting_sl_no: state.basic.casting_sl_no || '',
    invoice_no_date: state.basic.invoice_no_date || '',
    doc_ref: state.basic.doc_ref || '',
    issue_no_dt: state.basic.issue_no_dt || '',
    rev_no_dt: state.basic.rev_no_dt || '',
    basic_info: { ...state.basic },
    chemical: state.chemical.map(({ element, specified, actual }) => ({ element, specified, actual })),
    mechanical: state.mechanical.map(({ key, name, specified, actual }) => ({ key, name, specified, actual })),
    chemical_actual,
    chemical_specified,
    mechanical_actual,
    mechanical_specified,
  };
}
