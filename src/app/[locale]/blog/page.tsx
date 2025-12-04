'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  TrendingUp,
  DollarSign,
  Home,
  Briefcase,
  Calculator,
  Award,
  Clock,
  ArrowRight,
  Search,
  Mail,
  Calendar,
  User,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const blogPostsImages = [
  'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&q=80',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80',
  'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=600&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
  'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&q=80',
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
];

const categoriesIcons = [
  { icon: BookOpen, count: 9 },
  { icon: Briefcase, count: 3 },
  { icon: DollarSign, count: 2 },
  { icon: TrendingUp, count: 2 },
  { icon: Award, count: 2 },
];

export default function BlogPage() {
  const t = useTranslations('blog');

  const blogPosts = [
    {
      id: 1,
      title: t('posts.post1.title'),
      excerpt: t('posts.post1.excerpt'),
      category: t('posts.post1.category'),
      author: t('posts.post1.author'),
      date: t('posts.post1.date'),
      readTime: t('posts.post1.readTime'),
      image: blogPostsImages[0],
      featured: true,
      tags: [t('categories.deductions'), 'Tax Tips', 'Personal Tax'],
    },
    {
      id: 2,
      title: t('posts.post2.title'),
      excerpt: t('posts.post2.excerpt'),
      category: t('posts.post2.category'),
      author: t('posts.post2.author'),
      date: t('posts.post2.date'),
      readTime: t('posts.post2.readTime'),
      image: blogPostsImages[1],
      featured: true,
      tags: ['Self-Employment', t('categories.businessTax'), 'Quarterly Taxes'],
    },
    {
      id: 3,
      title: t('posts.post3.title'),
      excerpt: t('posts.post3.excerpt'),
      category: t('posts.post3.category'),
      author: t('posts.post3.author'),
      date: t('posts.post3.date'),
      readTime: t('posts.post3.readTime'),
      image: blogPostsImages[2],
      featured: true,
      tags: ['Home Office', t('categories.deductions'), 'Remote Work'],
    },
    {
      id: 4,
      title: t('posts.post4.title'),
      excerpt: t('posts.post4.excerpt'),
      category: t('posts.post4.category'),
      author: t('posts.post4.author'),
      date: t('posts.post4.date'),
      readTime: t('posts.post4.readTime'),
      image: blogPostsImages[3],
      tags: ['Cryptocurrency', t('categories.investments'), 'Tax Law'],
    },
    {
      id: 5,
      title: t('posts.post5.title'),
      excerpt: t('posts.post5.excerpt'),
      category: t('posts.post5.category'),
      author: t('posts.post5.author'),
      date: t('posts.post5.date'),
      readTime: t('posts.post5.readTime'),
      image: blogPostsImages[4],
      tags: ['Retirement', 'Tax Planning', '401k'],
    },
    {
      id: 6,
      title: t('posts.post6.title'),
      excerpt: t('posts.post6.excerpt'),
      category: t('posts.post6.category'),
      author: t('posts.post6.author'),
      date: t('posts.post6.date'),
      readTime: t('posts.post6.readTime'),
      image: blogPostsImages[5],
      tags: [t('categories.businessTax'), 'Deadlines', 'Small Business'],
    },
    {
      id: 7,
      title: t('posts.post7.title'),
      excerpt: t('posts.post7.excerpt'),
      category: t('posts.post7.category'),
      author: t('posts.post7.author'),
      date: t('posts.post7.date'),
      readTime: t('posts.post7.readTime'),
      image: blogPostsImages[6],
      tags: ['Real Estate', t('categories.investments'), 'Tax Strategy'],
    },
    {
      id: 8,
      title: t('posts.post8.title'),
      excerpt: t('posts.post8.excerpt'),
      category: t('posts.post8.category'),
      author: t('posts.post8.author'),
      date: t('posts.post8.date'),
      readTime: t('posts.post8.readTime'),
      image: blogPostsImages[7],
      tags: [t('categories.credits'), 'Child Tax Credit', 'Family Tax'],
    },
    {
      id: 9,
      title: t('posts.post9.title'),
      excerpt: t('posts.post9.excerpt'),
      category: t('posts.post9.category'),
      author: t('posts.post9.author'),
      date: t('posts.post9.date'),
      readTime: t('posts.post9.readTime'),
      image: blogPostsImages[8],
      tags: [t('categories.credits'), 'EV Tax Credit', 'Green Energy'],
    },
  ];

  const categories = [
    { name: t('categories.allPosts'), icon: categoriesIcons[0].icon, count: 9 },
    { name: t('categories.businessTax'), icon: categoriesIcons[1].icon, count: 3 },
    { name: t('categories.deductions'), icon: categoriesIcons[2].icon, count: 2 },
    { name: t('categories.investments'), icon: categoriesIcons[3].icon, count: 2 },
    { name: t('categories.credits'), icon: categoriesIcons[4].icon, count: 2 },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <Badge className="bg-primary/10 text-primary px-4 py-2">
              <BookOpen className="w-4 h-4 mr-2" />
              {t('hero.badge')}
            </Badge>

            <h1 className="text-4xl lg:text-6xl font-bold">
              {t('hero.title')} <span className="text-primary">{t('hero.titleHighlight')}</span>
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('hero.searchPlaceholder')}
                  className="pl-12 h-14 text-lg"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 border-y bg-card">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Button variant={i === 0 ? 'default' : 'outline'} className="gap-2">
                  <category.icon className="w-4 h-4" />
                  {category.name}
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                {t('featuredSection.title')}
              </h2>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {blogPosts
              .filter((post) => post.featured)
              .map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  whileHover={{ y: -10 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all group cursor-pointer h-full">
                    <div className="relative h-56 overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        width={600}
                        height={400}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                        {post.category}
                      </Badge>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed mt-2">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{post.date}</span>
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        Read More <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('latestSection.title')}</h2>
            <p className="text-muted-foreground">{t('latestSection.subtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {blogPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all group cursor-pointer h-full">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      width={600}
                      height={400}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 left-3 text-xs">{post.category}</Badge>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>{post.date}</span>
                      <span>{post.readTime}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button variant="outline" size="lg">
              {t('loadMore')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="max-w-4xl mx-auto overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="relative h-64 md:h-auto">
                  <Image
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80"
                    alt={t('newsletter.imageAlt')}
                    width={600}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-primary/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Mail className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-8 md:p-12 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold mb-3">{t('newsletter.title')}</h3>
                  <p className="text-muted-foreground mb-6">
                    {t('newsletter.subtitle')}
                  </p>

                  <div className="space-y-3">
                    <Input placeholder={t('newsletter.placeholder')} type="email" className="h-12" />
                    <Button variant="professional" className="w-full h-12">
                      {t('newsletter.button')}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {t('newsletter.disclaimer')}
                    </p>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-3xl lg:text-4xl font-bold">{t('cta.title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="professional" size="lg" asChild>
                <Link href="/start-filing">
                  {t('cta.buttonCPA')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">{t('cta.buttonContact')}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
