-- Get all profiles that need QR code regeneration
SELECT
  p.id,
  u.name,
  u.email,
  COALESCE(p."customTrackingCode", p."trackingCode") as active_code,
  CASE WHEN p."trackingCodeQRUrl" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_qr,
  LENGTH(p."trackingCodeQRUrl") as qr_size,
  p."qrCodeLogoUrl" as custom_logo
FROM profiles p
JOIN users u ON p."userId" = u.id
WHERE p."trackingCode" IS NOT NULL OR p."customTrackingCode" IS NOT NULL
ORDER BY u.name;
