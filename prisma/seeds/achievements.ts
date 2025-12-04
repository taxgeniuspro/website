import { PrismaClient, AchievementRarity, AchievementCategory } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Achievement Definitions for TaxGeniusPro Gamification System
 *
 * This file contains 40+ achievements for:
 * - Tax Preparers (client filing, speed, quality)
 * - Affiliates & Referrers (referrals, marketing, conversion)
 * - Universal achievements (engagement, streaks)
 */

export const ACHIEVEMENTS = [
  // ========================================
  // TAX PREPARER ACHIEVEMENTS - MILESTONE
  // ========================================
  {
    slug: 'first_client',
    title: 'First Steps',
    description: 'File your first client\'s tax return',
    category: AchievementCategory.MILESTONE,
    icon: 'Sparkles',
    rarity: AchievementRarity.COMMON,
    points: 10,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'client_count', threshold: 1 },
    badgeColor: '#10B981', // green
    sortOrder: 1,
  },
  {
    slug: 'tax_pro_certified',
    title: 'Certified Professional',
    description: 'Complete your preparer profile with license and credentials',
    category: AchievementCategory.MILESTONE,
    icon: 'Award',
    rarity: AchievementRarity.COMMON,
    points: 15,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'profile_complete', fields: ['licenseNo', 'companyName'] },
    badgeColor: '#3B82F6', // blue
    sortOrder: 2,
  },

  // ========================================
  // TAX PREPARER ACHIEVEMENTS - PERFORMANCE
  // ========================================
  {
    slug: 'speed_demon',
    title: 'Speed Demon',
    description: 'File a tax return in under 2 hours',
    category: AchievementCategory.PERFORMANCE,
    icon: 'Zap',
    rarity: AchievementRarity.RARE,
    points: 25,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'filing_speed', maxHours: 2 },
    badgeColor: '#F59E0B', // amber
    sortOrder: 10,
  },
  {
    slug: 'early_bird',
    title: 'Early Bird',
    description: 'File a return 30+ days before the deadline',
    category: AchievementCategory.PERFORMANCE,
    icon: 'Sunrise',
    rarity: AchievementRarity.COMMON,
    points: 20,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'early_filing', daysBefore: 30 },
    badgeColor: '#FBBF24', // yellow
    sortOrder: 11,
  },
  {
    slug: 'lightning_round',
    title: 'Lightning Round',
    description: 'File 5 returns in one day',
    category: AchievementCategory.PERFORMANCE,
    icon: 'Bolt',
    rarity: AchievementRarity.LEGENDARY,
    points: 100,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'returns_per_day', count: 5 },
    badgeColor: '#8B5CF6', // purple
    sortOrder: 12,
  },

  // ========================================
  // TAX PREPARER ACHIEVEMENTS - VOLUME
  // ========================================
  {
    slug: 'perfect_ten',
    title: 'Perfect 10',
    description: 'File 10 tax returns',
    category: AchievementCategory.VOLUME,
    icon: 'Target',
    rarity: AchievementRarity.RARE,
    points: 50,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'client_count', threshold: 10 },
    badgeColor: '#06B6D4', // cyan
    sortOrder: 20,
  },
  {
    slug: 'half_century',
    title: 'Half Century',
    description: 'File 50 tax returns',
    category: AchievementCategory.VOLUME,
    icon: 'TrendingUp',
    rarity: AchievementRarity.EPIC,
    points: 150,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'client_count', threshold: 50 },
    badgeColor: '#EC4899', // pink
    sortOrder: 21,
  },
  {
    slug: 'century_club',
    title: 'Century Club',
    description: 'File 100 tax returns',
    category: AchievementCategory.VOLUME,
    icon: 'Crown',
    rarity: AchievementRarity.LEGENDARY,
    points: 300,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'client_count', threshold: 100 },
    badgeColor: '#A855F7', // purple
    sortOrder: 22,
  },
  {
    slug: 'people_person',
    title: 'People Person',
    description: 'Manage 25+ active clients',
    category: AchievementCategory.VOLUME,
    icon: 'Users',
    rarity: AchievementRarity.EPIC,
    points: 75,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'active_clients', threshold: 25 },
    badgeColor: '#14B8A6', // teal
    sortOrder: 23,
  },
  {
    slug: 'document_master',
    title: 'Document Master',
    description: 'Process 100+ documents',
    category: AchievementCategory.VOLUME,
    icon: 'FileCheck',
    rarity: AchievementRarity.RARE,
    points: 50,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'documents_processed', threshold: 100 },
    badgeColor: '#0EA5E9', // sky
    sortOrder: 24,
  },

  // ========================================
  // TAX PREPARER ACHIEVEMENTS - QUALITY
  // ========================================
  {
    slug: 'five_star_service',
    title: '5-Star Service',
    description: 'Achieve 5.0 client satisfaction rating',
    category: AchievementCategory.QUALITY,
    icon: 'Star',
    rarity: AchievementRarity.LEGENDARY,
    points: 150,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'satisfaction_rating', threshold: 5.0 },
    badgeColor: '#EAB308', // yellow
    sortOrder: 30,
  },
  {
    slug: 'highly_rated',
    title: 'Highly Rated',
    description: 'Maintain 4.5+ star rating with 10+ reviews',
    category: AchievementCategory.QUALITY,
    icon: 'ThumbsUp',
    rarity: AchievementRarity.EPIC,
    points: 75,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'rating_with_reviews', rating: 4.5, reviews: 10 },
    badgeColor: '#F97316', // orange
    sortOrder: 31,
  },
  {
    slug: 'zero_errors',
    title: 'Perfectionist',
    description: 'File 20 returns with zero corrections needed',
    category: AchievementCategory.QUALITY,
    icon: 'CheckCircle',
    rarity: AchievementRarity.EPIC,
    points: 100,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'error_free_returns', threshold: 20 },
    badgeColor: '#22C55E', // green
    sortOrder: 32,
  },

  // ========================================
  // TAX PREPARER ACHIEVEMENTS - STREAK
  // ========================================
  {
    slug: 'hot_streak',
    title: 'Hot Streak',
    description: 'File returns for 7 consecutive days',
    category: AchievementCategory.STREAK,
    icon: 'Flame',
    rarity: AchievementRarity.RARE,
    points: 60,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'filing_streak', days: 7 },
    badgeColor: '#EF4444', // red
    sortOrder: 40,
  },
  {
    slug: 'on_fire',
    title: 'On Fire',
    description: 'File returns for 14 consecutive days',
    category: AchievementCategory.STREAK,
    icon: 'Flame',
    rarity: AchievementRarity.EPIC,
    points: 120,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'filing_streak', days: 14 },
    badgeColor: '#DC2626', // darker red
    sortOrder: 41,
  },

  // ========================================
  // TAX PREPARER ACHIEVEMENTS - EARNINGS
  // ========================================
  {
    slug: 'first_paycheck',
    title: 'First Paycheck',
    description: 'Earn your first $100 in commissions',
    category: AchievementCategory.MILESTONE,
    icon: 'DollarSign',
    rarity: AchievementRarity.COMMON,
    points: 15,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'earnings', threshold: 100 },
    badgeColor: '#10B981', // green
    sortOrder: 50,
  },
  {
    slug: 'big_earner',
    title: 'Big Earner',
    description: 'Earn $5,000 in commissions',
    category: AchievementCategory.VOLUME,
    icon: 'Wallet',
    rarity: AchievementRarity.EPIC,
    points: 100,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'earnings', threshold: 5000 },
    badgeColor: '#16A34A', // dark green
    sortOrder: 51,
  },
  {
    slug: 'top_earner',
    title: 'Top Earner',
    description: 'Earn $10,000 in commissions',
    category: AchievementCategory.VOLUME,
    icon: 'Trophy',
    rarity: AchievementRarity.LEGENDARY,
    points: 200,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'earnings', threshold: 10000 },
    badgeColor: '#FCD34D', // gold
    sortOrder: 52,
  },

  // ========================================
  // AFFILIATE/REFERRER ACHIEVEMENTS - MILESTONE
  // ========================================
  {
    slug: 'first_referral',
    title: 'First Referral',
    description: 'Get your first referral signup',
    category: AchievementCategory.MILESTONE,
    icon: 'UserPlus',
    rarity: AchievementRarity.COMMON,
    points: 10,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'referral_count', threshold: 1 },
    badgeColor: '#10B981', // green
    sortOrder: 100,
  },
  {
    slug: 'link_creator',
    title: 'Link Creator',
    description: 'Create your first tracking link',
    category: AchievementCategory.MILESTONE,
    icon: 'Link',
    rarity: AchievementRarity.COMMON,
    points: 10,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'links_created', threshold: 1 },
    badgeColor: '#3B82F6', // blue
    sortOrder: 101,
  },

  // ========================================
  // AFFILIATE/REFERRER ACHIEVEMENTS - VOLUME
  // ========================================
  {
    slug: 'growth_hacker',
    title: 'Growth Hacker',
    description: 'Get 10 referrals',
    category: AchievementCategory.VOLUME,
    icon: 'TrendingUp',
    rarity: AchievementRarity.RARE,
    points: 50,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'referral_count', threshold: 10 },
    badgeColor: '#06B6D4', // cyan
    sortOrder: 110,
  },
  {
    slug: 'influencer',
    title: 'Influencer',
    description: 'Get 50 referrals',
    category: AchievementCategory.VOLUME,
    icon: 'Users',
    rarity: AchievementRarity.EPIC,
    points: 150,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'referral_count', threshold: 50 },
    badgeColor: '#EC4899', // pink
    sortOrder: 111,
  },
  {
    slug: 'legend',
    title: 'Legend',
    description: 'Get 100 referrals',
    category: AchievementCategory.VOLUME,
    icon: 'Crown',
    rarity: AchievementRarity.LEGENDARY,
    points: 300,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'referral_count', threshold: 100 },
    badgeColor: '#A855F7', // purple
    sortOrder: 112,
  },
  {
    slug: 'material_master',
    title: 'Material Master',
    description: 'Share 20+ marketing materials',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'Image',
    rarity: AchievementRarity.RARE,
    points: 40,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'materials_shared', threshold: 20 },
    badgeColor: '#8B5CF6', // violet
    sortOrder: 113,
  },
  {
    slug: 'link_builder',
    title: 'Link Builder',
    description: 'Create 10 custom tracking links',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'Link2',
    rarity: AchievementRarity.COMMON,
    points: 25,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'links_created', threshold: 10 },
    badgeColor: '#0EA5E9', // sky
    sortOrder: 114,
  },

  // ========================================
  // AFFILIATE/REFERRER ACHIEVEMENTS - PERFORMANCE
  // ========================================
  {
    slug: 'conversion_king',
    title: 'Conversion King',
    description: 'Achieve 25%+ conversion rate (with 20+ referrals)',
    category: AchievementCategory.PERFORMANCE,
    icon: 'TrendingUp',
    rarity: AchievementRarity.EPIC,
    points: 100,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'conversion_rate', threshold: 0.25, minReferrals: 20 },
    badgeColor: '#F59E0B', // amber
    sortOrder: 120,
  },
  {
    slug: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Use 5 different marketing channels',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'Share2',
    rarity: AchievementRarity.COMMON,
    points: 30,
    targetRoles: ['AFFILIATE', 'REFERRER'],
    criteria: { type: 'marketing_channels', count: 5 },
    badgeColor: '#14B8A6', // teal
    sortOrder: 121,
  },

  // ========================================
  // AFFILIATE/REFERRER ACHIEVEMENTS - COMMUNITY
  // ========================================
  {
    slug: 'contest_winner',
    title: 'Contest Winner',
    description: 'Win a monthly referral contest',
    category: AchievementCategory.COMMUNITY,
    icon: 'Trophy',
    rarity: AchievementRarity.LEGENDARY,
    points: 200,
    targetRoles: ['AFFILIATE', 'REFERRER', 'TAX_PREPARER'],
    criteria: { type: 'contest_winner', position: 1 },
    badgeColor: '#FCD34D', // gold
    sortOrder: 130,
  },
  {
    slug: 'podium_finish',
    title: 'Podium Finish',
    description: 'Finish in top 3 of a contest',
    category: AchievementCategory.COMMUNITY,
    icon: 'Medal',
    rarity: AchievementRarity.EPIC,
    points: 100,
    targetRoles: ['AFFILIATE', 'REFERRER', 'TAX_PREPARER'],
    criteria: { type: 'contest_winner', position: 3 },
    badgeColor: '#C0C0C0', // silver
    sortOrder: 131,
  },
  {
    slug: 'top_ten',
    title: 'Top 10',
    description: 'Finish in top 10 of a contest',
    category: AchievementCategory.COMMUNITY,
    icon: 'Award',
    rarity: AchievementRarity.RARE,
    points: 50,
    targetRoles: ['AFFILIATE', 'REFERRER', 'TAX_PREPARER'],
    criteria: { type: 'contest_winner', position: 10 },
    badgeColor: '#CD7F32', // bronze
    sortOrder: 132,
  },

  // ========================================
  // UNIVERSAL ACHIEVEMENTS - ENGAGEMENT
  // ========================================
  {
    slug: 'dedicated',
    title: 'Dedicated',
    description: 'Log in for 7 consecutive days',
    category: AchievementCategory.STREAK,
    icon: 'Calendar',
    rarity: AchievementRarity.COMMON,
    points: 30,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'login_streak', days: 7 },
    badgeColor: '#3B82F6', // blue
    sortOrder: 200,
  },
  {
    slug: 'committed',
    title: 'Committed',
    description: 'Log in for 14 consecutive days',
    category: AchievementCategory.STREAK,
    icon: 'Calendar',
    rarity: AchievementRarity.RARE,
    points: 60,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'login_streak', days: 14 },
    badgeColor: '#2563EB', // darker blue
    sortOrder: 201,
  },
  {
    slug: 'unstoppable',
    title: 'Unstoppable',
    description: 'Log in for 30 consecutive days',
    category: AchievementCategory.STREAK,
    icon: 'Flame',
    rarity: AchievementRarity.EPIC,
    points: 120,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'login_streak', days: 30 },
    badgeColor: '#EF4444', // red
    sortOrder: 202,
  },
  {
    slug: 'morning_person',
    title: 'Morning Person',
    description: 'Log in before 8 AM',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'Coffee',
    rarity: AchievementRarity.COMMON,
    points: 15,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'early_login', hour: 8 },
    badgeColor: '#FCD34D', // yellow
    sortOrder: 203,
  },
  {
    slug: 'night_owl',
    title: 'Night Owl',
    description: 'Log in after 10 PM',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'Moon',
    rarity: AchievementRarity.COMMON,
    points: 15,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'late_login', hour: 22 },
    badgeColor: '#6366F1', // indigo
    sortOrder: 204,
  },
  {
    slug: 'communicator',
    title: 'Communicator',
    description: 'Send 50 messages',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'MessageSquare',
    rarity: AchievementRarity.COMMON,
    points: 20,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'messages_sent', threshold: 50 },
    badgeColor: '#14B8A6', // teal
    sortOrder: 205,
  },
  {
    slug: 'super_communicator',
    title: 'Super Communicator',
    description: 'Send 200 messages',
    category: AchievementCategory.ENGAGEMENT,
    icon: 'MessageCircle',
    rarity: AchievementRarity.RARE,
    points: 50,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'messages_sent', threshold: 200 },
    badgeColor: '#0D9488', // darker teal
    sortOrder: 206,
  },

  // ========================================
  // SPECIAL/SEASONAL ACHIEVEMENTS
  // ========================================
  {
    slug: 'tax_season_warrior',
    title: 'Tax Season Warrior',
    description: 'File 20+ returns during peak tax season (March-April)',
    category: AchievementCategory.SPECIAL,
    icon: 'Swords',
    rarity: AchievementRarity.EPIC,
    points: 150,
    targetRoles: ['TAX_PREPARER'],
    criteria: { type: 'seasonal_filing', season: 'peak', threshold: 20 },
    badgeColor: '#DC2626', // red
    sortOrder: 300,
  },
  {
    slug: 'early_adopter',
    title: 'Early Adopter',
    description: 'Join Tax Genius Pro during beta launch',
    category: AchievementCategory.SPECIAL,
    icon: 'Rocket',
    rarity: AchievementRarity.LEGENDARY,
    points: 250,
    targetRoles: ['TAX_PREPARER', 'AFFILIATE', 'REFERRER', 'CLIENT'],
    criteria: { type: 'signup_date', before: '2025-12-31' },
    badgeColor: '#9333EA', // purple
    sortOrder: 301,
  },
];

/**
 * Seed achievements into database
 */
export async function seedAchievements() {
  console.log('🎮 Seeding achievements...');

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: achievement,
      create: achievement,
    });
  }

  console.log(`✅ Seeded ${ACHIEVEMENTS.length} achievements successfully!`);
}

// Run if called directly
if (require.main === module) {
  seedAchievements()
    .catch((e) => {
      console.error('❌ Error seeding achievements:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
