'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sun, Moon, Copy, Check, Download, Loader2, ExternalLink } from 'lucide-react'
import { useTheme } from 'next-themes'

interface ColorInfo {
  name: string
  cssVar: string
  lightValue: string
  darkValue: string
  description?: string
}

const colorGroups = {
  'Base Colors': [
    {
      name: 'Background',
      cssVar: '--background',
      lightValue: 'oklch(0.9383 0.0042 236.4993)',
      darkValue: 'oklch(0.2598 0.0306 262.6666)',
      description: 'Main background color',
    },
    {
      name: 'Foreground',
      cssVar: '--foreground',
      lightValue: 'oklch(0.3211 0 0)',
      darkValue: 'oklch(0.9219 0 0)',
      description: 'Primary text color',
    },
    {
      name: 'Card',
      cssVar: '--card',
      lightValue: 'oklch(1.0000 0 0)',
      darkValue: 'oklch(0.3106 0.0301 268.6365)',
      description: 'Card background',
    },
    {
      name: 'Card Foreground',
      cssVar: '--card-foreground',
      lightValue: 'oklch(0.3211 0 0)',
      darkValue: 'oklch(0.9219 0 0)',
      description: 'Text on cards',
    },
    {
      name: 'Popover',
      cssVar: '--popover',
      lightValue: 'oklch(1.0000 0 0)',
      darkValue: 'oklch(0.2900 0.0249 268.3986)',
      description: 'Popover background',
    },
    {
      name: 'Popover Foreground',
      cssVar: '--popover-foreground',
      lightValue: 'oklch(0.3211 0 0)',
      darkValue: 'oklch(0.9219 0 0)',
      description: 'Text in popovers',
    },
  ],
  'Semantic Colors': [
    {
      name: 'Primary',
      cssVar: '--primary',
      lightValue: 'oklch(0.6397 0.1720 36.4421)',
      darkValue: 'oklch(0.6397 0.1720 36.4421)',
      description: 'Main brand color - Tangerine Orange',
    },
    {
      name: 'Primary Foreground',
      cssVar: '--primary-foreground',
      lightValue: 'oklch(1.0000 0 0)',
      darkValue: 'oklch(1.0000 0 0)',
      description: 'Text on primary color',
    },
    {
      name: 'Secondary',
      cssVar: '--secondary',
      lightValue: 'oklch(0.9670 0.0029 264.5419)',
      darkValue: 'oklch(0.3095 0.0266 266.7132)',
      description: 'Secondary color',
    },
    {
      name: 'Secondary Foreground',
      cssVar: '--secondary-foreground',
      lightValue: 'oklch(0.4461 0.0263 256.8018)',
      darkValue: 'oklch(0.9219 0 0)',
      description: 'Text on secondary',
    },
    {
      name: 'Muted',
      cssVar: '--muted',
      lightValue: 'oklch(0.9846 0.0017 247.8389)',
      darkValue: 'oklch(0.3095 0.0266 266.7132)',
      description: 'Muted background',
    },
    {
      name: 'Muted Foreground',
      cssVar: '--muted-foreground',
      lightValue: 'oklch(0.5510 0.0234 264.3637)',
      darkValue: 'oklch(0.7155 0 0)',
      description: 'Muted text',
    },
    {
      name: 'Accent',
      cssVar: '--accent',
      lightValue: 'oklch(0.9119 0.0222 243.8174)',
      darkValue: 'oklch(0.3380 0.0589 267.5867)',
      description: 'Accent color',
    },
    {
      name: 'Accent Foreground',
      cssVar: '--accent-foreground',
      lightValue: 'oklch(0.3791 0.1378 265.5222)',
      darkValue: 'oklch(0.8823 0.0571 254.1284)',
      description: 'Text on accent',
    },
    {
      name: 'Destructive',
      cssVar: '--destructive',
      lightValue: 'oklch(0.6368 0.2078 25.3313)',
      darkValue: 'oklch(0.6368 0.2078 25.3313)',
      description: 'Destructive/error color',
    },
    {
      name: 'Destructive Foreground',
      cssVar: '--destructive-foreground',
      lightValue: 'oklch(1.0000 0 0)',
      darkValue: 'oklch(1.0000 0 0)',
      description: 'Text on destructive',
    },
  ],
  'Interactive Elements': [
    {
      name: 'Border',
      cssVar: '--border',
      lightValue: 'oklch(0.9022 0.0052 247.8822)',
      darkValue: 'oklch(0.3843 0.0301 269.7337)',
      description: 'Border color',
    },
    {
      name: 'Input',
      cssVar: '--input',
      lightValue: 'oklch(0.9700 0.0029 264.5420)',
      darkValue: 'oklch(0.3843 0.0301 269.7337)',
      description: 'Input background',
    },
    {
      name: 'Ring',
      cssVar: '--ring',
      lightValue: 'oklch(0.6397 0.1720 36.4421)',
      darkValue: 'oklch(0.6397 0.1720 36.4421)',
      description: 'Focus ring color',
    },
  ],
  'Chart Colors': [
    {
      name: 'Chart 1',
      cssVar: '--chart-1',
      lightValue: 'oklch(0.7156 0.0605 248.6845)',
      darkValue: 'oklch(0.7156 0.0605 248.6845)',
      description: 'Chart color 1',
    },
    {
      name: 'Chart 2',
      cssVar: '--chart-2',
      lightValue: 'oklch(0.7875 0.0917 35.9616)',
      darkValue: 'oklch(0.7693 0.0876 34.1875)',
      description: 'Chart color 2',
    },
    {
      name: 'Chart 3',
      cssVar: '--chart-3',
      lightValue: 'oklch(0.5778 0.0759 254.1573)',
      darkValue: 'oklch(0.5778 0.0759 254.1573)',
      description: 'Chart color 3',
    },
    {
      name: 'Chart 4',
      cssVar: '--chart-4',
      lightValue: 'oklch(0.5016 0.0849 259.4902)',
      darkValue: 'oklch(0.5016 0.0849 259.4902)',
      description: 'Chart color 4',
    },
    {
      name: 'Chart 5',
      cssVar: '--chart-5',
      lightValue: 'oklch(0.4241 0.0952 264.0306)',
      darkValue: 'oklch(0.4241 0.0952 264.0306)',
      description: 'Chart color 5',
    },
  ],
  'Sidebar Colors': [
    {
      name: 'Sidebar',
      cssVar: '--sidebar',
      lightValue: 'oklch(0.9030 0.0046 258.3257)',
      darkValue: 'oklch(0.3100 0.0283 267.7408)',
      description: 'Sidebar background',
    },
    {
      name: 'Sidebar Foreground',
      cssVar: '--sidebar-foreground',
      lightValue: 'oklch(0.3211 0 0)',
      darkValue: 'oklch(0.9219 0 0)',
      description: 'Sidebar text',
    },
    {
      name: 'Sidebar Primary',
      cssVar: '--sidebar-primary',
      lightValue: 'oklch(0.6397 0.1720 36.4421)',
      darkValue: 'oklch(0.6397 0.1720 36.4421)',
      description: 'Sidebar primary',
    },
    {
      name: 'Sidebar Primary Foreground',
      cssVar: '--sidebar-primary-foreground',
      lightValue: 'oklch(1.0000 0 0)',
      darkValue: 'oklch(1.0000 0 0)',
      description: 'Text on sidebar primary',
    },
    {
      name: 'Sidebar Accent',
      cssVar: '--sidebar-accent',
      lightValue: 'oklch(0.9119 0.0222 243.8174)',
      darkValue: 'oklch(0.3380 0.0589 267.5867)',
      description: 'Sidebar accent',
    },
    {
      name: 'Sidebar Accent Foreground',
      cssVar: '--sidebar-accent-foreground',
      lightValue: 'oklch(0.3791 0.1378 265.5222)',
      darkValue: 'oklch(0.8823 0.0571 254.1284)',
      description: 'Text on sidebar accent',
    },
    {
      name: 'Sidebar Border',
      cssVar: '--sidebar-border',
      lightValue: 'oklch(0.9276 0.0058 264.5313)',
      darkValue: 'oklch(0.3843 0.0301 269.7337)',
      description: 'Sidebar border',
    },
    {
      name: 'Sidebar Ring',
      cssVar: '--sidebar-ring',
      lightValue: 'oklch(0.6397 0.1720 36.4421)',
      darkValue: 'oklch(0.6397 0.1720 36.4421)',
      description: 'Sidebar focus ring',
    },
  ],
}

function ColorCard({ color, currentTheme }: { color: ColorInfo; currentTheme: string }) {
  const [copied, setCopied] = useState(false)
  const currentValue = currentTheme === 'dark' ? color.darkValue : color.lightValue

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {}
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-all duration-200">
      <div
        className="w-full h-20 rounded-md border border-border shadow-sm"
        style={{ backgroundColor: `var(${color.cssVar})` }}
      />

      <div className="space-y-2">
        <h3 className="font-medium text-card-foreground text-sm">{color.name}</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
              {color.cssVar}
            </code>
            <Button
              className="h-6 w-6 p-0"
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(color.cssVar)}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground break-all">
              {currentValue}
            </code>
            <Button
              className="h-6 w-6 p-0"
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(currentValue)}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        {color.description && <p className="text-xs text-muted-foreground">{color.description}</p>}
      </div>
    </div>
  )
}

export default function ThemeColors() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleImportTheme = async () => {
    if (!importUrl.trim()) {
      setImportMessage('Please enter a theme URL')
      return
    }

    setIsImporting(true)
    setImportMessage('')

    try {
      const response = await fetch('/api/themes/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: importUrl,
          applyImmediately: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import theme')
      }

      setImportMessage(`Theme "${data.theme.name}" imported and applied successfully!`)
      setImportUrl('')

      // Refresh the page to show new colors
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Failed to import theme')
    } finally {
      setIsImporting(false)
    }
  }

  if (!mounted) {
    return null
  }

  const currentTheme = theme || 'light'

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Theme Colors</h1>
              <p className="text-muted-foreground mt-1">
                Complete OKLCH color system with light and dark theme support
              </p>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Theme:</span>
              <Button
                className="gap-2"
                size="sm"
                variant="outline"
                onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              >
                {currentTheme === 'dark' ? (
                  <>
                    <Moon className="h-4 w-4" />
                    Dark
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    Light
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Theme Import */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Download className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">Import Theme</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Instantly apply themes from TweakCN, Shadcn, or any URL with CSS variables.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  disabled={isImporting}
                  placeholder="https://tweakcn.com/r/themes/..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <Button
                  className="gap-2 min-w-[120px]"
                  disabled={isImporting || !importUrl.trim()}
                  onClick={handleImportTheme}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Import & Apply
                    </>
                  )}
                </Button>
              </div>

              {importMessage && (
                <div
                  className={`text-sm p-3 rounded-md ${
                    importMessage.includes('success')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {importMessage}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p className="mb-1">
                  <strong>Supported sources:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>TweakCN themes (tweakcn.com)</li>
                  <li>Shadcn themes (ui.shadcn.com)</li>
                  <li>Direct CSS files with CSS variables</li>
                  <li>Any URL with JSON theme data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Color Groups */}
        {Object.entries(colorGroups).map(([groupName, colors]) => (
          <div key={groupName} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              {groupName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {colors.map((color) => (
                <ColorCard key={color.cssVar} color={color} currentTheme={currentTheme} />
              ))}
            </div>
          </div>
        ))}

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold text-card-foreground mb-3">About OKLCH Colors</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              This theme uses <strong>OKLCH</strong> (Oklch: Lightness, Chroma, Hue) color space for
              consistent and perceptually uniform colors across all themes.
            </p>
            <p>
              <strong>Format:</strong> oklch(lightness chroma hue) where lightness is 0-1, chroma is
              0-0.4+, and hue is 0-360 degrees.
            </p>
            <p>
              <strong>Primary Color:</strong> Tangerine Orange - oklch(0.6397 0.1720 36.4421)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
