# TypeScript Error Fixes - Handoff Document

**Date:** November 6, 2025
**Session Focus:** Fixing TypeScript compilation errors for production build
**Goal:** Enable strict TypeScript checking by resolving all type errors

---

## Summary

**Status:** In Progress
**Errors Fixed This Session:** 7
**Remaining Errors:** 1+ (ongoing iterative fixes)

This session continued the work of fixing TypeScript errors to achieve a clean production build with `ignoreBuildErrors: false` in next.config.ts. This is part of **Phase 3 Week 4** of the migration from Clerk to NextAuth v5.

---

## Files Fixed (7 Total)

### 1. `/src/app/api/admin/users/[userId]/route.ts`

**Errors Fixed:**
- Line 30: Next.js 15 async params pattern error
- Multiple lines: Removed non-existent `customPermissions` field references

**Changes:**
```typescript
// BEFORE (Line 7-12):
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = params;  // ❌ Error: params is a Promise

// AFTER:
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
    const resolvedParams = await params;
    const { userId } = resolvedParams;  // ✅ Correct
```

```typescript
// Removed from request body destructuring (Line 32):
const { email, firstName, lastName, role: newRole } = body;  // Removed 'permissions'

// Removed from profileData (Line 83):
if (newRole !== undefined) profileData.role = newRole;
// Removed: if (permissions !== undefined) profileData.customPermissions = permissions;

// Removed from response (Line 110):
// Removed: permissions: updatedUser!.profile?.customPermissions,
```

**Reason:** Next.js 15 changed params to be async Promises. Profile model doesn't have `customPermissions` field - permissions are role-based.

---

### 2. `/src/app/api/advances/apply/route.ts`

**Error Fixed:**
- Line 140: Zod error property name incorrect

**Changes:**
```typescript
// BEFORE:
if (error instanceof z.ZodError) {
  return NextResponse.json(
    { error: 'Invalid application data', details: error.errors },  // ❌
    { status: 400 }
  );
}

// AFTER:
if (error instanceof z.ZodError) {
  return NextResponse.json(
    { error: 'Invalid application data', details: error.issues },  // ✅
    { status: 400 }
  );
}
```

**Reason:** Zod's `ZodError` type uses `issues` property, not `errors`.

---

### 3. `/src/app/api/analytics/funnel/[userId]/route.ts`

**Error Fixed:**
- Line 44: Incorrect auth() session access pattern

**Changes:**
```typescript
// BEFORE:
const { userId: authUserId } = await auth();  // ❌ Error: Session doesn't have userId property

// AFTER:
const session = await auth();
const authUserId = session?.user?.id;  // ✅ Correct NextAuth v5 pattern
```

**Reason:** NextAuth v5 `auth()` returns `Session | null`, and user ID is at `session.user.id`, not directly destructurable.

---

### 4. `/src/app/api/applications/affiliate/route.ts` (Multiple Fixes)

**Error Fixed (Line 62):**
- `findUnique` requires unique field constraint

**Changes:**
```typescript
// BEFORE:
const existingLead = await prisma.lead.findUnique({
  where: { email: validatedData.email },  // ❌ email is not unique
});

// AFTER:
const existingLead = await prisma.lead.findFirst({
  where: { email: validatedData.email },  // ✅ findFirst works for non-unique fields
});
```

**Error Fixed (Line 105):**
- LeadType enum expects uppercase values

**Changes:**
```typescript
// BEFORE:
type: 'affiliate',  // ❌ Error: Type '"affiliate"' not assignable to LeadType

// AFTER:
type: 'AFFILIATE',  // ✅ Enum values are uppercase
```

**Error Fixed (Line 113):**
- Invalid `website` field doesn't exist in Lead model

**Changes:**
```typescript
// BEFORE:
phone: validatedData.phone,
marketingExperience: validatedData.experience,
audience: validatedData.audience,
website: validatedData.website,  // ❌ Field doesn't exist
socialMediaProfiles: validatedData.socialMedia  // ❌ Field doesn't exist
  ? JSON.stringify(validatedData.socialMedia)
  : null,

// AFTER:
phone: validatedData.phone,
marketingExperience: validatedData.experience,
audience: validatedData.audience,
// Removed: website and socialMediaProfiles fields
```

**Reason:** Lead Prisma model schema doesn't include `website` or `socialMediaProfiles` fields.

---

## Known Remaining Error

**Current Error:**
```
./src/app/api/applications/affiliate/route.ts:113:9
Type error: Object literal may only specify known properties,
and 'platforms' does not exist in type LeadCreateInput
```

**Next Step:** Remove the `platforms` field from line 113 in `/src/app/api/applications/affiliate/route.ts`

**Expected Fix:**
```typescript
// Remove this line:
platforms: validatedData.platforms?.join(', '),
```

---

## Key Patterns & Lessons Learned

### 1. **Next.js 15 Async Params Pattern**
All dynamic route handlers with `[param]` segments must use this pattern:
```typescript
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ paramName: string }> }  // Note: props, not { params }
) {
  const resolvedParams = await props.params;  // Must await
  const { paramName } = resolvedParams;
}
```

### 2. **NextAuth v5 Session Access**
```typescript
// ❌ WRONG (Clerk pattern):
const { userId } = await auth();

// ✅ CORRECT (NextAuth v5 pattern):
const session = await auth();
const userId = session?.user?.id;
```

### 3. **Prisma Field Validation**
- Always verify fields exist in Prisma schema before using in queries
- Use `findFirst` for non-unique fields, `findUnique` only for unique constraints
- Profile model does NOT have: `customPermissions`, `email` (email is on User model)
- Lead model does NOT have: `website`, `socialMediaProfiles`, `platforms`

### 4. **Enum Values**
- LeadType enum uses UPPERCASE values: `AFFILIATE`, `CLIENT`, etc.
- UserRole enum uses snake_case: `super_admin`, `tax_preparer`, etc.

### 5. **Zod Error Handling**
```typescript
if (error instanceof z.ZodError) {
  error.issues  // ✅ Correct property
  // NOT error.errors
}
```

---

## Testing Commands

```bash
# Run production build (shows all TypeScript errors):
npm run build

# The build will:
# 1. Compile successfully (~30s)
# 2. Check validity of types (~2-3 minutes)
# 3. Report any TypeScript errors with file:line references
```

---

## Migration Context

This work is part of the **Clerk → NextAuth v5 migration**:
- Previous session: Fixed ~65+ files
- This session: Fixed 7 more errors
- Remaining: Continuing iterative fixes until build succeeds

**Database Schema Reference:**
- Profile model: `/root/websites/taxgeniuspro/prisma/schema.prisma`
- Key models: User, Profile, Lead
- Permissions are role-based, NOT stored per-user

---

## Next Steps

1. **Immediate:** Fix the `platforms` field error in `applications/affiliate/route.ts:113`
2. **Continue:** Run build → identify error → fix → repeat until clean build
3. **Verify:** Once build succeeds, test critical API endpoints
4. **Deploy:** After all TypeScript errors resolved, production deployment safe

---

## Files to Watch

Files most likely to have similar issues:
- Any file with dynamic routes `[param]`
- Any file using `prisma.*.create()` or `prisma.*.update()`
- Any file accessing `auth()` or session data
- Any file with Zod validation error handling

---

## Build Logs

Recent build logs saved to:
- `/tmp/build-social-removed.log` (latest)
- `/tmp/build-website-removed.log`
- `/tmp/build-applications-fixed.log`
- `/tmp/build-analytics-fixed.log`
- `/tmp/build-advances-fixed.log`

---

## Contact / Questions

For questions about these fixes or to continue this work:
1. Review this handoff document
2. Check the latest build log in `/tmp/build-*.log`
3. Continue the iterative process: build → fix → repeat
4. Reference the Prisma schema for valid field names

**End of Handoff Document**
