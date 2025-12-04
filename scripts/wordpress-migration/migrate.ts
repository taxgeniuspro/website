import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface SiteInfo {
  name: string;
  url: string;
  description?: string;
  [key: string]: unknown;
}

interface WordPressPage {
  id: string | number;
  title: string;
  content: string;
  slug: string;
  [key: string]: unknown;
}

interface NavigationItem {
  label: string;
  url: string;
  children?: NavigationItem[];
  [key: string]: unknown;
}

interface DesignSystem {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  [key: string]: unknown;
}

interface MediaAsset {
  id: string | number;
  url: string;
  type: string;
  [key: string]: unknown;
}

interface WordPressForm {
  id: string | number;
  name: string;
  fields: unknown[];
  [key: string]: unknown;
}

interface WordPressPlugin {
  name: string;
  version?: string;
  [key: string]: unknown;
}

interface WordPressData {
  site_info: SiteInfo;
  pages: WordPressPage[];
  navigation: NavigationItem;
  design_system: DesignSystem;
  media_assets: MediaAsset[];
  forms: WordPressForm[];
  plugins: WordPressPlugin[];
}

interface MigrationResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

class WordPressMigration {
  private extractionPath: string;
  private mediaOutputPath: string;

  constructor() {
    this.extractionPath = path.join(process.cwd(), 'wordpress-extraction');
    this.mediaOutputPath = path.join(process.cwd(), 'public', 'migrated-assets');
  }

  async loadExtractionData(): Promise<WordPressData> {
    const summaryPath = path.join(this.extractionPath, 'extraction-summary.json');
    const data = await fs.readFile(summaryPath, 'utf-8');
    return JSON.parse(data);
  }

  async migrateMediaAssets(assets: any[]): Promise<MigrationResult> {
    try {
      await fs.mkdir(this.mediaOutputPath, { recursive: true });

      const assetMap = new Map<string, string>();

      for (const asset of assets) {
        if (!asset.path || asset.path.startsWith('.')) continue;

        const fileName = path.basename(asset.path);
        const hashedName = `${crypto.randomBytes(8).toString('hex')}_${fileName}`;
        const outputPath = path.join(this.mediaOutputPath, hashedName);

        assetMap.set(asset.path, `/migrated-assets/${hashedName}`);
      }

      const mapPath = path.join(this.extractionPath, 'media-url-map.json');
      await fs.writeFile(mapPath, JSON.stringify(Object.fromEntries(assetMap), null, 2));

      return {
        success: true,
        message: `Prepared migration for ${assetMap.size} media assets`,
        data: assetMap
      };
    } catch (error) {
      return {
        success: false,
        message: `Media migration failed: ${error}`
      };
    }
  }

  async createContentPages(): Promise<MigrationResult> {
    try {
      const contentPages = [
        {
          slug: 'about',
          title: 'About Tax Genius',
          content: 'Professional tax preparation services',
          seoDescription: 'Learn about Tax Genius professional tax services'
        },
        {
          slug: 'services',
          title: 'Our Services',
          content: 'Comprehensive tax preparation and planning',
          seoDescription: 'Tax preparation, planning, and consulting services'
        },
        {
          slug: 'pricing',
          title: 'Pricing',
          content: 'Transparent pricing for tax services',
          seoDescription: 'Affordable tax preparation pricing'
        },
        {
          slug: 'contact',
          title: 'Contact Us',
          content: 'Get in touch with our tax experts',
          seoDescription: 'Contact Tax Genius for tax preparation services'
        }
      ];

      const pagesPath = path.join(this.extractionPath, 'content-pages.json');
      await fs.writeFile(pagesPath, JSON.stringify(contentPages, null, 2));

      return {
        success: true,
        message: `Created ${contentPages.length} content page templates`,
        data: contentPages
      };
    } catch (error) {
      return {
        success: false,
        message: `Page creation failed: ${error}`
      };
    }
  }

  async mapFormFields(): Promise<MigrationResult> {
    try {
      const formMappings = {
        'contact': {
          fields: ['name', 'email', 'phone', 'message'],
          model: 'ContactSubmission'
        },
        'appointment': {
          fields: ['name', 'email', 'phone', 'preferredDate', 'serviceType'],
          model: 'AppointmentRequest'
        },
        'referral': {
          fields: ['referrerName', 'referrerEmail', 'clientName', 'clientEmail'],
          model: 'Referral'
        }
      };

      const formsPath = path.join(this.extractionPath, 'form-mappings.json');
      await fs.writeFile(formsPath, JSON.stringify(formMappings, null, 2));

      return {
        success: true,
        message: 'Form field mappings created',
        data: formMappings
      };
    } catch (error) {
      return {
        success: false,
        message: `Form mapping failed: ${error}`
      };
    }
  }

  async createRedirectMap(): Promise<MigrationResult> {
    try {
      const redirects = [
        { source: '/home', destination: '/', permanent: true },
        { source: '/about-us', destination: '/about', permanent: true },
        { source: '/services-offered', destination: '/services', permanent: true },
        { source: '/get-quote', destination: '/pricing', permanent: true },
        { source: '/contact-us', destination: '/contact', permanent: true },
        { source: '/affiliate-dashboard', destination: '/dashboard/affiliate', permanent: true },
        { source: '/tax-services', destination: '/services', permanent: true }
      ];

      const redirectsPath = path.join(this.extractionPath, 'redirects.json');
      await fs.writeFile(redirectsPath, JSON.stringify(redirects, null, 2));

      return {
        success: true,
        message: `Created ${redirects.length} SEO redirects`,
        data: redirects
      };
    } catch (error) {
      return {
        success: false,
        message: `Redirect creation failed: ${error}`
      };
    }
  }

  async generateMigrationReport(): Promise<void> {
    const wpData = await this.loadExtractionData();

    const report = {
      timestamp: new Date().toISOString(),
      wordpress: {
        version: wpData.site_info.WordPress.Version,
        theme: wpData.site_info.Template,
        plugins: wpData.plugins.length,
        mediaAssets: wpData.media_assets.length
      },
      nextjs: {
        version: '15.5.3',
        database: 'PostgreSQL with Prisma',
        hosting: 'VPS Port 3005',
        storage: 'Cloudflare R2'
      },
      migrations: {
        media: 'Pending',
        content: 'Pending',
        forms: 'Pending',
        users: 'Not Required (new system)',
        seo: 'Redirects configured'
      }
    };

    const reportPath = path.join(this.extractionPath, 'migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('Migration Report Generated:', report);
  }

  async runMigration(): Promise<void> {
    console.log('🚀 Starting WordPress to Next.js Migration...\n');

    const wpData = await this.loadExtractionData();

    console.log('📊 WordPress Site Info:');
    console.log(`   - URL: ${wpData.site_info.SiteURL}`);
    console.log(`   - WordPress: ${wpData.site_info.WordPress.Version}`);
    console.log(`   - Theme: ${wpData.site_info.Template}`);
    console.log(`   - Plugins: ${wpData.plugins.length} active\n`);

    console.log('🖼️  Migrating Media Assets...');
    const mediaResult = await this.migrateMediaAssets(wpData.media_assets);
    console.log(`   ${mediaResult.message}\n`);

    console.log('📄 Creating Content Pages...');
    const pagesResult = await this.createContentPages();
    console.log(`   ${pagesResult.message}\n`);

    console.log('📝 Mapping Form Fields...');
    const formsResult = await this.mapFormFields();
    console.log(`   ${formsResult.message}\n`);

    console.log('🔄 Creating SEO Redirects...');
    const redirectsResult = await this.createRedirectMap();
    console.log(`   ${redirectsResult.message}\n`);

    console.log('📋 Generating Migration Report...');
    await this.generateMigrationReport();

    console.log('\n✅ Migration preparation complete!');
    console.log('📁 Check wordpress-extraction/ for generated files');
  }
}

// Run migration if executed directly
if (require.main === module) {
  const migration = new WordPressMigration();
  migration.runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default WordPressMigration;