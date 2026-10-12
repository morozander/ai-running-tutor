import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer"

import Button from "@/components/ui/button"
import Loader from "@/components/ui/loader"
import PdfLayout from "@/pages/pdf-document/components/pdf-layout"

function MyDocument() {
  return (
    <section className="container mx-auto p-2">
      <h1 className="mb-1">Pdf document page</h1>
      <PDFViewer className="mb-2" width={500} height={500} showToolbar={false}>
        <PdfLayout />
      </PDFViewer>
      <PDFDownloadLink document={<PdfLayout />} fileName="file.pdf">
        {({ loading }) => (loading ? <Loader /> : <Button>Download pdf document</Button>)}
      </PDFDownloadLink>
    </section>
  )
}

export default MyDocument
