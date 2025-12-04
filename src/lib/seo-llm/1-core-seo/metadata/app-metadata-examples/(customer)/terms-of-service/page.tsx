import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Effective Date: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                By accessing or using GangRun Printing's services, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use our
                services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                GangRun Printing provides custom printing services including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Business cards, flyers, and brochures</li>
                <li>Banners and signage</li>
                <li>Stickers and labels</li>
                <li>Apparel printing</li>
                <li>Custom printing solutions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Orders and Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>All orders must be paid in full before production begins</li>
                <li>Prices are subject to change without notice</li>
                <li>We accept major credit cards through our secure payment processor</li>
                <li>Custom quotes are valid for 30 days</li>
                <li>Bulk discounts may apply for large orders</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. File Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>You are responsible for ensuring your files meet our specifications:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Files must be in acceptable formats (PDF, AI, PSD, JPG, PNG)</li>
                <li>Resolution must be at least 300 DPI for print quality</li>
                <li>You must have rights to all content in your designs</li>
                <li>We are not responsible for errors in customer-provided files</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>You retain ownership of your uploaded designs</li>
                <li>You grant us license to use your files for printing and order fulfillment</li>
                <li>You warrant that you have rights to all content you submit</li>
                <li>We will not use your designs for any other purpose without permission</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Shipping and Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>Standard shipping times are 3-5 business days after production</li>
                <li>Rush services are available for additional fees</li>
                <li>We are not responsible for delays caused by shipping carriers</li>
                <li>Risk of loss transfers to you upon delivery to carrier</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Returns and Refunds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>Custom printed items are non-returnable unless defective</li>
                <li>We will reprint or refund defective items at our discretion</li>
                <li>Claims must be made within 7 days of delivery</li>
                <li>Photo evidence may be required for quality issues</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Our liability is limited to the amount paid for the specific order. We are not
                liable for indirect, incidental, or consequential damages. We are not responsible
                for errors in customer-provided content.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Prohibited Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>You may not submit content that is:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Illegal, harmful, or offensive</li>
                <li>Infringing on intellectual property rights</li>
                <li>Defamatory or discriminatory</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Modifications</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We reserve the right to modify these terms at any time. Continued use of our
                services after changes constitutes acceptance of the modified terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                These terms are governed by the laws of Texas, United States. Any disputes shall be
                resolved in the courts of Harris County, Texas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>For questions about these terms, contact us at:</p>
              <div className="mt-4">
                <p>GangRun Printing</p>
                <p>Email: legal@gangrunprinting.com</p>
                <p>Phone: 1-800-PRINTING</p>
                <p>Address: 123 Print Street, Houston, TX 77001</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
