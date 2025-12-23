# Frontend Flows Audit

## User Journeys to Test

---

## 1. Client Intake Flow

### Steps
1. Visit `/go/{code}-intake` or `/start-filing/form`
2. Fill multi-step intake form
3. Submit form
4. See confirmation

### Checklist

- [ ] Form loads correctly
- [ ] Tracking code preserved in URL
- [ ] Multi-step navigation works
- [ ] Back button works
- [ ] Validation on each step
- [ ] Progress indicator shown
- [ ] Submit button has loading state
- [ ] Confirmation page shown
- [ ] COMPARE: As smooth as Typeform?

### Issues Found
*To be populated during audit*

---

## 2. Appointment Booking Flow

### Steps
1. Visit `/book` or `/go/{code}-appt`
2. Select preparer (or prepopulated)
3. Choose date/time
4. Fill contact info
5. Confirm booking

### Checklist

- [ ] Preparer selection works
- [ ] Calendar displays correctly
- [ ] Available slots shown
- [ ] Time selection works
- [ ] Form validation
- [ ] Submit loading state
- [ ] Confirmation shown
- [ ] COMPARE: As smooth as Calendly?

### Issues Found
*To be populated during audit*

---

## 3. Tax Preparer Application Flow

### Steps
1. Visit application page
2. Fill application form
3. Submit application
4. Receive confirmation
5. Wait for approval
6. Receive approval email
7. Login to dashboard

### Checklist

- [ ] Application form works
- [ ] Required fields validated
- [ ] Submit loading state
- [ ] Confirmation shown
- [ ] Email received on approval

### Issues Found
*To be populated during audit*

---

## 4. Affiliate Signup Flow

### Steps
1. Visit affiliate signup
2. Fill registration form
3. Submit
4. (Auto-approved)
5. Access affiliate dashboard

### Checklist

- [ ] Signup form works
- [ ] Validation works
- [ ] Auto-approval happens
- [ ] Dashboard accessible

### Issues Found
*To be populated during audit*

---

## 5. Login Flow

### Steps
1. Visit login page
2. Enter credentials
3. Submit
4. Redirect to appropriate dashboard

### Checklist

- [ ] Form validation
- [ ] Loading state
- [ ] Error messages clear
- [ ] Redirect correct by role

### Issues Found
*To be populated during audit*

---

## Files to Review

- `/src/app/(public)/` - Public pages
- `/src/app/(auth)/` - Auth pages
- `/src/app/(protected)/` - Protected pages
