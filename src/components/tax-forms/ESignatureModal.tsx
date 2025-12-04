'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Eraser, Upload, Pen, Type } from 'lucide-react';
import { toast } from 'sonner';

interface ESignatureModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess?: () => void;
}

export function ESignatureModal({ open, onClose, token, onSuccess }: ESignatureModalProps) {
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed' | 'uploaded'>('drawn');
  const [signatureData, setSignatureData] = useState('');
  const [typedName, setTypedName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        setSignatureData(dataUrl);
      }
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  // Handle typed signature
  const handleTypedChange = (name: string) => {
    setTypedName(name);
    
    // Generate image from text
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '32px "Brush Script MT", cursive';
      ctx.fillStyle = '#000';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 20, 50);
      
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploadedFile(file);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!signatureData) {
      setError('Please provide a signature');
      return;
    }

    if (!consent) {
      setError('Please agree to the terms');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const consentText = `I agree that my ${signatureType} signature is legally binding and represents my approval of this tax form.`;

      const response = await fetch(`/api/shared-forms/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureData,
          signatureType,
          consentText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit signature');
      }

      toast.success('Form signed successfully', {
        description: 'Your signature has been recorded',
      });

      onSuccess?.();
      handleClose();
    } catch (error: any) {
      setError(error.message);
      toast.error('Failed to sign form', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    clearCanvas();
    setTypedName('');
    setUploadedFile(null);
    setSignatureData('');
    setConsent(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>E-Signature</DialogTitle>
          <DialogDescription>
            Sign this form electronically. Your signature will be legally binding.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="drawn" className="gap-2">
              <Pen className="h-4 w-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="typed" className="gap-2">
              <Type className="h-4 w-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Draw signature */}
          <TabsContent value="drawn" className="space-y-4">
            <div className="space-y-2">
              <Label>Draw your signature below</Label>
              <Card>
                <CardContent className="p-0">
                  <canvas
                    ref={canvasRef}
                    width={550}
                    height={200}
                    className="w-full border rounded cursor-crosshair touch-none bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </CardContent>
              </Card>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="gap-2"
              >
                <Eraser className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </TabsContent>

          {/* Type signature */}
          <TabsContent value="typed" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typedName">Type your full name</Label>
              <Input
                id="typedName"
                value={typedName}
                onChange={(e) => handleTypedChange(e.target.value)}
                placeholder="John Doe"
                className="text-lg"
              />
              {signatureData && (
                <Card>
                  <CardContent className="p-4">
                    <img src={signatureData} alt="Signature preview" className="h-16" />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Upload signature */}
          <TabsContent value="uploaded" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileUpload">Upload signature image</Label>
              <Input
                id="fileUpload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPG, PNG, GIF (max 5MB)
              </p>
              {signatureData && (
                <Card>
                  <CardContent className="p-4">
                    <img src={signatureData} alt="Signature preview" className="max-h-32" />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Consent */}
        <div className="flex items-start space-x-2 pt-4">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked as boolean)}
          />
          <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
            I agree that my {signatureType} signature is legally binding and represents my 
            approval of this tax form. I understand that this signature has the same legal 
            effect as a handwritten signature.
          </Label>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            disabled={!signatureData || !consent}
          >
            Sign Form
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
