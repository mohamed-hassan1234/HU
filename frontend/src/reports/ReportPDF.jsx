import {
  Document,
  Image,
  Line,
  Page,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View
} from '@react-pdf/renderer';
import reportHeader from '../../headerofreportdowload.png';

const green = '#008751';
const blue = '#1E73BE';
const gold = '#C9932A';
const red = '#dc2626';
const ink = '#172033';
const muted = '#64748b';

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingRight: 28,
    paddingBottom: 42,
    paddingLeft: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: ink,
    backgroundColor: '#ffffff'
  },
  coverPage: {
    paddingTop: 90,
    paddingRight: 44,
    paddingBottom: 52,
    paddingLeft: 44,
    fontFamily: 'Helvetica',
    color: ink,
    backgroundColor: '#ffffff'
  },
  header: {
    position: 'absolute',
    top: 18,
    left: 28,
    right: 28,
    height: 42,
    borderBottomWidth: 1.5,
    borderBottomColor: green,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerImage: {
    width: 190,
    height: 31,
    objectFit: 'contain'
  },
  headerTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: ink
  },
  headerMeta: {
    marginTop: 2,
    fontSize: 7,
    color: muted
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 18,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#dbe3ea',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: muted,
    fontSize: 7
  },
  coverBand: {
    borderLeftWidth: 6,
    borderLeftColor: green,
    paddingLeft: 18,
    marginTop: 34
  },
  coverTitle: {
    fontSize: 25,
    fontWeight: 700,
    color: ink
  },
  coverSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#334155'
  },
  coverKicker: {
    marginTop: 10,
    fontSize: 9,
    color: green,
    textTransform: 'uppercase',
    letterSpacing: 1.8
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 700,
    color: ink
  },
  sectionSubtitle: {
    marginTop: -5,
    marginBottom: 12,
    fontSize: 8,
    color: muted
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  metaCard: {
    width: '48%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    borderRadius: 4,
    backgroundColor: '#f8fafc'
  },
  metaLabel: {
    fontSize: 7,
    color: muted,
    textTransform: 'uppercase'
  },
  metaValue: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: 700,
    color: ink
  },
  stat: {
    width: '23.5%',
    minHeight: 54,
    padding: 9,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    borderRadius: 4,
    backgroundColor: '#fbfdff'
  },
  statLabel: {
    fontSize: 7,
    color: muted,
    textTransform: 'uppercase'
  },
  statValue: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: 700,
    color: green
  },
  panel: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    borderRadius: 4
  },
  calloutRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  callout: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  calloutBad: {
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7'
  },
  calloutLabel: {
    fontSize: 7,
    color: muted,
    textTransform: 'uppercase'
  },
  calloutValue: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: 700,
    color: ink
  },
  chartGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  chartPanel: {
    width: '48.5%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    borderRadius: 4,
    backgroundColor: '#ffffff'
  },
  chartTitle: {
    marginBottom: 8,
    fontSize: 10,
    fontWeight: 700,
    color: ink
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5
  },
  chartLabel: {
    width: 106,
    fontSize: 7,
    color: '#334155'
  },
  chartValue: {
    width: 28,
    textAlign: 'right',
    fontSize: 7,
    fontWeight: 700,
    color: ink
  },
  table: {
    borderWidth: 1,
    borderColor: '#dbe3ea'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: green,
    color: '#ffffff'
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc'
  },
  th: {
    padding: 6,
    fontSize: 7,
    fontWeight: 700
  },
  td: {
    padding: 6,
    fontSize: 7,
    color: '#243047'
  },
  paragraph: {
    fontSize: 9,
    lineHeight: 1.45,
    color: '#334155'
  }
});

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const safe = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const scoreOf = (row) => Number(row?.average ?? row?.averageScore ?? row?.score ?? 0);

const nameOf = (row) => safe(row?.name || row?.teacher || row?.course || row?.className || row?.department || row?.faculty);

const rankRows = (rows = []) => rows.map((row, index) => ({
  rank: row.rank || index + 1,
  name: nameOf(row),
  average: scoreOf(row).toFixed(2),
  submissions: row.submissions ?? row.count ?? row.total ?? '-'
}));

const chunk = (rows, size) => {
  const pages = [];
  for (let index = 0; index < rows.length; index += size) pages.push(rows.slice(index, index + size));
  return pages.length ? pages : [[]];
};

function Header({ model }) {
  const meta = model?.meta || {};
  const filters = meta.filters || {};
  return (
    <View fixed style={styles.header}>
      <Image src={reportHeader} style={styles.headerImage} />
      <View>
        <Text style={styles.headerTitle}>Hormuud University</Text>
        <Text style={styles.headerMeta}>Course & Teaching Evaluation System / Official Evaluation Report / {safe(meta.confidentiality, 'Confidential')}</Text>
        <Text style={styles.headerMeta}>Academic Year: {safe(filters.academicYear, 'All')} / Semester: {safe(filters.semester, 'All')}</Text>
      </View>
    </View>
  );
}

function Footer({ model }) {
  return (
    <View fixed style={styles.footer}>
      <Text>{safe(model?.meta?.confidentiality, 'Confidential')} / Generated by {safe(model?.meta?.generatedBy, 'System User')}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function ReportPage({ model, children, size = 'A4', orientation = 'portrait', cover = false }) {
  return (
    <Page size={size} orientation={orientation} style={cover ? styles.coverPage : styles.page}>
      <Header model={model} />
      {children}
      <Footer model={model} />
    </Page>
  );
}

function MetaCard({ label, value }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{safe(value)}</Text>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{safe(value, '0')}</Text>
    </View>
  );
}

function CoverPage({ model }) {
  const filters = model?.meta?.filters || {};
  return (
    <ReportPage model={model} cover>
      <View style={styles.coverBand}>
        <Text style={styles.coverTitle}>Official Evaluation Report</Text>
        <Text style={styles.coverSubtitle}>Course & Teaching Evaluation System</Text>
        <Text style={styles.coverKicker}>Enterprise university analytics / confidential</Text>
      </View>
      <View style={{ marginTop: 34 }}>
        <View style={styles.grid}>
          <MetaCard label="Academic Year" value={filters.academicYear || 'All'} />
          <MetaCard label="Semester" value={filters.semester || 'All'} />
          <MetaCard label="Faculty" value={filters.faculty || filters.facultyId || 'All Faculties'} />
          <MetaCard label="Department" value={filters.department || filters.departmentId || 'All Departments'} />
          <MetaCard label="Generated Date" value={formatDate(model?.meta?.generatedAt)} />
          <MetaCard label="Generated By" value={model?.meta?.generatedBy} />
        </View>
      </View>
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Report Scope</Text>
        <Text style={styles.paragraph}>
          This printable document is generated from the same shared report object used by the interactive Reports dashboard.
          It includes university statistics, rankings, participation, attendance, recommendation, comparison charts, and student evaluation status for the selected filters.
        </Text>
      </View>
    </ReportPage>
  );
}

function ExecutiveSummary({ model }) {
  const report = model.report || {};
  const participation = model.participation || { totals: {} };
  const derived = model.derived || {};
  return (
    <ReportPage model={model}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.grid}>
        <Stat label="Average Lecturer Score" value={report.averageLecturerScore || 0} />
        <Stat label="Average Course Score" value={report.averageCourseScore || 0} />
        <Stat label="Participation Rate" value={`${participation.totals?.participationRate || 0}%`} />
        <Stat label="Total Submissions" value={report.totalSubmissions || 0} />
        <Stat label="Evaluated Students" value={participation.totals?.evaluated || 0} />
        <Stat label="Not Evaluated" value={participation.totals?.notEvaluated || 0} />
        <Stat label="Attendance Rate" value={`${derived.attendanceRate || 0}%`} />
        <Stat label="Recommendation Rate" value={`${derived.recommendationRate || 0}%`} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Best and Worst Performance</Text>
        <View style={styles.calloutRow}>
          <Callout label="Best Department" value={report.bestDepartment?.name} />
          <Callout label="Worst Department" value={report.worstDepartment?.name} bad />
        </View>
        <View style={styles.calloutRow}>
          <Callout label="Best Faculty" value={report.bestFaculty?.name} />
          <Callout label="Worst Faculty" value={report.worstFaculty?.name} bad />
        </View>
        <View style={styles.calloutRow}>
          <Callout label="Best Class" value={report.bestClass?.name} />
          <Callout label="Worst Class" value={report.worstClass?.name} bad />
        </View>
        <View style={styles.calloutRow}>
          <Callout label="Best Lecturer" value={derived.bestLecturer?.name || report.bestLecturer?.teacher} />
          <Callout label="Worst Lecturer" value={derived.worstLecturer?.name || report.worstLecturer?.teacher} bad />
        </View>
        <View style={styles.calloutRow}>
          <Callout label="Best Course" value={derived.bestCourse?.name || report.bestCourse?.course} />
          <Callout label="Worst Course" value={derived.worstCourse?.name || report.worstCourse?.course} bad />
        </View>
      </View>
    </ReportPage>
  );
}

function Callout({ label, value, bad = false }) {
  return (
    <View style={[styles.callout, bad ? styles.calloutBad : null]}>
      <Text style={styles.calloutLabel}>{label}</Text>
      <Text style={styles.calloutValue}>{safe(value)}</Text>
    </View>
  );
}

function PdfBarChart({ title, rows = [], color = green }) {
  const topRows = rows.slice(0, 8);
  const max = Math.max(...topRows.map(scoreOf), 5);
  return (
    <View style={styles.chartPanel}>
      <Text style={styles.chartTitle}>{title}</Text>
      {topRows.length ? topRows.map((row, index) => {
        const value = scoreOf(row);
        const width = Math.max(2, (value / max) * 150);
        return (
          <View key={`${title}-${nameOf(row)}-${index}`} style={styles.chartRow}>
            <Text style={styles.chartLabel}>{nameOf(row)}</Text>
            <Svg width={154} height={9}>
              <Rect x="0" y="1" width="150" height="7" fill="#eef2f7" />
              <Rect x="0" y="1" width={width} height="7" fill={color} />
            </Svg>
            <Text style={styles.chartValue}>{value.toFixed(2)}</Text>
          </View>
        );
      }) : <Text style={styles.paragraph}>No chart data available for the selected filters.</Text>}
    </View>
  );
}

function ChartsPage({ model }) {
  const report = model.report || {};
  return (
    <ReportPage model={model} orientation="landscape">
      <Text style={styles.sectionTitle}>Printable Analytics Charts</Text>
      <Text style={styles.sectionSubtitle}>PDF-optimized vector chart views generated from the shared report model.</Text>
      <View style={styles.chartGrid}>
        <PdfBarChart title="Faculty Comparison" rows={report.facultyComparison || []} color={green} />
        <PdfBarChart title="Department Comparison" rows={report.departmentComparison || []} color={blue} />
        <PdfBarChart title="Class Comparison" rows={report.classComparison || []} color={gold} />
        <PdfBarChart title="Course Comparison" rows={report.courseSatisfaction || []} color={red} />
        <PdfBarChart title="Lecturer Ranking" rows={report.lecturerRanking || []} color={blue} />
        <PdfBarChart title="Participation Trend" rows={model.derived?.evaluationTrend || []} color={green} />
      </View>
    </ReportPage>
  );
}

function RankingTablePage({ model }) {
  const report = model.report || {};
  return (
    <ReportPage model={model} orientation="landscape">
      <Text style={styles.sectionTitle}>Rankings</Text>
      <View style={styles.chartGrid}>
        <RankingTable title="Department Ranking" rows={rankRows(report.departmentComparison || [])} />
        <RankingTable title="Faculty Ranking" rows={rankRows(report.facultyComparison || [])} />
        <RankingTable title="Class Ranking" rows={rankRows(report.classComparison || [])} />
        <RankingTable title="Course Ranking" rows={rankRows(report.courseSatisfaction || [])} />
        <RankingTable title="Lecturer Ranking" rows={rankRows(report.lecturerRanking || [])} />
      </View>
    </ReportPage>
  );
}

function RankingTable({ title, rows }) {
  return (
    <View style={styles.chartPanel}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: '14%' }]}>Rank</Text>
          <Text style={[styles.th, { width: '54%' }]}>Name</Text>
          <Text style={[styles.th, { width: '16%' }]}>Average</Text>
          <Text style={[styles.th, { width: '16%' }]}>Submissions</Text>
        </View>
        {rows.slice(0, 10).map((row, index) => (
          <View key={`${title}-${row.name}-${index}`} wrap={false} style={[styles.tableRow, index % 2 ? styles.tableRowAlt : null]}>
            <Text style={[styles.td, { width: '14%' }]}>{row.rank}</Text>
            <Text style={[styles.td, { width: '54%' }]}>{row.name}</Text>
            <Text style={[styles.td, { width: '16%' }]}>{row.average}</Text>
            <Text style={[styles.td, { width: '16%' }]}>{row.submissions}</Text>
          </View>
        ))}
        {!rows.length ? <Text style={styles.td}>No ranking data available.</Text> : null}
      </View>
    </View>
  );
}

function ParticipationPages({ model }) {
  const rows = model.participation?.rows || [];
  return chunk(rows, 18).map((pageRows, pageIndex) => (
    <ReportPage key={`participation-${pageIndex}`} model={model} orientation="landscape">
      <Text style={styles.sectionTitle}>Student Evaluation Status</Text>
      <Text style={styles.sectionSubtitle}>Page {pageIndex + 1} of {chunk(rows, 18).length}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: '12%' }]}>Student ID</Text>
          <Text style={[styles.th, { width: '18%' }]}>Student</Text>
          <Text style={[styles.th, { width: '14%' }]}>Faculty</Text>
          <Text style={[styles.th, { width: '15%' }]}>Department</Text>
          <Text style={[styles.th, { width: '9%' }]}>Class</Text>
          <Text style={[styles.th, { width: '12%' }]}>Course</Text>
          <Text style={[styles.th, { width: '8%' }]}>Status</Text>
          <Text style={[styles.th, { width: '6%' }]}>Attend.</Text>
          <Text style={[styles.th, { width: '6%' }]}>Recom.</Text>
        </View>
        {pageRows.map((row, index) => (
          <View key={`${row.assignmentId}-${row.studentId}-${index}`} wrap={false} style={[styles.tableRow, index % 2 ? styles.tableRowAlt : null]}>
            <Text style={[styles.td, { width: '12%' }]}>{safe(row.studentId)}</Text>
            <Text style={[styles.td, { width: '18%' }]}>{safe(row.studentName)}</Text>
            <Text style={[styles.td, { width: '14%' }]}>{safe(row.faculty)}</Text>
            <Text style={[styles.td, { width: '15%' }]}>{safe(row.department)}</Text>
            <Text style={[styles.td, { width: '9%' }]}>{safe(row.className)}</Text>
            <Text style={[styles.td, { width: '12%' }]}>{safe(row.courseCode)}</Text>
            <Text style={[styles.td, { width: '8%' }]}>{row.status === 'evaluated' ? 'Evaluated' : 'Pending'}</Text>
            <Text style={[styles.td, { width: '6%' }]}>{safe(row.attendanceRate, '-')}</Text>
            <Text style={[styles.td, { width: '6%' }]}>{safe(row.recommendation, '-')}</Text>
          </View>
        ))}
        {!pageRows.length ? <Text style={styles.td}>No student participation rows available for the selected filters.</Text> : null}
      </View>
    </ReportPage>
  ));
}

function ConclusionPage({ model }) {
  const report = model.report || {};
  const participation = model.participation || { totals: {} };
  const participationRate = participation.totals?.participationRate || 0;
  const averageRating = report.averageCourseScore || 0;
  const conclusion = participationRate >= 70 && averageRating >= 4
    ? 'The selected scope shows strong evaluation participation and high course satisfaction. Continued monitoring should focus on maintaining response quality and sharing the practices of top-ranked departments, faculties, classes, lecturers, and courses.'
    : 'The selected scope requires focused follow-up. Priority actions should improve participation, investigate low-ranked academic units, and review course and lecturer feedback patterns before the next evaluation cycle.';
  return (
    <ReportPage model={model}>
      <Text style={styles.sectionTitle}>Recommendations and Conclusion</Text>
      <View style={styles.panel}>
        <Text style={styles.paragraph}>{conclusion}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Recommended Actions</Text>
        <Text style={styles.paragraph}>1. Review the lowest-ranked department, faculty, class, lecturer, and course with the responsible academic leadership.</Text>
        <Text style={styles.paragraph}>2. Follow up with pending students to improve evaluation completion and response rate.</Text>
        <Text style={styles.paragraph}>3. Compare attendance and recommendation trends against course satisfaction before approving final academic quality actions.</Text>
        <Text style={styles.paragraph}>4. Preserve top-performing teaching practices and use them as benchmarks for future evaluation cycles.</Text>
      </View>
      <View style={{ marginTop: 18 }}>
        <Svg width="520" height="1">
          <Line x1="0" y1="0" x2="520" y2="0" stroke="#dbe3ea" strokeWidth="1" />
        </Svg>
        <Text style={{ marginTop: 8, fontSize: 8, color: muted }}>End of official Hormuud University evaluation report.</Text>
      </View>
    </ReportPage>
  );
}

export default function ReportPDF({ model }) {
  const safeModel = model || { meta: {}, report: {}, participation: { rows: [], totals: {} }, derived: {} };
  return (
    <Document title="Hormuud University Official Evaluation Report" author="Hormuud University CTES">
      <CoverPage model={safeModel} />
      <ExecutiveSummary model={safeModel} />
      <ChartsPage model={safeModel} />
      <RankingTablePage model={safeModel} />
      <ParticipationPages model={safeModel} />
      <ConclusionPage model={safeModel} />
    </Document>
  );
}
