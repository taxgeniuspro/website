'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePromptFormProps {
  onGenerate: (data: GenerationData) => Promise<void>;
  isGenerating?: boolean;
}

export interface GenerationData {
  prompt: string;
  negativePrompt?: string;
  provider: 'openai' | 'replicate';
  count: number;
  size: string;
  tags: string[];
  category?: string;
}

export function ImagePromptForm({ onGenerate, isGenerating = false }: ImagePromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [provider, setProvider] = useState<'openai' | 'replicate'>('openai');
  const [count, setCount] = useState(1);
  const [size, setSize] = useState('1024x1024');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const data: GenerationData = {
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      provider,
      count,
      size,
      tags,
      category: category.trim() || undefined,
    };

    try {
      await onGenerate(data);
      // Clear form on success
      setPrompt('');
      setNegativePrompt('');
      setTags([]);
      setCategory('');
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Generate AI Images
        </CardTitle>
        <CardDescription>
          Create images using AI. Enter a detailed prompt describing what you want to see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="A serene mountain landscape with a lake at sunset, vibrant colors, high detail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              required
              disabled={isGenerating}
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
            <Textarea
              id="negativePrompt"
              placeholder="blurry, low quality, watermark, text..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Describe what you DON&apos;T want to see in the image
            </p>
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select value={provider} onValueChange={(value: any) => setProvider(value)} disabled={isGenerating}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI DALL-E 3</SelectItem>
                  <SelectItem value="replicate">Replicate (Stable Diffusion)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <Label htmlFor="size">Image Size</Label>
              <Select value={size} onValueChange={setSize} disabled={isGenerating}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                  <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Variation Count */}
          <div className="space-y-2">
            <Label htmlFor="count">Number of Variations: {count}</Label>
            <Slider
              id="count"
              min={1}
              max={4}
              step={1}
              value={[count]}
              onValueChange={(value) => setCount(value[0])}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Generate multiple variations from the same prompt
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tags..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={isGenerating}
              />
              <Button type="button" onClick={handleAddTag} variant="outline" disabled={isGenerating}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              placeholder="e.g., hero, icon, background..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Images
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
