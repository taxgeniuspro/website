'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Loader2, Sparkles, Save, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

// Form validation schema
const ContentGeneratorSchema = z.object({
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().max(50, 'State name too long').optional(),
  keywords: z.string().min(1, 'Keywords are required').max(500, 'Keywords too long'),
});

type ContentGeneratorForm = z.infer<typeof ContentGeneratorSchema>;

interface GeneratedContent {
  headline: string;
  bodyContent: string;
  metaTitle: string;
  metaDescription: string;
  qaAccordion: Array<{ question: string; answer: string }>;
  slug: string;
  city: string;
  state?: string;
  generatedBy: string;
  generatedAt: string;
}

export default function ContentGeneratorPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Editable content state (allows admin to modify before saving)
  const [editableHeadline, setEditableHeadline] = useState('');
  const [editableBodyContent, setEditableBodyContent] = useState('');
  const [editableMetaTitle, setEditableMetaTitle] = useState('');
  const [editableMetaDescription, setEditableMetaDescription] = useState('');

  const form = useForm<ContentGeneratorForm>({
    resolver: zodResolver(ContentGeneratorSchema),
    defaultValues: {
      city: '',
      state: '',
      keywords: '',
    },
  });

  const onGenerate = async (data: ContentGeneratorForm) => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }

      // Set generated content
      const content = result.data;
      setGeneratedContent(content);

      // Initialize editable fields
      setEditableHeadline(content.headline);
      setEditableBodyContent(content.bodyContent);
      setEditableMetaTitle(content.metaTitle);
      setEditableMetaDescription(content.metaDescription);

      toast.success('Content generated successfully!');
    } catch (error) {
      logger.error('Generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate content. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const onRegenerate = () => {
    if (!generatedContent) return;

    // Use the same form values to regenerate
    const currentValues = form.getValues();
    onGenerate(currentValues);
  };

  const onSave = async () => {
    if (!generatedContent) return;

    setIsSaving(true);

    try {
      // TODO: Implement save to database
      // Will create this endpoint in next step
      const response = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: generatedContent.slug,
          city: generatedContent.city,
          state: generatedContent.state,
          headline: editableHeadline,
          bodyContent: editableBodyContent,
          metaTitle: editableMetaTitle,
          metaDescription: editableMetaDescription,
          qaAccordion: generatedContent.qaAccordion,
          generatedBy: generatedContent.generatedBy,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save landing page');
      }

      toast.success(`Landing page saved for ${generatedContent.city}. Set to draft status.`);

      // Reset form and content
      form.reset();
      setGeneratedContent(null);
      setEditableHeadline('');
      setEditableBodyContent('');
      setEditableMetaTitle('');
      setEditableMetaDescription('');
    } catch (error) {
      logger.error('Save error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save landing page. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasRequiredContent =
    editableHeadline && editableBodyContent && editableMetaTitle && editableMetaDescription;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Content Generator</h1>
        <p className="text-muted-foreground">
          Generate SEO-optimized landing page content for Tax Genius locations
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Content
            </CardTitle>
            <CardDescription>
              Enter location details and keywords to generate content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-4">
              {/* City Input */}
              <div className="space-y-2">
                <Label htmlFor="city">City Name *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Atlanta"
                  {...form.register('city')}
                  disabled={isGenerating}
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                )}
              </div>

              {/* State Input */}
              <div className="space-y-2">
                <Label htmlFor="state">State (Optional)</Label>
                <Input
                  id="state"
                  placeholder="e.g., GA"
                  {...form.register('state')}
                  disabled={isGenerating}
                />
                {form.formState.errors.state && (
                  <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                )}
              </div>

              {/* Keywords Input */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords *</Label>
                <Textarea
                  id="keywords"
                  placeholder="e.g., tax preparation, tax filing, IRS audit, small business taxes"
                  rows={3}
                  {...form.register('keywords')}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
                {form.formState.errors.keywords && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.keywords.message}
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Generated Content Preview */}
        <div className="space-y-4">
          {generatedContent ? (
            <>
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={onRegenerate}
                  variant="outline"
                  disabled={isGenerating || isSaving}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button
                  onClick={onSave}
                  disabled={!hasRequiredContent || isGenerating || isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save to Database
                    </>
                  )}
                </Button>
              </div>

              {/* Editable Content Fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Headline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editableHeadline}
                    onChange={(e) => setEditableHeadline(e.target.value)}
                    rows={2}
                    className="font-semibold"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Body Content (HTML)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editableBodyContent}
                    onChange={(e) => setEditableBodyContent(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SEO Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meta Title</Label>
                    <Input
                      value={editableMetaTitle}
                      onChange={(e) => setEditableMetaTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description</Label>
                    <Textarea
                      value={editableMetaDescription}
                      onChange={(e) => setEditableMetaDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Q&A Accordion Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Q&A Accordion Preview</CardTitle>
                  <CardDescription>
                    This is how the Q&A section will appear on the landing page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {generatedContent.qaAccordion.map((qa, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{qa.question}</AccordionTrigger>
                        <AccordionContent>{qa.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Generated Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generated Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Slug:</span> {generatedContent.slug}
                  </div>
                  <div>
                    <span className="font-medium">Generated At:</span>{' '}
                    {new Date(generatedContent.generatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Generated content will appear here</p>
                <p className="text-sm mt-2">
                  Fill out the form and click &quot;Generate Content&quot;
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
