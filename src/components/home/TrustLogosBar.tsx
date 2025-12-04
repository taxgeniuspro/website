'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

// IRS E-File Badge
const IRSBadge = () => (
  <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" rx="4" fill="#003D7A"/>
    <path d="M20 15 L30 15 L30 45 L20 45 Z" fill="#E31C3D"/>
    <path d="M35 22 L42 15 L45 18 L38 25 L45 32 L42 35 L35 28 Z" fill="white"/>
    <path d="M48 25 L55 25 L55 28 L48 28 Z" fill="white"/>
    <text x="50" y="46" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">IRS E-FILE</text>
    <circle cx="80" cy="20" r="8" fill="#4CBB17"/>
    <path d="M77 20 L79 22 L83 18" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

// BBB Badge
const BBBBadge = () => (
  <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" rx="4" fill="#0066B2"/>
    <circle cx="30" cy="30" r="18" fill="white"/>
    <text x="30" y="25" fill="#0066B2" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">BBB</text>
    <text x="30" y="38" fill="#0066B2" fontSize="6" textAnchor="middle" fontFamily="Arial, sans-serif">A+</text>
    <text x="70" y="32" fill="white" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">Accredited</text>
    <text x="70" y="42" fill="white" fontSize="7" textAnchor="middle" fontFamily="Arial, sans-serif">Business</text>
  </svg>
);

// CPA Board Badge
const CPABadge = () => (
  <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" rx="4" fill="#1A4D2E"/>
    <circle cx="30" cy="30" r="16" fill="#FFD700" stroke="#DAA520" strokeWidth="2"/>
    <path d="M30 18 L33 26 L41 26 L35 31 L37 39 L30 34 L23 39 L25 31 L19 26 L27 26 Z" fill="#1A4D2E"/>
    <text x="68" y="28" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">STATE CPA</text>
    <text x="68" y="38" fill="#FFD700" fontSize="7" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">BOARD</text>
    <text x="68" y="46" fill="white" fontSize="6" textAnchor="middle" fontFamily="Arial, sans-serif">Certified</text>
  </svg>
);

// NATP Badge
const NATPBadge = () => (
  <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" rx="4" fill="#2C3E50"/>
    <rect x="15" y="18" width="30" height="24" rx="2" fill="#3498DB"/>
    <text x="30" y="32" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">NATP</text>
    <text x="68" y="25" fill="white" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">Member</text>
    <text x="68" y="36" fill="#3498DB" fontSize="6" textAnchor="middle" fontFamily="Arial, sans-serif">National</text>
    <text x="68" y="43" fill="#3498DB" fontSize="6" textAnchor="middle" fontFamily="Arial, sans-serif">Association of</text>
    <text x="68" y="50" fill="#3498DB" fontSize="6" textAnchor="middle" fontFamily="Arial, sans-serif">Tax Professionals</text>
  </svg>
);

export function TrustLogosBar() {
  const t = useTranslations('home.trustBadges');

  const badges = [
    { name: 'IRS E-File', Component: IRSBadge, descriptionKey: 'irsEfile' },
    { name: 'BBB Accredited', Component: BBBBadge, descriptionKey: 'bbbAccredited' },
    { name: 'State CPA Board', Component: CPABadge, descriptionKey: 'cpaBoardCertified' },
    { name: 'NATP Member', Component: NATPBadge, descriptionKey: 'natpMember' },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-8 border-y bg-card"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group relative"
              title={t(badge.descriptionKey)}
            >
              <div className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <badge.Component />
              </div>
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {t(badge.descriptionKey)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
