import React, { useState, useRef } from 'react';
import { Download, QrCode, User, Palette } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface QRPosterGeneratorProps {
  referralUrl: string;
  referrerName?: string;
}

interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  className: string;
}

const posterTemplates: PosterTemplate[] = [
  {
    id: 'professional',
    name: 'Tangerine Professional',
    description: 'Clean professional design with tangerine theme',
    className: 'bg-primary text-primary-foreground',
  },
  {
    id: 'modern',
    name: 'Modern Purple',
    description: 'Fresh modern design with purple accents',
    className: 'bg-gradient-to-br from-accent to-accent-foreground text-foreground',
  },
];

export const QRPosterGenerator: React.FC<QRPosterGeneratorProps> = ({
  referralUrl,
  referrerName = 'Your Name',
}) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState(posterTemplates[0].id);
  const [customName, setCustomName] = useState(referrerName);
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const selectedTemplateData =
    posterTemplates.find((t) => t.id === selectedTemplate) || posterTemplates[0];

  const generatePDF = async () => {
    if (!posterRef.current) return;

    setIsGenerating(true);
    try {
      // Create canvas from the poster element
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        width: 600,
        height: 800,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [600, 800],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 600, 800);

      // Download the PDF
      const fileName = `tax-genius-poster-${customName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Success!',
        description: 'Your poster has been generated and downloaded.',
      });
    } catch (error) {
      logger.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate poster. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const PosterPreview = () => (
    <div
      ref={posterRef}
      className={`w-full h-full flex flex-col items-center justify-center p-8 ${selectedTemplateData.className}`}
      style={{ width: '600px', height: '800px' }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-4">TAX GENIUS</h1>
        <p className="text-xl opacity-90">Professional Tax Preparation</p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <QRCodeSVG
          value={referralUrl}
          size={200}
          bgColor="white"
          fgColor="currentColor"
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Referrer Info */}
      <div className="text-center mb-8">
        <p className="text-2xl font-semibold mb-2">Referred by:</p>
        <p className="text-3xl font-bold">{customName}</p>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-4">
        <p className="text-xl font-medium">Scan to get started!</p>
        <div className="space-y-2">
          <p className="text-lg">✓ Expert tax preparation</p>
          <p className="text-lg">✓ Maximum refund guarantee</p>
          <p className="text-lg">✓ Fast & secure filing</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto text-center">
        <p className="text-sm opacity-75">www.taxgenius.com</p>
      </div>
    </div>
  );

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Poster Generator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create professional marketing posters with your referral QR code for offline promotion
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referrer-name">Your Name</Label>
              <Input
                id="referrer-name"
                placeholder="Enter your name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-3">
              <Label>Choose Template</Label>
              <RadioGroup
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                className="space-y-2"
              >
                {posterTemplates.map((template) => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={template.id} id={template.id} />
                    <Label htmlFor={template.id} className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Referral URL</Label>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm break-all">{referralUrl}</code>
              </div>
            </div>

            <Button
              onClick={generatePDF}
              disabled={isGenerating || !customName.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Poster (PDF)
                </>
              )}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border border-border rounded-lg overflow-hidden">
              <div
                className="transform scale-50 origin-top-left"
                style={{ width: '1200px', height: '1600px' }}
              >
                <PosterPreview />
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            How to Use Your Poster
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Print the poster in high quality (recommended: 8.5" x 11" or A4)</li>
            <li>• Display in local businesses, offices, or community centers</li>
            <li>• People can scan the QR code with their phone to visit your referral link</li>
            <li>• Track your offline referrals through the dashboard analytics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRPosterGenerator;
