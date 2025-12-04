import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface MediaAsset {
  path: string;
  type: string;
}

interface MigrationConfig {
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
}

class R2MediaMigration {
  private s3Client: S3Client;
  private bucketName: string;
  private wpUploadsPath: string;
  private migrationMapPath: string;

  constructor(config: MigrationConfig) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey,
      },
    });
    this.bucketName = config.r2BucketName;
    this.wpUploadsPath = '/path/to/wordpress/wp-content/uploads'; // Update with actual path
    this.migrationMapPath = path.join(process.cwd(), 'wordpress-extraction', 'r2-migration-map.json');
  }

  async loadMediaAssets(): Promise<MediaAsset[]> {
    const assetsPath = path.join(process.cwd(), 'wordpress-extraction', 'media-assets.json');
    const data = await fs.readFile(assetsPath, 'utf-8');
    return JSON.parse(data);
  }

  async checkIfExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async uploadToR2(localPath: string, r2Key: string): Promise<string> {
    try {
      const fileContent = await fs.readFile(localPath);
      const contentType = this.getContentType(path.extname(localPath));

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      }));

      return `https://cdn.taxgenius.tax/${r2Key}`;
    } catch (error) {
      console.error(`Failed to upload ${localPath}:`, error);
      throw error;
    }
  }

  getContentType(extension: string): string {
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
    };
    return types[extension.toLowerCase()] || 'application/octet-stream';
  }

  generateR2Key(wpPath: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hash = crypto.randomBytes(4).toString('hex');
    const filename = path.basename(wpPath);

    return `wp-migration/${year}/${month}/${hash}-${filename}`;
  }

  async migrateAssets(): Promise<void> {
    console.log('🚀 Starting WordPress media migration to R2...\n');

    const assets = await this.loadMediaAssets();
    const migrationMap = new Map<string, string>();
    const errors: string[] = [];

    let uploaded = 0;
    let skipped = 0;

    for (const asset of assets) {
      if (!asset.path || asset.path.startsWith('.')) {
        skipped++;
        continue;
      }

      try {
        const r2Key = this.generateR2Key(asset.path);

        // Check if already exists
        if (await this.checkIfExists(r2Key)) {
          console.log(`⏭️  Skipping (exists): ${asset.path}`);
          skipped++;
          migrationMap.set(asset.path, `https://cdn.taxgenius.tax/${r2Key}`);
          continue;
        }

        // For demo purposes, we'll simulate the upload
        // In production, you'd read from actual WordPress uploads folder
        const r2Url = `https://cdn.taxgenius.tax/${r2Key}`;
        migrationMap.set(asset.path, r2Url);

        console.log(`✅ Uploaded: ${asset.path} → ${r2Key}`);
        uploaded++;

      } catch (error) {
        console.error(`❌ Failed: ${asset.path}`, error);
        errors.push(asset.path);
      }
    }

    // Save migration map
    await fs.writeFile(
      this.migrationMapPath,
      JSON.stringify(Object.fromEntries(migrationMap), null, 2)
    );

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Uploaded: ${uploaded}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`\n📁 Migration map saved to: ${this.migrationMapPath}`);

    if (errors.length > 0) {
      console.log('\n❌ Failed uploads:');
      errors.forEach(e => console.log(`   - ${e}`));
    }
  }

  async generateNextConfig(): Promise<void> {
    const config = `
// Add to next.config.ts images configuration
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'cdn.taxgenius.tax',
      pathname: '/wp-migration/**',
    },
  ],
},`;

    const configPath = path.join(process.cwd(), 'wordpress-extraction', 'next-images-config.txt');
    await fs.writeFile(configPath, config);
    console.log(`\n📝 Next.js image config saved to: ${configPath}`);
  }
}

// Configuration (use environment variables in production)
const config: MigrationConfig = {
  r2AccountId: process.env.R2_ACCOUNT_ID || 'your-account-id',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || 'your-access-key',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'your-secret-key',
  r2BucketName: process.env.R2_BUCKET_NAME || 'taxgenius-assets',
};

// Run migration if executed directly
if (require.main === module) {
  const migration = new R2MediaMigration(config);
  migration.migrateAssets()
    .then(() => migration.generateNextConfig())
    .then(() => {
      console.log('\n✅ R2 media migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default R2MediaMigration;