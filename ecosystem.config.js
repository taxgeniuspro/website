// PM2 Ecosystem Configuration for Tax Genius Pro
// This file is for VPS/Docker deployments only
// For Vercel deployments, environment variables are set in Vercel dashboard

module.exports = {
  apps: [
    {
      name: 'taxgeniuspro',
      script: 'npm',
      args: 'start',
      cwd: '/root/websites/taxgeniuspro',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: '3005',

        // Database - Set via environment
        DATABASE_URL: process.env.DATABASE_URL,

        // Redis
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6305',

        // Authentication (NextAuth v5)
        AUTH_SECRET: process.env.AUTH_SECRET,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

        // Resend Email
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax',

        // Application
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax',
        PAYMENT_MODE: process.env.PAYMENT_MODE || 'test',

        // Google Analytics
        NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,

        // Commission Settings
        COMMISSION_RATE_BASIC: process.env.COMMISSION_RATE_BASIC || '25',
        COMMISSION_RATE_STANDARD: process.env.COMMISSION_RATE_STANDARD || '35',
        COMMISSION_RATE_PREMIUM: process.env.COMMISSION_RATE_PREMIUM || '50',
        COMMISSION_RATE_DELUXE: process.env.COMMISSION_RATE_DELUXE || '75',
        MINIMUM_PAYOUT_AMOUNT: process.env.MINIMUM_PAYOUT_AMOUNT || '50',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@taxgeniuspro.tax',

        // Square Payment Integration
        SQUARE_APPLICATION_ID: process.env.SQUARE_APPLICATION_ID,
        SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
        SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT || 'production',
        SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
        NEXT_PUBLIC_SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,

        // Tax Genius Preparer ID
        TAX_GENIUS_PREPARER_ID: process.env.TAX_GENIUS_PREPARER_ID,

        // OpenAI API (Tax Assistant)
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,

        // PWA Push Notifications
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
        VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@taxgeniuspro.tax',

        // Google Gemini AI
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,

        // Ollama (Local LLM)
        OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen2.5:32b',

        // FedEx Shipping
        FEDEX_ACCOUNT_NUMBER: process.env.FEDEX_ACCOUNT_NUMBER,
        FEDEX_API_KEY: process.env.FEDEX_API_KEY,
        FEDEX_SECRET_KEY: process.env.FEDEX_SECRET_KEY,
        FEDEX_API_ENDPOINT: process.env.FEDEX_API_ENDPOINT || 'https://apis-sandbox.fedex.com',
        FEDEX_TEST_MODE: process.env.FEDEX_TEST_MODE || 'true',
        FEDEX_MARKUP_PERCENTAGE: process.env.FEDEX_MARKUP_PERCENTAGE || '0',
        FEDEX_USE_INTELLIGENT_PACKING: process.env.FEDEX_USE_INTELLIGENT_PACKING || 'true',
        FEDEX_ENABLED_SERVICES: process.env.FEDEX_ENABLED_SERVICES || '',
        FEDEX_RATE_TYPES: process.env.FEDEX_RATE_TYPES || 'LIST,ACCOUNT',

        // Shipping Origin
        SHIPPING_ORIGIN_STREET: process.env.SHIPPING_ORIGIN_STREET || '1632 Jonesboro Rd SE',
        SHIPPING_ORIGIN_CITY: process.env.SHIPPING_ORIGIN_CITY || 'Atlanta',
        SHIPPING_ORIGIN_STATE: process.env.SHIPPING_ORIGIN_STATE || 'GA',
        SHIPPING_ORIGIN_ZIP: process.env.SHIPPING_ORIGIN_ZIP || '30315',
        SHIPPING_ORIGIN_COUNTRY: process.env.SHIPPING_ORIGIN_COUNTRY || 'US',
        SHIPPING_ORIGIN_IS_RESIDENTIAL: process.env.SHIPPING_ORIGIN_IS_RESIDENTIAL || 'false',
      },
      error_file: '/root/.pm2/logs/taxgeniuspro-error.log',
      out_file: '/root/.pm2/logs/taxgeniuspro-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
