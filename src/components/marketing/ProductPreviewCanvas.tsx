'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export type ProductType = 'business_card' | 'postcard' | 'door_hanger' | 'poster';

interface ProductPreviewCanvasProps {
  productType: ProductType;
  userData: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    professionalTitle?: string;
    phone?: string;
    email?: string;
    website?: string;
    publicAddress?: string;
    qrCodeLogoUrl?: string;
  };
  qrCodeUrl?: string;
  className?: string;
}

export function ProductPreviewCanvas({
  productType,
  userData,
  qrCodeUrl,
  className = '',
}: ProductPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    renderPreview();
  }, [productType, userData, qrCodeUrl]);

  const renderPreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRendering(true);
    setError(null);

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size based on product type (scaled down for preview)
      const dimensions = getCanvasDimensions(productType);
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render based on product type
      switch (productType) {
        case 'business_card':
          await renderBusinessCard(ctx, canvas, userData, qrCodeUrl);
          break;
        case 'postcard':
          await renderPostcard(ctx, canvas, userData, qrCodeUrl);
          break;
        case 'door_hanger':
          await renderDoorHanger(ctx, canvas, userData, qrCodeUrl);
          break;
        case 'poster':
          await renderPoster(ctx, canvas, userData, qrCodeUrl);
          break;
      }

      setIsRendering(false);
    } catch (err) {
      console.error('Error rendering preview:', err);
      setError('Failed to render preview');
      setIsRendering(false);
    }
  };

  const getCanvasDimensions = (type: ProductType) => {
    switch (type) {
      case 'business_card':
        return { width: 350, height: 200 }; // 3.5" x 2" scaled up
      case 'postcard':
        return { width: 600, height: 400 }; // 6" x 4" scaled up
      case 'door_hanger':
        return { width: 350, height: 850 }; // 3.5" x 8.5"
      case 'poster':
        return { width: 450, height: 600 }; // 18" x 24" aspect ratio
      default:
        return { width: 400, height: 300 };
    }
  };

  const renderBusinessCard = async (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    userData: ProductPreviewCanvasProps['userData'],
    qrCodeUrl?: string
  ) => {
    const { width, height } = canvas;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Left side - Profile photo or logo
    if (userData.qrCodeLogoUrl) {
      try {
        const img = await loadImage(userData.qrCodeLogoUrl);
        const photoSize = 120;
        const photoX = 30;
        const photoY = (height - photoSize) / 2;

        // Draw circular photo
        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        ctx.restore();

        // White border around photo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error('Failed to load profile photo:', err);
      }
    }

    // Right side - Text information
    const textX = 170;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    // Name
    ctx.font = 'bold 24px Arial';
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    ctx.fillText(fullName, textX, 50);

    // Title
    if (userData.professionalTitle) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#e0e7ff';
      ctx.fillText(userData.professionalTitle, textX, 75);
    }

    // Company name
    if (userData.companyName) {
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(userData.companyName, textX, 100);
    }

    // Contact info
    ctx.font = '12px Arial';
    ctx.fillStyle = '#e0e7ff';
    let yOffset = 125;

    if (userData.phone) {
      ctx.fillText(`📞 ${userData.phone}`, textX, yOffset);
      yOffset += 18;
    }

    if (userData.email) {
      ctx.fillText(`✉️ ${userData.email}`, textX, yOffset);
      yOffset += 18;
    }

    // QR Code
    if (qrCodeUrl) {
      try {
        const qrImg = await loadImage(qrCodeUrl);
        const qrSize = 60;
        const qrX = width - qrSize - 15;
        const qrY = height - qrSize - 15;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // QR label
        ctx.font = '9px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Scan Me', qrX + qrSize / 2, qrY - 5);
      } catch (err) {
        console.error('Failed to load QR code:', err);
      }
    }
  };

  const renderPostcard = async (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    userData: ProductPreviewCanvasProps['userData'],
    qrCodeUrl?: string
  ) => {
    const { width, height } = canvas;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Center content
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Large heading
    ctx.font = 'bold 36px Arial';
    ctx.fillText('Tax Preparation Services', width / 2, 60);

    // Profile photo
    if (userData.qrCodeLogoUrl) {
      try {
        const img = await loadImage(userData.qrCodeLogoUrl);
        const photoSize = 150;
        const photoX = (width - photoSize) / 2;
        const photoY = 90;

        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        ctx.restore();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error('Failed to load profile photo:', err);
      }
    }

    // Name and title
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    ctx.font = 'bold 28px Arial';
    ctx.fillText(fullName, width / 2, 280);

    if (userData.professionalTitle) {
      ctx.font = '18px Arial';
      ctx.fillStyle = '#e0e7ff';
      ctx.fillText(userData.professionalTitle, width / 2, 310);
    }

    // Contact info box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(50, 330, width - 100, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    let yOffset = 355;

    if (userData.phone) {
      ctx.fillText(`📞 ${userData.phone}`, width / 2, yOffset);
      yOffset += 20;
    }

    if (userData.email) {
      ctx.fillText(`✉️ ${userData.email}`, width / 2, yOffset);
    }

    // QR code at bottom
    if (qrCodeUrl) {
      try {
        const qrImg = await loadImage(qrCodeUrl);
        const qrSize = 80;
        const qrX = (width - qrSize) / 2;
        const qrY = height - qrSize - 20;

        // White background for QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch (err) {
        console.error('Failed to load QR code:', err);
      }
    }
  };

  const renderDoorHanger = async (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    userData: ProductPreviewCanvasProps['userData'],
    qrCodeUrl?: string
  ) => {
    const { width, height } = canvas;

    // Background
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, width, height);

    // Hanger hole at top
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width / 2, 40, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.arc(width / 2, 40, 20, 0, Math.PI * 2);
    ctx.fill();

    // Main content area
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Headline
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Need Tax Help?', width / 2, 120);

    // Profile photo
    if (userData.qrCodeLogoUrl) {
      try {
        const img = await loadImage(userData.qrCodeLogoUrl);
        const photoSize = 120;
        const photoX = (width - photoSize) / 2;
        const photoY = 140;

        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        ctx.restore();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error('Failed to load profile photo:', err);
      }
    }

    // Name
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fullName, width / 2, 300);

    if (userData.professionalTitle) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#e0e7ff';
      ctx.fillText(userData.professionalTitle, width / 2, 325);
    }

    // Services section
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Services Offered:', width / 2, 370);

    ctx.font = '14px Arial';
    ctx.fillText('• Tax Preparation', width / 2, 395);
    ctx.fillText('• Tax Planning', width / 2, 415);
    ctx.fillText('• IRS Representation', width / 2, 435);
    ctx.fillText('• Bookkeeping', width / 2, 455);

    // Contact section
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(20, 480, width - 40, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Contact Me Today!', width / 2, 510);

    ctx.font = '14px Arial';
    let yOffset = 535;

    if (userData.phone) {
      ctx.fillText(`📞 ${userData.phone}`, width / 2, yOffset);
      yOffset += 22;
    }

    if (userData.email) {
      ctx.fillText(`✉️ ${userData.email}`, width / 2, yOffset);
      yOffset += 22;
    }

    if (userData.website) {
      ctx.fillText(`🌐 ${userData.website}`, width / 2, yOffset);
    }

    // QR code at bottom
    if (qrCodeUrl) {
      try {
        const qrImg = await loadImage(qrCodeUrl);
        const qrSize = 120;
        const qrX = (width - qrSize) / 2;
        const qrY = height - qrSize - 60;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Scan for More Info', width / 2, height - 30);
      } catch (err) {
        console.error('Failed to load QR code:', err);
      }
    }
  };

  const renderPoster = async (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    userData: ProductPreviewCanvasProps['userData'],
    qrCodeUrl?: string
  ) => {
    const { width, height } = canvas;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';

    // Large headline
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Expert Tax Services', width / 2, 70);

    // Profile photo
    if (userData.qrCodeLogoUrl) {
      try {
        const img = await loadImage(userData.qrCodeLogoUrl);
        const photoSize = 180;
        const photoX = (width - photoSize) / 2;
        const photoY = 100;

        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        ctx.restore();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error('Failed to load profile photo:', err);
      }
    }

    // Name
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    ctx.font = 'bold 36px Arial';
    ctx.fillText(fullName, width / 2, 330);

    if (userData.professionalTitle) {
      ctx.font = '22px Arial';
      ctx.fillStyle = '#e0e7ff';
      ctx.fillText(userData.professionalTitle, width / 2, 365);
    }

    if (userData.companyName) {
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(userData.companyName, width / 2, 395);
    }

    // Services
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Full-Service Tax Preparation', width / 2, 440);

    ctx.font = '16px Arial';
    const services = [
      '✓ Individual & Business Tax Returns',
      '✓ Tax Planning & Consultation',
      '✓ IRS Audit Representation',
      '✓ Bookkeeping Services',
    ];

    let yOffset = 470;
    services.forEach((service) => {
      ctx.fillText(service, width / 2, yOffset);
      yOffset += 25;
    });

    // Contact box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(30, height - 130, width - 60, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Schedule Your Appointment Today!', width / 2, height - 95);

    ctx.font = '14px Arial';
    yOffset = height - 68;

    if (userData.phone) {
      ctx.fillText(`Phone: ${userData.phone}`, width / 2, yOffset);
      yOffset += 20;
    }

    if (userData.email) {
      ctx.fillText(`Email: ${userData.email}`, width / 2, yOffset);
      yOffset += 20;
    }

    if (userData.website) {
      ctx.fillText(userData.website, width / 2, yOffset);
    }

    // QR code
    if (qrCodeUrl) {
      try {
        const qrImg = await loadImage(qrCodeUrl);
        const qrSize = 100;
        const qrX = width - qrSize - 20;
        const qrY = height - qrSize - 20;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText('SCAN', width - 25, height - qrSize - 25);
      } catch (err) {
        console.error('Failed to load QR code:', err);
      }
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto border rounded-lg shadow-md"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
