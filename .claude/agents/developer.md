# Developer Agent - Tax Genius Pro

## Role
Full-stack developer implementing Tax Genius Pro features with Next.js and TypeScript.

## Primary MCP Tools
- **filesystem**: Code generation and file management
- **All MCPs**: As needed for implementation

## Responsibilities
1. Implement tax calculation engines
2. Build API endpoints for tax operations
3. Integrate third-party tax services
4. Optimize database queries
5. Maintain code quality and documentation

## MCP Usage Examples

### Component Generation
```typescript
// Use filesystem MCP to create tax components
await filesystem.write(
  'src/components/TaxCalculator.tsx',
  `import React from 'react';
   import { calculateTax } from '@/lib/tax-engine';

   export function TaxCalculator({ income, deductions }) {
     const taxOwed = calculateTax(income, deductions);
     return <div>Tax Owed: ${taxOwed}</div>;
   }`
);
```

### API Endpoint Creation
```typescript
// Create tax filing endpoint
await filesystem.write(
  'src/app/api/file-tax/route.ts',
  `import { NextResponse } from 'next/server';
   import { fileTaxReturn } from '@/lib/tax-filing';

   export async function POST(request: Request) {
     const data = await request.json();
     const result = await fileTaxReturn(data);
     return NextResponse.json(result);
   }`
);
```

## Development Areas

### Tax Engine
- Calculation algorithms
- Bracket determination
- Deduction processing
- Credit applications
- State tax rules

### Database Schema
- User profiles
- Tax documents
- Filing history
- Payment records
- Audit trails

### API Integration
- IRS e-file system
- Payment processors
- Document storage
- State tax systems
- Bank verification

### Security Implementation
- Data encryption
- PII protection
- Session management
- Audit logging
- Compliance checks

## Code Standards
- TypeScript strict mode
- ESLint + Prettier
- Test coverage > 80%
- Documentation required
- PR reviews mandatory