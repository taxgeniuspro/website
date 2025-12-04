# Analytics Tracking Guide - Language Switcher

## Overview

The LocaleSwitcher component now includes comprehensive Google Analytics 4 (GA4) tracking to monitor language switching behavior, user preferences, and localization engagement across your TaxGeniusPro site.

---

## Analytics Events

### 1. Language Switch Event

**Event Name:** `language_switch`

**Fired When:** User changes the site language using any switcher variant

**Data Tracked:**
```typescript
{
  event_category: 'Localization',
  event_label: 'en → es',           // From → To
  from_locale: 'en',                 // Previous language
  to_locale: 'es',                   // New language
  current_page: '/en/dashboard',     // Page where switch occurred
  switch_method: 'header_dropdown',  // How they switched
  user_authenticated: true,          // Whether user is logged in
  user_role: 'CLIENT',              // User's role (if authenticated)
  value: 1
}
```

**Switch Methods:**
- `header_dropdown` - Desktop header dropdown
- `mobile_menu` - Mobile menu grid
- `footer_compact` - Footer compact button
- `custom` - Custom implementation

---

## Implementation Details

### Automatic Tracking

All LocaleSwitcher variants automatically track language switches:

```tsx
// Header (Desktop) - Tracks as "header_dropdown"
<LocaleSwitcher
  variant="dropdown"
  showLabel={false}
  trackingMethod="header_dropdown"
/>

// Mobile Menu - Tracks as "mobile_menu"
<MobileLocaleSwitcher />

// Footer - Tracks as "footer_compact"
<LocaleSwitcher
  variant="compact"
  trackingMethod="footer_compact"
/>
```

### Custom Implementation

For custom implementations, specify your own tracking method:

```tsx
<LocaleSwitcher
  variant="default"
  trackingMethod="custom"
/>
```

---

## What Gets Tracked

### User Context
- **Authentication Status** - Whether user is logged in
- **User Role** - CLIENT, TAX_PREPARER, AFFILIATE, ADMIN, LEAD
- **Current Page** - Full pathname where switch occurred
- **Switch Method** - Which UI element was used

### Language Data
- **From Locale** - Previous language (en/es)
- **To Locale** - Selected language (en/es)
- **Transition** - Visual in event_label (e.g., "en → es")

---

## GA4 Dashboard Insights

### Available Reports

#### 1. Language Preference Analysis
**Question:** Which language do users prefer?

**View:**
- Event: `language_switch`
- Dimension: `to_locale`
- Metric: Event count

**Example Query:**
```
Event name = language_switch
Group by: to_locale
```

**Insights:**
- Spanish adoption rate
- Language preference by user type
- Growth of Spanish users over time

---

#### 2. Switcher Usage by Location
**Question:** Where do users switch languages?

**View:**
- Event: `language_switch`
- Dimension: `switch_method`
- Metric: Event count

**Example Query:**
```
Event name = language_switch
Group by: switch_method
```

**Insights:**
- Header dropdown: 60%
- Mobile menu: 30%
- Footer: 10%

**Action Items:**
- Most popular: Keep prominent
- Least used: Consider repositioning or removing

---

#### 3. Page-Specific Switching
**Question:** Which pages trigger language switches?

**View:**
- Event: `language_switch`
- Dimension: `current_page`
- Metric: Event count

**Example Query:**
```
Event name = language_switch
Group by: current_page
Order by: Event count DESC
```

**Insights:**
- Homepage: High switches (users discovering site)
- Forms: Medium switches (preferring native language)
- Dashboard: Low switches (settled preference)

---

#### 4. User Role Language Preferences
**Question:** Do different user types prefer different languages?

**View:**
- Event: `language_switch`
- Dimension: `user_role`, `to_locale`
- Metric: Event count

**Example Query:**
```
Event name = language_switch
Group by: user_role, to_locale
```

**Insights:**
```
Clients: 70% Spanish, 30% English
Tax Preparers: 40% Spanish, 60% English
Affiliates: 65% Spanish, 35% English
```

---

#### 5. Mobile vs Desktop Language Switching
**Question:** How do mobile and desktop users differ?

**View:**
- Event: `language_switch`
- Dimension: `device_category`, `to_locale`
- Metric: Event count

**Example Analysis:**
```
Mobile users:
- Switch to Spanish: 75%
- Use mobile menu: 95%

Desktop users:
- Switch to Spanish: 55%
- Use header dropdown: 85%
```

---

## Custom Reports in GA4

### Report 1: Language Funnel

Track user journey after switching languages:

```
1. language_switch (en → es)
2. page_view (/es/services)
3. form_start (contact_form)
4. generate_lead
```

**GA4 Exploration:**
1. Go to Explore > Funnel exploration
2. Add steps:
   - Step 1: `language_switch`
   - Step 2: `page_view`
   - Step 3: `form_start`
   - Step 4: `generate_lead`
3. Filter by `to_locale = es`

**Insights:**
- Do Spanish speakers convert better?
- Which pages do they visit after switching?
- Drop-off points in Spanish flow

---

### Report 2: Language Stickiness

Track how often users switch back and forth:

```
User Session:
1. Load page (en)
2. Switch to Spanish (en → es)
3. View 3 pages in Spanish
4. Switch back to English (es → en)
```

**GA4 Exploration:**
1. Go to Explore > Path exploration
2. Starting point: `language_switch`
3. Segment by `from_locale` and `to_locale`

**Metrics:**
- Average switches per session
- % of users who switch multiple times
- % of users who stick with selected language

---

### Report 3: Authenticated vs Anonymous

Compare language preferences:

**GA4 Custom Report:**
```
Dimension 1: user_authenticated
Dimension 2: to_locale
Metric: language_switch (event count)
```

**Insights:**
```
Authenticated users:
- Spanish: 60%
- English: 40%
- Avg switches: 0.3 per session

Anonymous users:
- Spanish: 75%
- English: 25%
- Avg switches: 1.2 per session
```

**Action:**
- Consider auto-detecting language for anonymous users
- Save preference for authenticated users

---

## Event Data Dictionary

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `event_category` | string | Event category | "Localization" |
| `event_label` | string | Transition description | "en → es" |
| `from_locale` | string | Previous language | "en" |
| `to_locale` | string | New language | "es" |
| `current_page` | string | Page pathname | "/en/dashboard" |
| `switch_method` | string | UI element used | "header_dropdown" |
| `user_authenticated` | boolean | Login status | true |
| `user_role` | string | User's role | "CLIENT" |
| `value` | number | Event value | 1 |

---

## Code Examples

### Example 1: Track Custom Implementation

```tsx
'use client';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export function SettingsPage() {
  return (
    <div className="settings">
      <h2>Language Preferences</h2>

      {/* Will track as "custom" method */}
      <LocaleSwitcher
        variant="default"
        showLabel={true}
        trackingMethod="custom"
      />
    </div>
  );
}
```

---

### Example 2: View Analytics in Console (Development)

Add this to your component to see tracking events:

```tsx
'use client';

import { useEffect } from 'react';

export function DebugAnalytics() {
  useEffect(() => {
    // Listen for GA4 events
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const originalGtag = (window as any).gtag;

      (window as any).gtag = function(...args: any[]) {
        if (args[0] === 'event' && args[1] === 'language_switch') {
          console.log('Language Switch Tracked:', args[2]);
        }
        return originalGtag(...args);
      };
    }
  }, []);

  return null;
}
```

---

### Example 3: Custom Analytics Integration

If you're not using GA4, you can still track events:

```tsx
// src/lib/analytics/custom-tracker.ts

export function trackLanguageSwitch(data: {
  fromLocale: string;
  toLocale: string;
  currentPage: string;
  switchMethod: string;
}) {
  // Send to your analytics platform

  // Example: Segment
  analytics.track('Language Switch', data);

  // Example: Mixpanel
  mixpanel.track('Language Switch', data);

  // Example: Custom API
  fetch('/api/analytics/language-switch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

Then modify LocaleSwitcher to use your custom tracker:

```tsx
import { trackLanguageSwitch } from '@/lib/analytics/custom-tracker';

// In switchLocale function:
trackLanguageSwitch({
  fromLocale: locale,
  toLocale: newLocale,
  currentPage: pathname,
  switchMethod: trackingMethod,
});
```

---

## Privacy & GDPR Compliance

### What We Track

✅ **Safe to track:**
- Language preferences (non-PII)
- Page paths (non-PII)
- User roles (generic categories)
- Switch methods (UI element names)

❌ **We do NOT track:**
- Personal identifiable information (PII)
- User emails
- User names
- IP addresses (handled by GA4)

### Cookie Consent

If using cookie consent banners, check for consent before tracking:

```tsx
const switchLocale = (newLocale: Locale) => {
  if (newLocale === locale) return;

  // Only track if user consented
  if (hasAnalyticsConsent()) {
    trackLanguageSwitch({
      fromLocale: locale,
      toLocale: newLocale,
      currentPage: pathname,
      switchMethod: trackingMethod,
      userAuthenticated: !!session?.user,
      userRole: session?.user?.role,
    });
  }

  startTransition(() => {
    // ... rest of code
  });
};
```

---

## Testing Analytics

### Development Testing

1. **Enable GA4 in Development:**
```env
# .env.local
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

2. **Open Browser Console:**
```bash
npm run dev
```

3. **Check Events:**
   - Open DevTools → Network tab
   - Filter: `google-analytics.com/g/collect`
   - Switch language
   - Verify `language_switch` event fires

---

### Using GA4 DebugView

1. **Install GA Debugger Extension:**
   - Chrome: [GA Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger)

2. **Enable Debug Mode:**
   - Click extension icon
   - Visit your site
   - Switch languages

3. **View in GA4:**
   - Go to GA4 → Admin → DebugView
   - Watch events appear in real-time

---

### Manual Testing Checklist

- [ ] Desktop header dropdown tracks correctly
- [ ] Mobile menu tracks correctly
- [ ] Footer compact button tracks correctly
- [ ] `from_locale` matches current language
- [ ] `to_locale` matches selected language
- [ ] `current_page` shows correct path
- [ ] `switch_method` matches UI element
- [ ] `user_authenticated` reflects login state
- [ ] `user_role` shows for logged-in users
- [ ] Events appear in GA4 DebugView

---

## Troubleshooting

### Issue: Events not appearing in GA4

**Solutions:**
1. Check GA4 Measurement ID is set:
   ```bash
   echo $NEXT_PUBLIC_GA4_MEASUREMENT_ID
   ```

2. Verify gtag is loaded:
   ```javascript
   console.log(typeof window.gtag) // Should be 'function'
   ```

3. Check browser console for errors

4. Use DebugView instead of real-time reports (real-time has delays)

---

### Issue: Wrong switch_method tracked

**Solution:**
Verify you're passing `trackingMethod` prop:

```tsx
// ✅ Correct
<LocaleSwitcher variant="dropdown" trackingMethod="header_dropdown" />

// ❌ Wrong (will track as "custom")
<LocaleSwitcher variant="dropdown" />
```

---

### Issue: user_role is undefined

**Cause:** User is not logged in or session is not loaded

**Solution:**
This is expected behavior. `user_role` is only tracked for authenticated users:

```typescript
// Only adds user_role if session exists
...(session?.user?.role && { user_role: session.user.role })
```

---

## Analytics ROI

### Business Metrics

**Language Preference Rate:**
```
Spanish Users = (Spanish Switches / Total Switches) × 100
```

**Switcher Effectiveness:**
```
Conversion Rate After Switch =
  (Conversions from Spanish) / (Total Spanish Visitors) × 100
```

**Feature Usage:**
```
Dropdown Usage = (Header Switches / Total Switches) × 100
Mobile Usage = (Mobile Switches / Total Switches) × 100
Footer Usage = (Footer Switches / Total Switches) × 100
```

---

### KPIs to Monitor

1. **Spanish Adoption Rate** - % of users switching to Spanish
2. **Switcher Click Rate** - % of visitors using switcher
3. **Language Retention** - % of users staying in selected language
4. **Conversion by Language** - Conversion rates: EN vs ES
5. **Preferred Switch Method** - Most popular UI element

---

## Future Enhancements

### Phase 2: Language Preference Storage

Track when users set/load saved preferences:

```typescript
export function trackLanguagePreference(data: {
  preferredLocale: string;
  detectionMethod: 'browser' | 'cookie' | 'user_selection' | 'default';
  browserLanguage?: string;
}) {
  // Already implemented in ga4.ts!
}
```

**Usage:**
```typescript
// When loading saved preference
trackLanguagePreference({
  preferredLocale: 'es',
  detectionMethod: 'cookie',
});

// When detecting browser language
trackLanguagePreference({
  preferredLocale: navigator.language,
  detectionMethod: 'browser',
  browserLanguage: navigator.language,
});
```

---

### Phase 3: A/B Testing

Test different switcher placements:

```typescript
// Track which variant performs better
gtag('event', 'experiment_impression', {
  experiment_id: 'language_switcher_placement',
  variant_id: 'header_only', // vs 'header_footer' vs 'all_three'
});
```

---

## Summary

✅ **Automatic tracking** - No code changes needed
✅ **Comprehensive data** - User context, page, method
✅ **Privacy-compliant** - No PII tracked
✅ **Ready to analyze** - Works with GA4 out of the box
✅ **Customizable** - Easy to integrate with other platforms

**Next Steps:**
1. Verify GA4 Measurement ID is set
2. Test in development with DebugView
3. Deploy and monitor language switching patterns
4. Create custom reports for business insights

---

**Created:** November 12, 2025
**Version:** 1.0.0
**Component:** LocaleSwitcher with Analytics
