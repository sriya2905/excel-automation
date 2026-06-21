import React, { useCallback, useReducer, useRef, useState } from 'react';
import axios from 'axios';
import { BASIC_FIELD_KEYS, WIZARD_STEPS } from './reportFields';
import {
  initialReportState,
  previewToReportState,
  reportReducer,
  reportStateToGenerateBody,
} from './reportState';

function apiRoot() {
  const configured = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return [origin, configured, 'http://127.0.0.1:8000', 'http://localhost:8000'].filter(Boolean)[0];
}

const API_BASE = `${apiRoot().replace(/\/$/, '')}/api`;
const REQ_MS = 300000;

function authHeaders() {
  const token = sessionStorage.getItem('mtr_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function countFilledRows(rows) {
  return rows.filter((row) => (row.actual || '').trim()).length;
}

function isAllowedUpload(file, allowedExtensions) {
  const name = (file?.name || '').toLowerCase();
  return allowedExtensions.some((extension) => name.endsWith(extension));
}

function UploadCard({
  accent,
  title,
  description,
  filename,
  inputRef,
  accept,
  buttonLabel,
  onPick,
  onDropFile,
  onOpenPicker,
  disabled = false,
}) {
  return (
    <div style={{ ...uploadCardStyle, borderTopColor: accent }}>
      <div style={{ ...uploadAccentStyle, background: accent }}>
        <span style={{ fontSize: 18, color: '#fff' }}>⇪</span>
      </div>
      <div style={uploadCardTitleStyle}>{title}</div>
      <div style={uploadCardTextStyle}>{description}</div>

      <div
        style={{
          ...uploadDropZoneStyle,
          borderColor: accent,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onClick={() => {
          if (!disabled) onOpenPicker();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) onDropFile(file);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenPicker();
          }
        }}
      >
        <div style={uploadDropTitleStyle}>Drag & drop file here</div>
        <div style={uploadDropTextStyle}>or use the button below</div>
      </div>

      <input ref={inputRef} type="file" accept={accept} hidden onChange={onPick} />
      <button type="button" disabled={disabled} onClick={onOpenPicker} style={{ ...uploadButtonStyle, background: accent }}>
        {buttonLabel}
      </button>
      <div style={fileStateStyle}>{filename || 'No file uploaded yet'}</div>
    </div>
  );
}

function StepIndicator({ current }) {
  return (
    <nav style={stepNavStyle} aria-label="Report wizard steps">
      {WIZARD_STEPS.map((step) => {
        const active = current === step.id;
        const complete = current > step.id;
        const pending = current < step.id;

        return (
          <div
            key={step.id}
            style={{
              ...stepCardStyle,
              borderColor: active ? '#1d4ed8' : complete ? '#15803d' : '#cbd5e1',
              background: active ? '#dbeafe' : complete ? '#ecfdf5' : '#f8fafc',
            }}
          >
            <div
              style={{
                ...stepNumberStyle,
                background: active ? '#1d4ed8' : complete ? '#15803d' : '#e2e8f0',
                color: active || complete ? '#fff' : '#475569',
              }}
            >
              {step.id}
            </div>
            <div>
              <div style={stepTitleStyle}>{step.title}</div>
              <div style={stepCaptionStyle}>
                {complete ? 'Complete' : active ? 'Current step' : pending ? 'Waiting' : ''}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function SummaryMetric({ label, value, tone = 'default' }) {
  const toneStyles = {
    default: { background: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' },
    blue: { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' },
    amber: { background: '#fffbeb', borderColor: '#fcd34d', color: '#b45309' },
    green: { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' },
  };

  return (
    <div style={{ ...summaryMetricStyle, ...toneStyles[tone] }}>
      <div style={summaryMetricLabelStyle}>{label}</div>
      <div style={summaryMetricValueStyle}>{value}</div>
    </div>
  );
}

function FieldStatusBadge({ mapped }) {
  return (
    <span
      style={{
        ...fieldBadgeStyle,
        background: mapped ? '#ecfdf5' : '#fff7ed',
        color: mapped ? '#166534' : '#b45309',
        borderColor: mapped ? '#86efac' : '#fdba74',
      }}
    >
      {mapped ? 'Mapped' : 'Manual'}
    </span>
  );
}

function ColumnMappingStep({ state, dispatch, busy, onNext }) {
  const fieldsByCategory = state.templateFields.reduce((acc, field) => {
    const category = field.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {});

  const mappedCount = Object.values(state.columnMapping).filter(Boolean).length;
  const unmappedCount = Math.max(state.templateFields.length - mappedCount, 0);

  return (
    <section style={stepPanelStyle}>
      <div style={stepPanelHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Step 1</div>
          <h2 style={sectionTitle}>Column Mapping</h2>
          <p style={hintStyle}>
            Connect the uploaded Excel columns to the SGIL template fields. Anything you leave unmapped will still be
            shown in Step 2 as an editable field.
          </p>
        </div>
        <div style={summaryMetricGridStyle}>
          <SummaryMetric label="Excel columns" value={state.excelColumns.length} tone="blue" />
          <SummaryMetric label="Mapped fields" value={mappedCount} tone="green" />
          <SummaryMetric label="Manual fields" value={unmappedCount} tone="amber" />
        </div>
      </div>

      <div style={helperPanelStyle}>
        <div style={helperPanelTitleStyle}>Match criteria for Step 2</div>
        <p style={helperPanelTextStyle}>
          Heat No and Casting Name are required. The app uses both values to find the correct metallurgy row before
          showing the editable preview.
        </p>
        <div style={basicGridStyle}>
          <div>
            <label style={labelStyle}>Heat No</label>
            <input
              style={inputStyle}
              value={state.searchKeys.heatNo}
              onChange={(e) => dispatch({ type: 'SET_SEARCH_KEY', field: 'heatNo', value: e.target.value })}
              placeholder="Required, e.g. A0226159"
            />
          </div>
          <div>
            <label style={labelStyle}>Casting Name</label>
            <input
              style={inputStyle}
              value={state.searchKeys.castingName}
              onChange={(e) => dispatch({ type: 'SET_SEARCH_KEY', field: 'castingName', value: e.target.value })}
              placeholder="Required, e.g. Hollow Shaft"
            />
          </div>
        </div>
      </div>

      {Object.entries(fieldsByCategory).map(([category, fields]) => (
        <div key={category} style={{ marginTop: 24 }}>
          <h3 style={subheadingStyle}>{category}</h3>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>Template field</th>
                  <th style={thStyle}>SGIL position</th>
                  <th style={thStyle}>Excel column</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => {
                  const mappedValue = state.columnMapping[field.id] || '';

                  return (
                    <tr key={field.id} style={tbodyRowStyle}>
                      <td style={tdLabelStyle}>
                        <div style={fieldLabelRowStyle}>
                          <span>{field.label}</span>
                          <FieldStatusBadge mapped={Boolean(mappedValue)} />
                        </div>
                      </td>
                      <td style={tdStyle}>{field.cell || '-'}</td>
                      <td style={tdStyle}>
                        <select
                          value={mappedValue}
                          onChange={(e) =>
                            dispatch({ type: 'SET_COLUMN_MAPPING', fieldId: field.id, excelColumn: e.target.value })
                          }
                          style={selectStyle}
                        >
                          <option value="">Leave blank - fill manually in Step 2</option>
                          {state.excelColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div style={buttonRowStyle}>
        <button type="button" disabled={busy} onClick={onNext} style={btnBlue}>
          Search & Show Preview
        </button>
      </div>
    </section>
  );
}

function MatchFillStep({ state, dispatch, onBack, onNext }) {
  const filledChemCount = countFilledRows(state.chemical);
  const filledMechCount = countFilledRows(state.mechanical);
  const blankChemCount = state.chemical.length - filledChemCount;
  const blankMechCount = state.mechanical.length - filledMechCount;

  return (
    <section style={{ ...stepPanelStyle, borderColor: '#1d4ed8' }}>
      <div style={stepPanelHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Step 2</div>
          <h2 style={sectionTitle}>Match and Fill</h2>
          <p style={hintStyle}>
            This is the review and edit stage. Every specified and actual cell is editable before the final report is
            downloaded.
          </p>
        </div>
        <div style={summaryMetricGridStyle}>
          <SummaryMetric label="Chem actuals filled" value={`${filledChemCount}/${state.chemical.length}`} tone="green" />
          <SummaryMetric label="Chem still blank" value={blankChemCount} tone="amber" />
          <SummaryMetric label="Mech actuals filled" value={`${filledMechCount}/${state.mechanical.length}`} tone="blue" />
          <SummaryMetric label="Mech still blank" value={blankMechCount} tone="amber" />
        </div>
      </div>

      {state.loadMessage ? (
        <div style={state.rowFound ? infoBannerStyle : warnBannerStyle} role="status">
          {state.loadMessage}
        </div>
      ) : null}

      <div style={referenceStripStyle}>
        <div style={referenceStripItemStyle}>
          <span style={legendSwatchReadonlyStyle} />
          <span>Specified = editable limits</span>
        </div>
        <div style={referenceStripItemStyle}>
          <span style={legendSwatchEditableStyle} />
          <span>Actual = editable report value</span>
        </div>
        <div style={referenceStripItemStyle}>
          <strong>Missing matches stay editable.</strong>
        </div>
      </div>

      <div style={dataSectionStyle}>
        <h3 style={subheadingStyle}>Basic report details</h3>
        <div style={basicGridStyle}>
          {BASIC_FIELD_KEYS.map(({ key, label }) => (
            <div key={key} style={fieldCardStyle}>
              <label style={labelStyle}>{label}</label>
              <input
                style={actualInputStyle}
                value={state.basic[key] || ''}
                onChange={(e) => dispatch({ type: 'SET_BASIC', key, value: e.target.value })}
                placeholder="Editable report value"
              />
            </div>
          ))}
        </div>
      </div>

      <div style={dataSectionStyle}>
        <h3 style={subheadingStyle}>Chemical composition</h3>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Template heading</th>
                <th style={thStyle}>Specified limit</th>
                <th style={thStyle}>Actual value</th>
              </tr>
            </thead>
            <tbody>
              {state.chemical.map((row) => (
                <tr key={row.element} style={tbodyRowStyle}>
                  <td style={tdLabelStyle}>
                    <div>{row.label || row.element}</div>
                    <div style={fieldSubtextStyle}>{row.element}</div>
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={specifiedInputStyle}
                      value={row.specified}
                      onChange={(e) =>
                        dispatch({ type: 'SET_CHEM', element: row.element, field: 'specified', value: e.target.value })
                      }
                      placeholder="Editable specified limit"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={actualInputStyle}
                      value={row.actual}
                      onChange={(e) =>
                        dispatch({ type: 'SET_CHEM', element: row.element, field: 'actual', value: e.target.value })
                      }
                      placeholder="Editable actual value"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={dataSectionStyle}>
        <h3 style={subheadingStyle}>Mechanical properties</h3>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Template heading</th>
                <th style={thStyle}>Specified limit</th>
                <th style={thStyle}>Actual value</th>
              </tr>
            </thead>
            <tbody>
              {state.mechanical.map((row) => (
                <tr key={row.key} style={tbodyRowStyle}>
                  <td style={tdLabelStyle}>{row.name}</td>
                  <td style={tdStyle}>
                    <input
                      style={specifiedInputStyle}
                      value={row.specified}
                      onChange={(e) =>
                        dispatch({ type: 'SET_MECH', key: row.key, field: 'specified', value: e.target.value })
                      }
                      placeholder="Editable specified limit"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={actualInputStyle}
                      value={row.actual}
                      onChange={(e) =>
                        dispatch({ type: 'SET_MECH', key: row.key, field: 'actual', value: e.target.value })
                      }
                      placeholder="Editable actual value"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button type="button" onClick={onBack} style={btnGray}>
          Back - Column Mapping
        </button>
        <button type="button" onClick={onNext} style={btnBlue}>
          Next - Final Generation
        </button>
      </div>
    </section>
  );
}

function GenerateStep({ state, busy, onBack, onGenerate }) {
  const filledChem = countFilledRows(state.chemical);
  const filledMech = countFilledRows(state.mechanical);

  return (
    <section style={{ ...stepPanelStyle, borderColor: '#15803d', background: '#f8fffa' }}>
      <div style={stepPanelHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Step 3</div>
          <h2 style={sectionTitle}>Final Generation</h2>
          <p style={hintStyle}>
            Download the final report only after your review is complete. This step does not run automatically and will
            only create the document when you click Download Final Report.
          </p>
        </div>
        <div style={summaryMetricGridStyle}>
          <SummaryMetric label="Heat No" value={state.basic.heat_no || state.searchKeys.heatNo || '-'} tone="blue" />
          <SummaryMetric
            label="Chem actuals"
            value={`${filledChem}/${state.chemical.length}`}
            tone={filledChem === state.chemical.length ? 'green' : 'amber'}
          />
          <SummaryMetric
            label="Mech actuals"
            value={`${filledMech}/${state.mechanical.length}`}
            tone={filledMech === state.mechanical.length ? 'green' : 'amber'}
          />
        </div>
      </div>

      <div style={reviewGridStyle}>
        <div style={reviewCardStyle}>
          <div style={reviewCardTitleStyle}>Report basics</div>
          <ul style={reviewListStyle}>
            <li>
              <strong>Casting Name:</strong> {state.basic.casting_name || state.searchKeys.castingName || '-'}
            </li>
            <li>
              <strong>Customer:</strong> {state.basic.customer || '-'}
            </li>
            <li>
              <strong>Material Grade:</strong> {state.basic.material_grade || '-'}
            </li>
            <li>
              <strong>Drawing No:</strong> {state.basic.drawing_no || '-'}
            </li>
          </ul>
        </div>

        <div style={reviewCardStyle}>
          <div style={reviewCardTitleStyle}>Files ready for generation</div>
          <ul style={reviewListStyle}>
            <li>
              <strong>Metallurgy Excel:</strong> {state.files.metallurgyFilename || '-'}
            </li>
            <li>
              <strong>SGIL Template:</strong> {state.files.templateFilename || '-'}
            </li>
            <li>
              <strong>Mechanical requirements:</strong> {state.files.mechReqFilename || '-'}
            </li>
          </ul>
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button type="button" onClick={onBack} style={btnGray}>
          Back - Match and Fill
        </button>
        <button
          type="button"
          disabled={
            busy ||
            !state.files.templateFilename ||
            !state.files.metallurgyFilename ||
            !state.files.mechReqFilename
          }
          onClick={onGenerate}
          style={btnGreen}
        >
          {busy ? 'Downloading...' : 'Download Final Report'}
        </button>
      </div>
    </section>
  );
}

export default function WizardDashboard({ username, onLogout }) {
  const [report, dispatch] = useReducer(reportReducer, initialReportState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const metalInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const mechReqInputRef = useRef(null);

  const postForm = useCallback(async (url, formData) => {
    return axios.post(url, formData, { timeout: REQ_MS, headers: { ...authHeaders() } });
  }, []);

  const loadColumnMapping = useCallback(
    async (filename = report.files.metallurgyFilename) => {
      if (!filename) {
        setError('Upload the metallurgy Excel file first.');
        return false;
      }

      setBusy(true);
      setError('');

      try {
        const res = await axios.post(
          `${API_BASE}/detect_columns`,
          { metallurgy_filename: filename },
          { timeout: REQ_MS, headers: authHeaders() },
        );

        dispatch({
          type: 'SET_MAPPING_DATA',
          excelColumns: res.data.columns || [],
          templateFields: res.data.template_fields || [],
          columnMapping: res.data.suggested_mapping || {},
        });
        dispatch({ type: 'SET_WIZARD_STEP', step: 1 });
        return true;
      } catch (err) {
        if (err.response?.status === 401) {
          onLogout();
          return false;
        }
        setError(err.response?.data?.detail || 'Could not read Excel columns.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onLogout, report.files.metallurgyFilename],
  );

  const uploadFile = useCallback(
    async (kind, file, inputEl) => {
      if (!file) return;

      const validators = {
        metallurgy: ['.xls', '.xlsx'],
        template: ['.xlsx'],
        mechanical: ['.xlsx'],
      };
      if (!isAllowedUpload(file, validators[kind] || [])) {
        setError(
          kind === 'metallurgy'
            ? 'Metallurgy Sheet must be .xls or .xlsx.'
            : 'This file must be .xlsx.',
        );
        if (inputEl) inputEl.value = '';
        return;
      }

      setError('');
      setBusy(true);

      const formData = new FormData();
      formData.append('file', file);

      const endpoints = {
        metallurgy: '/upload_metallurgy',
        template: '/upload_template',
        mechanical: '/upload_mechanical_requirements',
      };
      const fields = {
        metallurgy: 'metallurgyFilename',
        template: 'templateFilename',
        mechanical: 'mechReqFilename',
      };

      try {
        const res = await postForm(`${API_BASE}${endpoints[kind]}`, formData);
        if (res.data.status !== 'success') {
          setError(res.data.message || 'Upload failed.');
          return;
        }

        const fileName =
          kind === 'metallurgy'
            ? res.data.metallurgy_actual_filename || res.data.metallurgy_filename || ''
            : kind === 'template'
              ? res.data.template_filename || ''
              : res.data.mechanical_requirements_filename || '';
        dispatch({ type: 'SET_FILE', field: fields[kind], value: fileName });
      } catch (err) {
        if (err.response?.status === 401) {
          onLogout();
          return;
        }
        setError(
          kind === 'metallurgy'
            ? 'Could not upload metallurgy sheet.'
            : kind === 'template'
              ? 'Could not upload template.'
              : 'Could not upload Mechanical_properties_Requirement.xlsx.',
        );
      } finally {
        setBusy(false);
        if (inputEl) inputEl.value = '';
      }
    },
    [onLogout, postForm],
  );

  const goToMatchFill = useCallback(async () => {
    if (!report.files.metallurgyFilename || !report.files.templateFilename || !report.files.mechReqFilename) {
      setError('Upload the metallurgy sheet, mechanical requirements file, and test report template first.');
      return;
    }

    const heatNo = report.searchKeys.heatNo.trim();
    const castingName = report.searchKeys.castingName.trim();

    if (!heatNo || !castingName) {
      setError('Heat No and Casting Name are required.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await axios.post(
        `${API_BASE}/preview_mapped`,
        {
          heat_no: heatNo,
          casting_name: castingName,
          metallurgy_filename: report.files.metallurgyFilename,
          specification_filename: report.files.specFilename || undefined,
          mechanical_requirements_filename: report.files.mechReqFilename || undefined,
          column_mapping: report.columnMapping,
        },
        { timeout: REQ_MS, headers: authHeaders() },
      );

      const parsed = previewToReportState(res.data, {
        heatNo: report.searchKeys.heatNo,
        castingName: report.searchKeys.castingName,
      });

      dispatch({
        type: 'LOAD_PREVIEW',
        rowFound: parsed.rowFound,
        message: parsed.rowFound
          ? 'Found matching data. Review and edit all cells before downloading the report.'
          : parsed.message || 'No matching Heat No / Casting Name in metallurgy sheet.',
        basic: parsed.basic,
        chemical: parsed.chemical,
        mechanical: parsed.mechanical,
      });
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
        return;
      }
      setError(err.response?.data?.detail || 'Failed to load the Match and Fill stage.');
    } finally {
      setBusy(false);
    }
  }, [onLogout, report]);

  const generateReport = useCallback(async () => {
    if (!report.files.templateFilename || !report.files.metallurgyFilename || !report.files.mechReqFilename) {
      setError('Metallurgy Excel, mechanical requirements, and SGIL template are required.');
      return;
    }

    setError('');
    setBusy(true);

    try {
      const body = reportStateToGenerateBody(report);
      const filename = `Report_${body.heat_no || 'test'}.xlsx`;

      const response = await fetch(`${API_BASE}/download_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      if (!response.ok) {
        let message = 'Report generation failed.';
        try {
          const payload = await response.json();
          message = payload.detail || payload.message || message;
        } catch {
          try { message = await response.text(); } catch { /* ignore */ }
        }
        setError(typeof message === 'string' ? message : 'Report generation failed.');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Report generation failed.');
    } finally {
      setBusy(false);
    }
  }, [onLogout, report]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <img
            src={`${process.env.PUBLIC_URL || ''}/sgil-logo.png`}
            alt="Synergy Green Industries Ltd"
            style={{ width: 'auto', height: 80, objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <h1 style={pageTitleStyle}>Material Test Report Generator</h1>
            <p style={pageSubtitleStyle}>Upload, map, review, and generate with full manual control.</p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={userPillStyle}>{username}</span>
          <button type="button" onClick={onLogout} style={logoutBtnStyle}>
            Logout
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" style={errorBannerStyle}>
          {error}
        </div>
      ) : null}

      <section style={uploadPanelStyle}>
        <div style={uploadHeaderStyle}>
          <div>
            <div style={uploadEyebrowStyle}>Step 2 of 4</div>
            <h2 style={uploadTitleStyle}>Upload Data Files</h2>
            <p style={uploadSubtitleStyle}>
              Add the three required Excel files, then proceed to search and preview your report.
            </p>
          </div>
        </div>

        <div style={uploadGridStyle}>
          <UploadCard
            accent="#2563eb"
            title="Metallurgy Sheet"
            description="Required source data for actual chemistry and mechanical values."
            filename={report.files.metallurgyFilename}
            inputRef={metalInputRef}
            accept=".xls,.xlsx"
            buttonLabel="Choose File"
            onOpenPicker={() => metalInputRef.current?.click()}
            onPick={(e) => uploadFile('metallurgy', e.target.files?.[0], e.target)}
            onDropFile={(file) => uploadFile('metallurgy', file, metalInputRef.current)}
            disabled={busy}
          />

          <UploadCard
            accent="#059669"
            title="Test Report Template"
            description="Required template that keeps the original logo and layout."
            filename={report.files.templateFilename}
            inputRef={templateInputRef}
            accept=".xlsx"
            buttonLabel="Choose File"
            onOpenPicker={() => templateInputRef.current?.click()}
            onPick={(e) => uploadFile('template', e.target.files?.[0], e.target)}
            onDropFile={(file) => uploadFile('template', file, templateInputRef.current)}
            disabled={busy}
          />

          <UploadCard
            accent="#047857"
            title="Mechanical Properties Requirement"
            description="Required specified tensile, proof stress, elongation, hardness and impact limits."
            filename={report.files.mechReqFilename}
            inputRef={mechReqInputRef}
            accept=".xlsx"
            buttonLabel="Choose File"
            onOpenPicker={() => mechReqInputRef.current?.click()}
            onPick={(e) => uploadFile('mechanical', e.target.files?.[0], e.target)}
            onDropFile={(file) => uploadFile('mechanical', file, mechReqInputRef.current)}
            disabled={busy}
          />
        </div>

        <div style={buttonRowStyle}>
          <button type="button" onClick={onLogout} style={btnGray}>
            Back to Login
          </button>
          <button
            type="button"
            disabled={
              busy ||
              !report.files.metallurgyFilename ||
              !report.files.templateFilename ||
              !report.files.mechReqFilename
            }
            onClick={() => loadColumnMapping()}
            style={btnGreen}
          >
            Proceed to Search
          </button>
        </div>
      </section>

      {report.wizardStep > 0 ? <StepIndicator current={report.wizardStep} /> : null}

      {report.wizardStep === 1 ? (
        <ColumnMappingStep state={report} dispatch={dispatch} busy={busy} onNext={goToMatchFill} />
      ) : null}

      {report.wizardStep === 2 ? (
        <MatchFillStep
          state={report}
          dispatch={dispatch}
          onBack={() => dispatch({ type: 'SET_WIZARD_STEP', step: 1 })}
          onNext={() => dispatch({ type: 'SET_WIZARD_STEP', step: 3 })}
        />
      ) : null}

      {report.wizardStep === 3 ? (
        <GenerateStep
          state={report}
          busy={busy}
          onBack={() => dispatch({ type: 'SET_WIZARD_STEP', step: 2 })}
          onGenerate={generateReport}
        />
      ) : null}

      {busy ? <p style={busyTextStyle}>Working...</p> : null}
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: 24,
  maxWidth: 1320,
  margin: '0 auto',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  color: '#e2e8f0',
  background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 52%, #0f172a 100%)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  paddingBottom: 20,
  marginBottom: 24,
  borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
};

const pageTitleStyle = {
  margin: 0,
  color: '#f8fafc',
  fontSize: '1.7rem',
  fontWeight: 800,
};

const pageSubtitleStyle = {
  margin: '8px 0 0',
  color: '#cbd5e1',
  fontSize: '0.98rem',
};

const sectionTitle = {
  margin: '4px 0 10px',
  color: '#0f172a',
  fontSize: '1.2rem',
};

const subheadingStyle = {
  margin: 0,
  color: '#1e3a5f',
  fontSize: '1rem',
};

const eyebrowStyle = {
  color: '#1d4ed8',
  fontSize: '0.8rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const hintStyle = {
  margin: 0,
  color: '#475569',
  fontSize: '0.94rem',
  lineHeight: 1.6,
  maxWidth: 760,
};

const userPillStyle = {
  display: 'inline-block',
  padding: '6px 12px',
  background: 'rgba(226, 232, 240, 0.14)',
  color: '#f8fafc',
  borderRadius: 999,
  fontSize: '0.86rem',
  marginRight: 10,
};

const logoutBtnStyle = {
  padding: '8px 14px',
  background: 'rgba(255,255,255,0.1)',
  color: '#f8fafc',
  border: '1px solid rgba(226, 232, 240, 0.2)',
  borderRadius: 10,
  cursor: 'pointer',
};

const uploadHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
};

const uploadEyebrowStyle = {
  color: '#60a5fa',
  fontSize: '0.8rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const uploadTitleStyle = {
  margin: '6px 0 8px',
  color: '#f8fafc',
  fontSize: '1.5rem',
  fontWeight: 800,
};

const uploadSubtitleStyle = {
  margin: 0,
  color: '#cbd5e1',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  maxWidth: 760,
};

const uploadPanelStyle = {
  marginBottom: 24,
  padding: 28,
  background: 'rgba(15, 23, 42, 0.7)',
  borderRadius: 28,
  border: '1px solid rgba(148, 163, 184, 0.2)',
  boxShadow: '0 28px 60px rgba(15, 23, 42, 0.45)',
};

const stepPanelStyle = {
  marginBottom: 24,
  padding: 22,
  background: '#fff',
  borderRadius: 20,
  border: '1px solid #dbeafe',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
};

const stepPanelHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const summaryMetricGridStyle = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  minWidth: 'min(100%, 420px)',
};

const summaryMetricStyle = {
  border: '1px solid',
  borderRadius: 16,
  padding: '12px 14px',
};

const summaryMetricLabelStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  opacity: 0.9,
};

const summaryMetricValueStyle = {
  marginTop: 6,
  fontSize: '1.08rem',
  fontWeight: 800,
  lineHeight: 1.3,
  wordBreak: 'break-word',
};

const uploadGridStyle = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  marginTop: 24,
};

const uploadCardStyle = {
  padding: 20,
  background: '#fff',
  borderRadius: 22,
  border: '1px solid #dbeafe',
  borderTop: '4px solid #2563eb',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
};

const uploadCardTitleStyle = {
  fontSize: '1.02rem',
  fontWeight: 800,
  color: '#0f172a',
  marginTop: 2,
};

const uploadCardTextStyle = {
  margin: '8px 0 16px',
  color: '#64748b',
  fontSize: '0.9rem',
  lineHeight: 1.5,
};

const uploadAccentStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
};

const uploadDropZoneStyle = {
  border: '1px dashed',
  borderRadius: 18,
  padding: '18px 16px',
  background: '#f8fafc',
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const uploadDropTitleStyle = {
  fontWeight: 800,
  color: '#0f172a',
  marginBottom: 4,
};

const uploadDropTextStyle = {
  color: '#64748b',
  fontSize: '0.88rem',
};

const uploadButtonStyle = {
  padding: '11px 18px',
  borderRadius: 12,
  border: 'none',
  width: '100%',
  marginTop: 14,
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
};

const fileStateStyle = {
  marginTop: 12,
  color: '#0f172a',
  fontSize: '0.88rem',
  wordBreak: 'break-word',
};

const stepNavStyle = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  marginBottom: 24,
};

const stepCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: 16,
  borderRadius: 18,
  border: '1px solid',
};

const stepNumberStyle = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  flexShrink: 0,
};

const stepTitleStyle = {
  fontSize: '0.98rem',
  fontWeight: 800,
  color: '#0f172a',
};

const stepCaptionStyle = {
  marginTop: 4,
  fontSize: '0.84rem',
  color: '#64748b',
};

const helperPanelStyle = {
  marginTop: 20,
  padding: 18,
  background: '#f8fbff',
  border: '1px solid #bfdbfe',
  borderRadius: 18,
};

const helperPanelTitleStyle = {
  fontSize: '0.95rem',
  fontWeight: 800,
  color: '#1e3a5f',
  marginBottom: 6,
};

const helperPanelTextStyle = {
  margin: '0 0 14px',
  color: '#475569',
  fontSize: '0.9rem',
  lineHeight: 1.55,
};

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 700,
  color: '#334155',
  fontSize: '0.88rem',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0f172a',
  minHeight: 42,
};

const actualInputStyle = {
  ...inputStyle,
  background: '#fff7ed',
  borderColor: '#fdba74',
};

const specifiedInputStyle = {
  ...inputStyle,
  background: '#f8fafc',
  borderColor: '#cbd5e1',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
};

const basicGridStyle = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
};

const tableWrapStyle = {
  marginTop: 12,
  overflowX: 'auto',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  minWidth: 720,
};

const theadRowStyle = {
  background: '#1e3a5f',
  color: '#fff',
};

const thStyle = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '0.86rem',
  fontWeight: 800,
};

const tbodyRowStyle = {
  background: '#fff',
};

const tdStyle = {
  padding: 12,
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'top',
};

const tdLabelStyle = {
  ...tdStyle,
  minWidth: 200,
  fontWeight: 700,
};

const fieldLabelRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const fieldBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid',
  fontSize: '0.78rem',
  fontWeight: 800,
};

const fieldSubtextStyle = {
  marginTop: 4,
  fontSize: '0.8rem',
  color: '#64748b',
  fontWeight: 500,
};

const referenceStripStyle = {
  display: 'flex',
  gap: 16,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginTop: 18,
  padding: '14px 16px',
  borderRadius: 16,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const referenceStripItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#334155',
  fontSize: '0.9rem',
};

const legendSwatchReadonlyStyle = {
  width: 14,
  height: 14,
  borderRadius: 4,
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
};

const legendSwatchEditableStyle = {
  width: 14,
  height: 14,
  borderRadius: 4,
  background: '#fff7ed',
  border: '1px solid #fdba74',
};

const dataSectionStyle = {
  marginTop: 24,
};

const fieldCardStyle = {
  padding: 14,
  borderRadius: 16,
  background: '#fff',
  border: '1px solid #e2e8f0',
};

const buttonRowStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 24,
  justifyContent: 'center',
};

const btnBase = {
  padding: '11px 18px',
  borderRadius: 12,
  border: 'none',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
};

const btnGray = { ...btnBase, background: '#64748b' };
const btnBlue = { ...btnBase, background: '#2563eb' };
const btnGreen = { ...btnBase, background: '#059669' };

const infoBannerStyle = {
  marginTop: 18,
  padding: '12px 14px',
  background: '#ecfdf5',
  border: '1px solid #86efac',
  color: '#166534',
  borderRadius: 14,
};

const warnBannerStyle = {
  marginTop: 18,
  padding: '12px 14px',
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  color: '#92400e',
  borderRadius: 14,
};

const errorBannerStyle = {
  marginBottom: 16,
  padding: '12px 14px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  borderRadius: 14,
};

const reviewGridStyle = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  marginTop: 20,
};

const reviewCardStyle = {
  padding: 18,
  borderRadius: 18,
  background: '#fff',
  border: '1px solid #dcfce7',
};

const reviewCardTitleStyle = {
  fontSize: '0.98rem',
  fontWeight: 800,
  color: '#14532d',
};

const reviewListStyle = {
  margin: '10px 0 0',
  paddingLeft: 18,
  color: '#334155',
  lineHeight: 1.8,
};

const busyTextStyle = {
  color: '#475569',
  fontWeight: 700,
};
