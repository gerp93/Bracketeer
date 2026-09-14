import type { Bracket, FilingStatus } from '../../engine/types';
import {
  FEDERAL_TAX_TABLES_2025,
  RMD_UNIFORM_LIFETIME_TABLE,
  ADDITIONAL_STANDARD_DEDUCTION_65_PLUS_MFJ_PER_SPOUSE,
  irmaaTiersByFilingStatus,
} from '../../engine/data/federalTaxTables';
import {
  MN_BRACKETS_2025,
  MN_STANDARD_DEDUCTION_BASE_2025,
  MN_STANDARD_DEDUCTION_PHASEOUT_START_2025,
  MN_STANDARD_DEDUCTION_PHASEOUT_RATE,
  MN_STANDARD_DEDUCTION_FLOOR_FRACTION,
  MN_SS_SUBTRACTION_MAX_2025,
  MN_SS_SUBTRACTION_PHASEOUT_START_2025,
  MN_SS_SUBTRACTION_PHASEOUT_RATE,
} from '../../engine/data/minnesotaTaxTables';
import { CITATIONS, DATA_LAST_UPDATED, type Citation } from '../../engine/data/sources';
import { formatCurrency, formatPercent } from '../format';

const STATUSES: FilingStatus[] = ['mfj', 'single', 'mfs'];
const STATUS_LABELS: Record<FilingStatus, string> = { mfj: 'MFJ', single: 'Single', mfs: 'MFS' };

function CitationFooter({ citation }: { citation: Citation }) {
  return (
    <p className="source-citation">
      Source: {citation.source}
      {citation.locator ? ` — ${citation.locator}` : ''}
      {citation.url && (
        <>
          {' '}
          (
          <a href={citation.url} target="_blank" rel="noreferrer">
            link
          </a>
          )
        </>
      )}
    </p>
  );
}

function Section({ title, citation, children }: { title: string; citation: Citation; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      {children}
      <CitationFooter citation={citation} />
    </div>
  );
}

function BracketTable({ brackets }: { brackets: Bracket[] }) {
  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th>From</th>
          <th>To</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        {brackets.map((b, i) => (
          <tr key={i}>
            <td>{formatCurrency(b.from)}</td>
            <td>{b.to !== undefined ? formatCurrency(b.to) : 'and up'}</td>
            <td>{formatPercent(b.rate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusValueTable({
  rows,
}: {
  rows: { label: string; values: Partial<Record<FilingStatus, string>> }[];
}) {
  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th></th>
          {STATUSES.map((s) => (
            <th key={s}>{STATUS_LABELS[s]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            {STATUSES.map((s) => (
              <td key={s}>{row.values[s] ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Read-only — every externally-sourced figure the engine actually uses,
 * pulled live from the real tax-table constants (never a second, hand-
 * typed copy that could drift from them) alongside where each one came
 * from, so anyone can independently verify it. Not a settings page: there
 * is no way to edit anything from here.
 */
export default function DataSourcesPage() {
  const tables = FEDERAL_TAX_TABLES_2025;

  return (
    <>
      <div className="panel">
        <h2>Data Sources</h2>
        <p className="source-last-updated">Figures last updated/verified: {DATA_LAST_UPDATED}</p>
        <p className="muted">
          Every dollar figure and rate baked into Bracketeer&rsquo;s tax engine, read live from the same tables the
          projection itself uses — not a separate copy — with where each one came from. Nothing on this page is
          editable. That date is when any figure below was last added, corrected, or re-checked — it&rsquo;s not a
          claim that every single one was independently verified then; each section&rsquo;s own citation says
          whether that specific figure has been checked against its source.
        </p>
      </div>

      <Section title="Federal ordinary income brackets (2025)" citation={CITATIONS.federalOrdinaryBrackets}>
        <div className="source-bracket-grid">
          {(['mfj', 'single'] as const).map((s) => (
            <div key={s}>
              <h3>{STATUS_LABELS[s]}</h3>
              <BracketTable brackets={tables.ordinaryBrackets[s]} />
            </div>
          ))}
          <div>
            <h3>MFS</h3>
            <BracketTable brackets={tables.ordinaryBrackets.mfs} />
            <p className="muted source-derived-note">{CITATIONS.mfsDerived.locator}</p>
          </div>
        </div>
      </Section>

      <Section title="Federal long-term capital gains brackets (2025)" citation={CITATIONS.federalLtcgBrackets}>
        <div className="source-bracket-grid">
          {(['mfj', 'single'] as const).map((s) => (
            <div key={s}>
              <h3>{STATUS_LABELS[s]}</h3>
              <BracketTable brackets={tables.ltcgBrackets[s]} />
            </div>
          ))}
          <div>
            <h3>MFS</h3>
            <BracketTable brackets={tables.ltcgBrackets.mfs} />
          </div>
        </div>
      </Section>

      <Section title="Federal standard deduction (2025)" citation={CITATIONS.federalStandardDeduction}>
        <StatusValueTable
          rows={[
            {
              label: 'Base amount',
              values: {
                mfj: formatCurrency(tables.standardDeduction.mfj),
                single: formatCurrency(tables.standardDeduction.single),
                mfs: formatCurrency(tables.standardDeduction.mfs),
              },
            },
          ]}
        />
        <p className="muted source-derived-note">
          Additional amount for age 65+: {formatCurrency(ADDITIONAL_STANDARD_DEDUCTION_65_PLUS_MFJ_PER_SPOUSE)} per
          qualifying spouse (MFJ and MFS — MFS shares MFJ&rsquo;s figure), {formatCurrency(tables.additionalStandardDeduction65Plus)}{' '}
          flat (Single). {CITATIONS.federal65PlusAddition.source}, {CITATIONS.federal65PlusAddition.locator}.
        </p>
      </Section>

      <Section title="Social Security taxability thresholds (2025)" citation={CITATIONS.socialSecurityThresholds}>
        <StatusValueTable
          rows={[
            {
              label: '50% threshold (provisional income)',
              values: {
                mfj: formatCurrency(tables.socialSecurity.firstThreshold.mfj),
                single: formatCurrency(tables.socialSecurity.firstThreshold.single),
                mfs: formatCurrency(tables.socialSecurity.firstThreshold.mfs),
              },
            },
            {
              label: '85% threshold (provisional income)',
              values: {
                mfj: formatCurrency(tables.socialSecurity.secondThreshold.mfj),
                single: formatCurrency(tables.socialSecurity.secondThreshold.single),
                mfs: formatCurrency(tables.socialSecurity.secondThreshold.mfs),
              },
            },
          ]}
        />
      </Section>

      <Section title="Net Investment Income Tax (NIIT)" citation={CITATIONS.niitThreshold}>
        <StatusValueTable
          rows={[
            {
              label: 'MAGI threshold',
              values: {
                mfj: formatCurrency(tables.niitThreshold.mfj),
                single: formatCurrency(tables.niitThreshold.single),
                mfs: formatCurrency(tables.niitThreshold.mfs),
              },
            },
          ]}
        />
        <p className="muted source-derived-note">Rate: {formatPercent(tables.niitRate)} on the lesser of net investment income or MAGI over the threshold.</p>
      </Section>

      <Section title="Medicare IRMAA surcharge tiers (2025, monthly per person)" citation={CITATIONS.irmaaTiers}>
        <div className="source-bracket-grid">
          {(['mfj', 'single'] as const).map((s) => (
            <div key={s}>
              <h3>{STATUS_LABELS[s]} — Part B</h3>
              <IrmaaTable tiers={irmaaTiersByFilingStatus(tables, s, 'partB')} />
              <h3>{STATUS_LABELS[s]} — Part D</h3>
              <IrmaaTable tiers={irmaaTiersByFilingStatus(tables, s, 'partD')} />
            </div>
          ))}
          <div>
            <h3>MFS — Part B</h3>
            <IrmaaTable tiers={irmaaTiersByFilingStatus(tables, 'mfs', 'partB')} />
            <h3>MFS — Part D</h3>
            <IrmaaTable tiers={irmaaTiersByFilingStatus(tables, 'mfs', 'partD')} />
            <p className="muted source-derived-note">{CITATIONS.irmaaMfsCliff.locator}</p>
          </div>
        </div>
      </Section>

      <Section title="RMD Uniform Lifetime Table" citation={CITATIONS.rmdTable}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Divisor</th>
              <th>Age</th>
              <th>Divisor</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(RMD_UNIFORM_LIFETIME_TABLE)
              .slice(0, Math.ceil(Object.keys(RMD_UNIFORM_LIFETIME_TABLE).length / 2))
              .map(([age, divisor], i) => {
                const rightHalf = Object.entries(RMD_UNIFORM_LIFETIME_TABLE).slice(
                  Math.ceil(Object.keys(RMD_UNIFORM_LIFETIME_TABLE).length / 2)
                );
                const right = rightHalf[i];
                return (
                  <tr key={age}>
                    <td>{age}</td>
                    <td>{divisor}</td>
                    <td>{right ? right[0] : ''}</td>
                    <td>{right ? right[1] : ''}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Section>

      <Section title="Social Security claiming-age adjustment" citation={CITATIONS.ssClaimingAdjustment}>
        <p className="muted">
          Full retirement age is treated as 67. Claiming earlier reduces the benefit by 5/9% per month for the first
          36 months early, then 5/12% per month beyond that (down to age 62). Claiming later increases it by 2/3% per
          month, up to age 70. Applied automatically from the claiming age you enter per spouse — see{' '}
          {CITATIONS.ssClaimingAdjustment.locator}
        </p>
      </Section>

      <Section title="Minnesota income tax brackets (2025)" citation={CITATIONS.mnBrackets}>
        <div className="source-bracket-grid">
          {STATUSES.map((s) => (
            <div key={s}>
              <h3>{STATUS_LABELS[s]}</h3>
              <BracketTable brackets={MN_BRACKETS_2025[s]} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Minnesota standard deduction (2025)" citation={CITATIONS.mnStandardDeduction}>
        <StatusValueTable
          rows={[
            {
              label: 'Base amount',
              values: Object.fromEntries(STATUSES.map((s) => [s, formatCurrency(MN_STANDARD_DEDUCTION_BASE_2025[s])])),
            },
          ]}
        />
        <p className="muted source-derived-note">
          {CITATIONS.mnStandardDeductionPhaseout.source}, {CITATIONS.mnStandardDeductionPhaseout.locator}: phases
          down starting at {formatCurrency(MN_STANDARD_DEDUCTION_PHASEOUT_START_2025.mfj)} AGI (MFJ/Single) or{' '}
          {formatCurrency(MN_STANDARD_DEDUCTION_PHASEOUT_START_2025.mfs)} (MFS), reduced{' '}
          {formatPercent(MN_STANDARD_DEDUCTION_PHASEOUT_RATE)} per dollar over that, floored at{' '}
          {formatPercent(MN_STANDARD_DEDUCTION_FLOOR_FRACTION)} of the base amount.
        </p>
      </Section>

      <Section title="Minnesota Social Security subtraction (2025)" citation={CITATIONS.mnSsSubtraction}>
        <StatusValueTable
          rows={[
            {
              label: 'Maximum subtraction',
              values: Object.fromEntries(STATUSES.map((s) => [s, formatCurrency(MN_SS_SUBTRACTION_MAX_2025[s])])),
            },
            {
              label: 'Phase-out starts at (AGI)',
              values: Object.fromEntries(
                STATUSES.map((s) => [s, formatCurrency(MN_SS_SUBTRACTION_PHASEOUT_START_2025[s])])
              ),
            },
            {
              label: 'Phase-out rate (per $ over start)',
              values: Object.fromEntries(STATUSES.map((s) => [s, formatPercent(MN_SS_SUBTRACTION_PHASEOUT_RATE[s])])),
            },
          ]}
        />
      </Section>
    </>
  );
}

function IrmaaTable({
  tiers,
}: {
  tiers: { magiFrom: number; magiTo?: number; monthlySurchargePerPerson: number }[];
}) {
  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th>MAGI from</th>
          <th>MAGI to</th>
          <th>Surcharge</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t, i) => (
          <tr key={i}>
            <td>{formatCurrency(t.magiFrom)}</td>
            <td>{t.magiTo !== undefined ? formatCurrency(t.magiTo) : 'and up'}</td>
            <td>{formatCurrency(t.monthlySurchargePerPerson)}/mo</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
