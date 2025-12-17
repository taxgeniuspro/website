# Ray Hamilton (Oliver) - Tax Preparer Account Info

## 🔐 Login Credentials

**Login URL:** https://taxgeniuspro.tax/login

**Email:** taxgenius.tax@gmail.com
**Password:** TaxGenius2024!

---

## 👤 Account Details

**Name:** Ray Hamalton
**Profile ID:** cmh9ze4aj0002jx5kkpnnu3no
**Role:** Tax Preparer
**Email:** taxgenius.tax@gmail.com

---

## 📅 Calendar & Booking Settings

### Booking Enabled: ✅ YES

**Accepted Booking Types:**
- ✅ Phone Bookings: Enabled
- ✅ Video Bookings: Enabled
- ✅ In-Person Bookings: Enabled

### Weekly Availability Schedule:

| Day | Hours | Status |
|-----|-------|--------|
| **Monday** | 9:00 AM - 7:00 PM | ✅ Active |
| **Tuesday** | 9:00 AM - 7:00 PM | ✅ Active |
| **Wednesday** | 9:00 AM - 7:00 PM | ✅ Active |
| **Thursday** | 9:00 AM - 7:00 PM | ✅ Active |
| **Friday** | 9:00 AM - 7:00 PM | ✅ Active |
| **Saturday** | 10:00 AM - 5:00 PM | ✅ Active |
| **Sunday** | Closed | ❌ Not Available |

**Total Weekly Hours:** 55 hours

---

## 📊 Dashboard Access

After logging in, you'll have access to:

### Tax Preparer Dashboard
**URL:** https://taxgeniuspro.tax/dashboard/tax-preparer

**Features:**
- 📅 **Calendar** - View and manage appointments
- 📋 **Forms** - Tax forms and client documents
- 👥 **Leads** - View assigned leads from applications
- 💰 **Earnings** - Track income and commissions
- 📧 **Email Templates** - Manage client communications
- 📊 **Analytics** - Performance metrics
- ⚙️ **Settings** - Update profile and preferences

---

## 📅 Calendar Management

### View Your Calendar
**URL:** https://taxgeniuspro.tax/dashboard/tax-preparer/calendar

**What You Can See:**
- All scheduled appointments
- Available time slots
- Client information
- Appointment types (phone/video/in-person)

### How Appointments Are Booked

1. **Preparer Application Form** (`/preparer/start`)
   - Applicants submit their information
   - They can optionally schedule an interview with you
   - You receive notifications via email

2. **Tax Intake Form** (`/start-filing/form`)
   - Clients submit tax filing requests
   - Can schedule consultation appointments
   - Assigned based on referral tracking

3. **Direct Booking Widget**
   - Uses your Profile ID to check availability
   - Shows available slots based on your schedule
   - Automatically blocks conflicting times

---

## 🔔 Email Notifications

You receive emails for:
- ✅ New preparer applications
- ✅ New appointment bookings
- ✅ Appointment confirmations
- ✅ Client inquiries

**Notification Email:** taxgenius.tax@gmail.com

---

## 🛠️ Calendar Settings

### Modify Your Availability

**Via Dashboard:**
1. Go to: https://taxgeniuspro.tax/dashboard/tax-preparer/settings
2. Update booking preferences
3. Enable/disable booking types
4. Set availability hours

**Via Database Script:**
```bash
npx tsx scripts/setup-preparer-availability.ts
```

### Current Settings:
- **Slot Interval:** 30 minutes
- **Buffer Time:** 15 minutes (after appointments)
- **Booking Window:** Next 30 days available
- **Timezone:** America/New_York (EST/EDT)

---

## 📞 Contact Information

**Business Phone:** +1 404-627-1015
**Business Address:** 1632 Jonesboro Rd SE, Atlanta, GA 30315
**Support Email:** taxgenius.tax@gmail.com

---

## ✅ What's Currently Working

### 1. **Preparer Application Form** ✅
- URL: https://taxgeniuspro.tax/preparer/start
- Form submission works
- Optional appointment booking
- Emails sent to both hiring addresses
- Calendar shows available slots correctly

### 2. **API Endpoints** ✅
- Get Available Slots: `/api/appointments/available-slots`
- Book Appointment: `/api/appointments/book`
- Submit Application: `/api/preparers/apply`

### 3. **Calendar Availability** ✅
- 20 slots per weekday (9 AM - 7 PM)
- 14 slots on Saturday (10 AM - 5 PM)
- Sunday closed (0 slots)
- Future dates working correctly

---

## 🧪 Test Your Calendar

### Check Available Slots:
```bash
curl "https://taxgeniuspro.tax/api/appointments/available-slots?preparerId=cmh9ze4aj0002jx5kkpnnu3no&date=2025-11-12&duration=30"
```

**Expected Response:**
```json
{
  "success": true,
  "slotsCount": 20,
  "slots": [
    {"startTime": "09:00", "endTime": "09:30", "available": true},
    {"startTime": "09:30", "endTime": "10:00", "available": true},
    ...
  ]
}
```

---

## 🔄 To Update Your Password

If you need to change the password, run:

```bash
DATABASE_URL="postgresql://taxgeniuspro_user:TaxGenius2024Secure@localhost:5438/taxgeniuspro_db?schema=public" npx tsx scripts/set-preparer-password.ts
```

Then update the password in the script before running.

---

## 📝 Quick Start Guide

1. **Login:**
   - Go to: https://taxgeniuspro.tax/login
   - Email: taxgenius.tax@gmail.com
   - Password: TaxGenius2024!

2. **View Dashboard:**
   - Automatically redirects to: `/dashboard/tax-preparer`
   - Click "Calendar" to see appointments

3. **Check Appointments:**
   - View scheduled interviews
   - See client information
   - Manage bookings

4. **Test Booking:**
   - Visit: https://taxgeniuspro.tax/preparer/start
   - Submit a test application
   - Book an interview to see it appear in calendar

---

## 🎯 Your Role in the System

As a **Tax Preparer**, you are:

1. **The Default Interview Preparer**
   - All preparer applications can book with you
   - Profile ID is used in the FluidBookingWidget

2. **Available for Consultations**
   - Clients can book tax consultations
   - Phone, video, and in-person options

3. **Lead Assignment Target**
   - When clients apply via tax preparers, leads may be assigned to you
   - Dashboard shows your assigned leads

4. **Email Recipient**
   - All hiring team notifications sent to your email
   - Application confirmations and appointment bookings

---

## 📅 Calendar Dashboard Preview

After login, your calendar will show:
- **Today's Appointments** - Quick view
- **Upcoming Week** - Schedule overview
- **Filter Options** - By type, status, date
- **Quick Actions** - Reschedule, cancel, update

---

**Last Updated:** November 11, 2025
**Status:** ✅ Active and Ready
