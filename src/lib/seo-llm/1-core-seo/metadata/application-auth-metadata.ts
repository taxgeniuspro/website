import type { Metadata } from 'next';
import { generateMetadata } from './metadata';

// Application Pages
export const preparerApplyMetadata: Metadata = generateMetadata({
  title: 'Become a Tax Preparer - Join Tax Genius Pro',
  description:
    'Join Tax Genius Pro as a certified tax preparer. Work remotely, set your own hours, earn competitive rates. Apply today to help clients with their tax preparation needs.',
  keywords: [
    'become tax preparer',
    'tax preparer jobs',
    'join tax genius pro',
    'remote tax preparer',
    'tax professional opportunity',
    'tax preparer application',
  ],
  url: '/preparer/apply',
});

export const preparerJoinMetadata: Metadata = generateMetadata({
  title: 'Join Our Tax Preparer Network - Tax Genius Pro',
  description:
    'Join our nationwide network of professional tax preparers. Get access to clients, marketing support, and competitive compensation. Start your tax preparation business today.',
  keywords: [
    'tax preparer network',
    'join tax professionals',
    'tax preparer partnership',
    'tax business opportunity',
  ],
  url: '/preparer/join',
});

export const preparerPageMetadata: Metadata = generateMetadata({
  title: 'For Tax Preparers - Partner With Tax Genius Pro',
  description:
    'Partner with Tax Genius Pro and grow your tax preparation business. Access our client network, marketing tools, and technology platform. Learn about preparer benefits and opportunities.',
  keywords: [
    'tax preparer partners',
    'tax professional network',
    'preparer opportunities',
    'tax business growth',
  ],
  url: '/preparer',
});

export const affiliateApplyMetadata: Metadata = generateMetadata({
  title: 'Affiliate Program Application - Tax Genius Pro',
  description:
    'Apply to Tax Genius Pro affiliate program. Earn commissions by referring clients. Easy signup, competitive payouts, marketing support included.',
  keywords: [
    'tax affiliate program',
    'affiliate application',
    'tax referral program',
    'earn commissions',
    'tax affiliate marketing',
  ],
  url: '/affiliate/apply',
});

export const affiliateJoinMetadata: Metadata = generateMetadata({
  title: 'Join Tax Genius Pro Affiliate Program',
  description:
    'Join our affiliate program and earn money referring tax clients. High commission rates, monthly payouts, and full marketing support. Sign up free today.',
  keywords: [
    'join affiliate program',
    'tax affiliate signup',
    'referral partner program',
    'affiliate opportunities',
  ],
  url: '/affiliate/join',
});

export const referralPageMetadata: Metadata = generateMetadata({
  title: 'Refer & Earn - Tax Genius Pro Referral Program',
  description:
    'Refer friends and family to Tax Genius Pro and earn rewards. Get paid for every successful referral. Easy signup, track your earnings, get paid monthly.',
  keywords: [
    'tax referral program',
    'refer and earn',
    'tax referral rewards',
    'earn money referring',
  ],
  url: '/referral',
});

export const referralSignupMetadata: Metadata = generateMetadata({
  title: 'Sign Up for Referral Program - Tax Genius Pro',
  description:
    'Sign up for Tax Genius Pro referral program. Start earning commissions by referring clients today. Free to join, easy to use.',
  keywords: ['referral signup', 'join referral program', 'start referring'],
  url: '/referral/signup',
});

export const referralJoinMetadata: Metadata = generateMetadata({
  title: 'Join Referral Program - Tax Genius Pro',
  description:
    'Join Tax Genius Pro referral program and start earning. Refer clients, track earnings, get paid. Sign up in minutes.',
  keywords: ['join referral', 'referral partner', 'earn commissions'],
  url: '/referral/join',
});

export const applyMetadata: Metadata = generateMetadata({
  title: 'Apply Now - Tax Genius Pro',
  description:
    'Apply to partner with Tax Genius Pro. Join as a tax preparer, affiliate, or referral partner. Multiple opportunities to grow your income.',
  keywords: ['apply tax genius pro', 'application', 'partnership application'],
  url: '/apply',
});

export const startFilingMetadata: Metadata = generateMetadata({
  title: 'Start Filing Your Taxes Online - Tax Genius Pro',
  description:
    'Start filing your taxes online with Tax Genius Pro. Simple, secure, and expert-backed tax preparation. Get started in minutes and maximize your refund.',
  keywords: [
    'start tax filing',
    'file taxes online',
    'online tax filing',
    'tax filing service',
    'begin tax return',
  ],
  url: '/start-filing',
});

export const startFilingFormMetadata: Metadata = generateMetadata({
  title: 'Tax Filing Form - Get Started | Tax Genius Pro',
  description:
    'Complete your tax filing form and get matched with an expert tax preparer. Secure, fast, and guaranteed accurate. Start your tax return now.',
  keywords: ['tax filing form', 'online tax form', 'start tax return', 'file taxes now'],
  url: '/start-filing/form',
});

export const bookAppointmentMetadata: Metadata = generateMetadata({
  title: 'Book a Tax Consultation Appointment',
  description:
    'Schedule a free consultation with a certified tax professional. Phone, video, or in-person appointments available. Get expert tax advice today.',
  keywords: [
    'book tax appointment',
    'tax consultation',
    'schedule tax meeting',
    'tax expert appointment',
  ],
  url: '/book-appointment',
});

export const uploadDocumentsMetadata: Metadata = generateMetadata({
  title: 'Upload Tax Documents Securely',
  description:
    'Securely upload your tax documents to Tax Genius Pro. Bank-level encryption, easy drag-and-drop interface. W-2s, 1099s, receipts, and more.',
  keywords: [
    'upload tax documents',
    'secure document upload',
    'tax file upload',
    'send tax documents',
  ],
  url: '/upload-documents',
});

// Auth Pages
export const loginMetadata: Metadata = generateMetadata({
  title: 'Login to Your Account - Tax Genius Pro',
  description:
    'Login to your Tax Genius Pro account. Access your tax returns, documents, and account dashboard. Secure login with email or social accounts.',
  keywords: ['login', 'sign in', 'account access', 'tax account login'],
  url: '/auth/signin',
  noindex: true,
});

export const signupMetadata: Metadata = generateMetadata({
  title: 'Create Your Account - Tax Genius Pro',
  description:
    'Create a free Tax Genius Pro account. Start filing your taxes, access expert help, and track your refund. Sign up in seconds.',
  keywords: ['sign up', 'create account', 'register', 'new account'],
  url: '/auth/signup',
  noindex: true,
});

export const verifyMetadata: Metadata = generateMetadata({
  title: 'Verify Your Email - Tax Genius Pro',
  description:
    'Verify your email address to complete your Tax Genius Pro account setup. Check your inbox for the verification link.',
  keywords: ['verify email', 'email verification', 'confirm email'],
  url: '/auth/verify',
  noindex: true,
});

export const selectRoleMetadata: Metadata = generateMetadata({
  title: 'Select Your Role - Tax Genius Pro',
  description:
    "Select your account type: client, tax preparer, or affiliate. Customize your experience based on how you'll use Tax Genius Pro.",
  keywords: ['select role', 'account type', 'user type'],
  url: '/auth/select-role',
  noindex: true,
});
