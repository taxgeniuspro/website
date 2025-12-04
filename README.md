# Tax Genius Pro - Professional Tax Management Platform

## 🚀 Overview

Tax Genius Pro is a comprehensive tax preparation and management platform designed for tax professionals, referrers, and clients. Built with modern web technologies and featuring a Progressive Web App (PWA) architecture.

## ✨ Features

### **For Clients**
- 📄 Document upload with drag-and-drop
- 📊 Tax return status tracking
- 💬 Secure messaging with preparers
- 💳 Payment processing
- 📱 Mobile-responsive interface

### **For Tax Preparers**
- 👥 Client management dashboard
- 📑 Document review system
- 🔄 Tax return workflow
- 💰 Commission tracking
- 📈 Performance metrics

### **For Referrers**
- 🎯 Referral tracking dashboard
- 💵 Commission management
- 🔗 Vanity URL creation
- 🏆 Contest participation
- 📊 Real-time analytics

## 🛠️ Technology Stack

- **Frontend:** Next.js 15.5.3, React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Lucia Auth with magic links
- **Payments:** Square SDK
- **Real-time:** Socket.io
- **Email:** SendGrid
- **Storage:** Cloudflare R2
- **Caching:** Redis
- **PWA:** next-pwa with service workers

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/taxgeniuspro.git

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
REDIS_URL=redis://...
SENDGRID_API_KEY=your-api-key
SQUARE_ACCESS_TOKEN=your-token
R2_BUCKET_NAME=your-bucket
```

## 🚀 Deployment

The application is configured for deployment on any Node.js hosting platform:

```bash
# Build for production
npm run build

# Start production server
npm start
```

For PM2 deployment:
```bash
pm2 start npm --name taxgeniuspro -- start
```

## 📱 PWA Features

- **Installable:** Add to home screen on mobile and desktop
- **Offline Support:** Works without internet connection
- **Push Notifications:** Real-time updates
- **Background Sync:** Automatic document upload when online

## 🔄 Development Workflow

1. **Sprint Planning:** Features organized in sprints
2. **Implementation:** Following TypeScript best practices
3. **Testing:** Component and integration testing
4. **Deployment:** Automated with PM2

## 📝 License

Private and Confidential - All Rights Reserved

## 🤝 Support

For support, email support@taxgenius.com

---

**Built with ❤️ by the Tax Genius Pro Team**