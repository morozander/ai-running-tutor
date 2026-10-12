import { Document, Page, Text, View } from "@react-pdf/renderer"

const sectionStyles = {
  margin: 10,
  padding: 10,
  flexGrow: 1,
}

function PdfLayout() {
  return (
    <Document>
      <Page
        size="A4"
        style={{
          flexDirection: "row",
          backgroundColor: "#E4E4E4",
        }}
      >
        <View style={sectionStyles}>
          <Text>Section #1</Text>
          <Text>text</Text>
        </View>
        <View style={sectionStyles}>
          <Text>Section #2</Text>
        </View>
      </Page>
    </Document>
  )
}

export default PdfLayout
