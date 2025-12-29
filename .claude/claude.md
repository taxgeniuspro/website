# TaxGeniusPro Project Rules

## APPROVED TECH STACK (LOCKED - Dec 2025)

**Only use these packages. No exceptions without explicit approval.**

### Core
```
next, react, typescript, tailwindcss
```

### Database + Auth + Storage (Self-Hosted Supabase - HTTP API)
```
@supabase/supabase-js   # Database, Auth, Storage - ONE client
@supabase/ssr           # Server-side helpers
```

### State
```
@tanstack/react-query   # Server state + caching
zustand                 # Client state
```

### Forms
```
react-hook-form
@hookform/resolvers
zod
```

### UI
```
@radix-ui/*
lucide-react
tailwind-merge, clsx
sonner
framer-motion
next-themes
vaul
cmdk
```

### Business
```
stripe                  # Payments
nodemailer              # Email (SMTP to Postal)
@react-email/*          # Email templates
qrcode                  # QR generation
recharts                # Charts
pdf-lib                 # PDF generation
```

### Utils
```
date-fns, nanoid, sharp, next-intl
```

### AI
```
openai                  # ONE AI provider only
```

### DO NOT USE (Migrate Away From)
```
prisma                  # Use Supabase client instead (HTTP, no network issues)
next-auth               # Use Supabase Auth instead
cloudinary              # Use Supabase Storage instead
@aws-sdk/*              # Use Supabase Storage instead
resend                  # Use nodemailer instead
@google/genai           # Use openai instead
bcryptjs                # Supabase handles this
i18next                 # Use next-intl instead
socket.io, twilio, web-push, ioredis  # Not needed
```

---

# BMAD Method with MCP Integration for Tax Genius Pro

## Project Context
Tax Genius Pro - An AI-powered tax preparation platform using Next.js, TypeScript, and the approved tech stack above.

## Coolify Deployment (Self-Hosted)

TaxGeniusPro is **self-hosted on Coolify** at 72.60.28.175.

- **Coolify UUID**: `iok4s804ocwoc84c0g844oog`
- **Production Domain**: `taxgeniuspro.tax`
- **Git Repository**: `taxgeniuspro/website` (main branch auto-deploys)
- **Database**: TaxGeniusPro-Supabase (self-hosted, same VPS)

When deploying:
1. Push changes to `taxgeniuspro/website` main branch
2. Coolify auto-deploys via GitHub webhook
3. Monitor deployment in Coolify dashboard: http://72.60.28.175:8000

**Coolify API Commands:**
```bash
# Restart application
curl -X POST -H "Authorization: Bearer my-coolify-token-2025" \
  "http://72.60.28.175:8000/api/v1/applications/iok4s804ocwoc84c0g844oog/restart"

# Check status
curl -s -H "Authorization: Bearer my-coolify-token-2025" \
  "http://72.60.28.175:8000/api/v1/applications/iok4s804ocwoc84c0g844oog" | jq '.status'
```

## Available MCP Tools:

### 1. **Shadcn-UI MCP**
- **Purpose**: UI component management and installation
- **Commands**: Add, remove, and manage shadcn/ui components
- **Usage**: Building consistent UI with pre-built components

### 2. **Puppeteer MCP**
- **Purpose**: Browser automation, visual testing, screenshots
- **Commands**: Page navigation, element interaction, screenshot capture
- **Usage**: E2E testing, visual regression testing, automated browser tasks

### 3. **Firecrawl MCP**
- **Purpose**: Web scraping and data extraction
- **Commands**: Crawl websites, extract structured data
- **Usage**: Research, data gathering, competitive analysis

### 4. **Filesystem MCP**
- **Purpose**: Advanced file system operations
- **Commands**: Read, write, search, manage project files
- **Usage**: Code generation, file management, project structure

## Agent Assignments:

### **UI Designer Agent**
- Primary MCP: shadcn-ui
- Secondary: puppeteer (for visual testing)
- Focus: Component design, UI consistency, accessibility

### **QA Tester Agent**
- Primary MCP: puppeteer
- Secondary: filesystem (for test files)
- Focus: E2E testing, visual regression, test automation

### **Research Agent**
- Primary MCP: firecrawl
- Secondary: filesystem (for documentation)
- Focus: Tax law research, competitor analysis, data extraction

### **Developer Agent**
- Primary MCP: filesystem
- Secondary: All MCPs as needed
- Focus: Implementation, code generation, project structure

## Workflow Guidelines:

1. **Component Development**:
   - Use shadcn-ui MCP to add new components
   - Use puppeteer MCP to capture screenshots
   - Use filesystem MCP to organize component files

2. **Testing Workflow**:
   - Use puppeteer MCP for browser automation
   - Use filesystem MCP to manage test files
   - Capture visual snapshots for regression testing

3. **Research & Analysis**:
   - Use firecrawl MCP to gather tax-related information
   - Use filesystem MCP to store and organize research

4. **Code Generation**:
   - Use filesystem MCP for file operations
   - Use shadcn-ui MCP for UI components
   - Maintain consistent project structure

## Project-Specific Considerations:

- **Port Configuration**: Always use port 3005 for Tax Genius Pro
- **Security**: Never expose API keys or sensitive tax data
- **Compliance**: Ensure all implementations follow tax law requirements
- **Performance**: Optimize for large datasets and complex calculations

## MCP Integration Commands:

When working with MCPs in the project:
- Test MCP availability: `npx [mcp-package] --help`
- Check MCP status: Review mcp-settings.json
- Update configurations: Edit .env.mcp for API keys

## Error Handling:

If MCP tools fail:
1. Check API keys in .env.mcp
2. Verify package installation
3. Restart Cursor IDE
4. Check network connectivity
5. Review error logs in console

## Best Practices:

1. Always use the appropriate MCP for the task
2. Chain MCPs for complex workflows
3. Document MCP usage in code comments
4. Test MCP integrations before production
5. Keep API keys secure and rotate regularly

---

## Tax Preparer System - MILESTONE COMPLETED (Dec 2025)

### Overview
All 35 tax preparers are fully configured with:
- Profile pictures (avatarUrl) stored in Cloudinary
- QR codes with their picture in the center
- Short links for lead capture, intake forms, and appointments
- Tracking codes for attribution

### Profile Settings (All Preparers)
| Setting | Status |
|---------|--------|
| `avatarUrl` | ✅ Set (Cloudinary) |
| `qrCodeLogoUrl` | ✅ Set to avatar (for QR center image) |
| `usePhotoInQRCodes` | ✅ true |
| `trackingCodeFinalized` | ✅ true |
| `customTrackingCode` | ✅ Set (e.g., gw, rh, ah) |
| `shortLinkUsername` | ✅ Set |

### Marketing Links (3 per preparer = 105 total)
Each preparer has these short links:
- `{code}-lead` → `/contact?ref={code}` (Lead capture form)
- `{code}-intake` → `/start-filing/form?ref={code}` (Tax intake form)
- `{code}-appt` → `/book?preparer={id}` (Appointment booking)

### Tax Preparer Reference Table
| Name | Code | Email | Links |
|------|------|-------|-------|
| Ale Hamilton | ah | goldenprotaxes@gmail.com | /go/ah-* |
| Alicia Adams | aa | caydensmother29@gmail.com | /go/aa-* |
| Angela Richards | ar | angeladesigndocs@gmail.com | /go/ar-* |
| Anita Wilson | aw | anita@cm3mediagroup.pro | /go/aw-* |
| Brandon Hawkins | bh | busyb101@gmail.com | /go/bh-* |
| Carlton Gannaway | cg | f.alawishez@gmail.com | /go/cg-* |
| Ceia Stewart | cs | consult.me@mail.com | /go/cs-* |
| Chelsea Lowe | cl | c.mitchell.lowe@gmail.com | /go/cl-* |
| Cynthia Bacon-whitted | cbw | cbawhitted@gmail.com | /go/cbw-* |
| Derrick Stewart | ds | derrick.stewart31@yahoo.com | /go/ds-* |
| Devlin Watkins | dw | iradwatkins+dw@gmail.com | /go/dw-* |
| Devon Hamilton | dh | gxldmxb@gmail.com | /go/dh-* |
| Erica Bridges | eb | msboss110284@gmail.com | /go/eb-* |
| Gelisa White | gw | whitegelisa@gmail.com | /go/gw-* |
| Gregory Edwards | ge | gregthetaxgenius@gmail.com | /go/ge-* |
| Helen Holmes | hh | holmeshelen@yahoo.com | /go/hh-* |
| Ira Watkins | iw | iradwatkins@gmail.com | /go/iw-* |
| Iran Watkins | iw1 | iradwatkins+iw1@gmail.com | /go/iw1-* |
| Jamel Pringle | jp | melpringle38@gmail.com | /go/jp-* |
| Javarre Massey | jm | javareemassey@gmail.com | /go/jm-* |
| Katie Winborn | kw | winbornkatie@gmail.com | /go/kw-* |
| Kemnetta Pillette | kp | kpillette7@gmail.com | /go/kp-* |
| LaJuana Frost | lf | lajuanafrost@gmail.com | /go/lf-* |
| Lenore Bohanon | lb | lbohanon398@gmail.com | /go/lb-* |
| Mariah Johnson | mj | msj1solution@gmail.com | /go/mj-* |
| Michael Finley | mf | mrmikefinley@gmail.com | /go/mf-* |
| Owliver Owl | ow | taxgenius.tax@gmail.com | /go/ow-* |
| Pamela Johnson | pj | pamelajatl3@gmail.com | /go/pj-* |
| Ray Hamilton | rh | rhamiltonfirm@gmail.com | /go/rh-* |
| Sarah Wilson | sw | hest8133@bellsouth.net | /go/sw-* |
| Shakia JGibbs | sj | shakiragibbs12@gmail.com | /go/sj-* |
| Tiffany & Jakobe Pearson | tp | jakobepearson18@gmail.com | /go/tp-* |
| Trevor Wikerson | tw | tjbw2005@gmail.com | /go/tw-* |
| Wendy Casimir | wc | wendycasimir@gmail.com | /go/wc-* |
| Yaumar Williams | yw | yaumarwilliams@gmail.com | /go/yw-* |

### QR Code Generation
QR codes are generated with:
- Preparer's photo in the center (from avatarUrl)
- High error correction (H level) for reliable scanning
- White border/bevel for visibility on dark backgrounds
- ~80KB PNG format stored as base64 in `qrCodeImageUrl`

### Testing Credentials
- **Gelisa White**: whitegelisa@gmail.com / Makiyah07@@
- **Iran Watkins**: iradwatkins+iw1@gmail.com / TaxPreparer2024!