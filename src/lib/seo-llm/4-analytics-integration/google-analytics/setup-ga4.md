# Google Analytics 4 Setup

## Installation

Add to your `app/layout.tsx`:

\`\`\`typescript
import Script from 'next/script'

export default function RootLayout({ children }) {
return (
<html>
<head>
<Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
<Script id="google-analytics" strategy="afterInteractive">
{`             window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
</Script>
</head>
<body>{children}</body>
</html>
)
}
\`\`\`

## Environment Variables

\`\`\`bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
\`\`\`
