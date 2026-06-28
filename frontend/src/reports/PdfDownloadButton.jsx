import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileDown } from 'lucide-react';
import ReportPDF from './ReportPDF';

export default function PdfDownloadButton({ model, fileName }) {
  return (
    <PDFDownloadLink className="btn-primary" document={<ReportPDF model={model} />} fileName={fileName}>
      {({ loading }) => (
        <>
          <FileDown size={16} />
          {loading ? 'Preparing PDF' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  );
}
