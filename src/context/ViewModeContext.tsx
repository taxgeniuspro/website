'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type ViewMode = 'normal' | 'affiliate-only';

interface ViewModeContextType {
  viewMode: ViewMode;
  isAffiliateOnly: boolean;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: ReactNode;
  defaultMode?: ViewMode;
}

export function ViewModeProvider({ children, defaultMode = 'normal' }: ViewModeProviderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'normal' ? 'affiliate-only' : 'normal'));
  };

  const isAffiliateOnly = viewMode === 'affiliate-only';

  return (
    <ViewModeContext.Provider value={{ viewMode, isAffiliateOnly, toggleViewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewModeContext() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewModeContext must be used within a ViewModeProvider');
  }
  return context;
}
