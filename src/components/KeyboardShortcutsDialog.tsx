'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, Search, Navigation, Zap, Command } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  available?: 'always' | 'dashboard' | 'forms' | 'tables';
}

interface ShortcutCategory {
  title: string;
  icon: React.ElementType;
  shortcuts: ShortcutItem[];
}

/**
 * Keyboard Shortcuts Documentation Dialog
 *
 * Displays all available keyboard shortcuts in the application.
 * Triggered by pressing "?" key.
 *
 * Features:
 * - Categorized shortcuts
 * - Platform-aware (shows ⌘ on Mac, Ctrl on Windows)
 * - Responsive design
 * - Accessible
 *
 * Industry standard pattern used by GitHub, Linear, Notion, etc.
 */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Detect platform
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Listen for "?" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === '?' && !isInputField && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }

      // Also close with Escape
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: ShortcutCategory[] = [
    {
      title: 'Navigation',
      icon: Navigation,
      shortcuts: [
        {
          keys: [modKey, 'K'],
          description: 'Open global search',
          available: 'always',
        },
        {
          keys: ['G', 'D'],
          description: 'Go to Dashboard',
          available: 'dashboard',
        },
        {
          keys: ['G', 'C'],
          description: 'Go to Clients',
          available: 'dashboard',
        },
        {
          keys: ['G', 'L'],
          description: 'Go to Leads',
          available: 'dashboard',
        },
        {
          keys: ['G', 'S'],
          description: 'Go to Settings',
          available: 'dashboard',
        },
      ],
    },
    {
      title: 'Search & Filtering',
      icon: Search,
      shortcuts: [
        {
          keys: [modKey, 'K'],
          description: 'Focus search',
          available: 'always',
        },
        {
          keys: ['/'],
          description: 'Quick search (alternative)',
          available: 'always',
        },
        {
          keys: ['Esc'],
          description: 'Clear search / Close dialogs',
          available: 'always',
        },
      ],
    },
    {
      title: 'Actions',
      icon: Zap,
      shortcuts: [
        {
          keys: [modKey, 'Enter'],
          description: 'Submit form',
          available: 'forms',
        },
        {
          keys: [modKey, 'N'],
          description: 'Create new (context-aware)',
          available: 'dashboard',
        },
        {
          keys: [modKey, 'S'],
          description: 'Save',
          available: 'forms',
        },
        {
          keys: ['?'],
          description: 'Show keyboard shortcuts',
          available: 'always',
        },
      ],
    },
    {
      title: 'Table Navigation',
      icon: Keyboard,
      shortcuts: [
        {
          keys: ['↑', '↓'],
          description: 'Navigate rows',
          available: 'tables',
        },
        {
          keys: ['Enter'],
          description: 'Open selected row',
          available: 'tables',
        },
        {
          keys: ['J', 'K'],
          description: 'Navigate rows (vim-style)',
          available: 'tables',
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="h-6 w-6" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts. Press <kbd className="px-2 py-1 text-xs font-semibold border rounded bg-muted">?</kbd> anytime to see this dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcuts.map((category, categoryIndex) => {
            const Icon = category.icon;
            return (
              <div key={categoryIndex}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">{category.title}</h3>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      {/* Description */}
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>

                      {/* Keys */}
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <kbd className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 font-mono text-xs font-semibold border rounded bg-muted shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs mx-1">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {categoryIndex < shortcuts.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Tips */}
        <div className="pt-4 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Command className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Pro Tip:</strong> Most shortcuts work throughout the application. Some are context-aware and activate when you're on specific pages (tables, forms, etc.).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
