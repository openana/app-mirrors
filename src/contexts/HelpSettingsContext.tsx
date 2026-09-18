import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { mirrorSites, defaultMirrorSiteId, type MirrorSite } from '@/config/mirror-sites';

interface HelpSettings {
  selectedSite: MirrorSite;
  sudoEnabled: boolean;
  httpsEnabled: boolean;
}

interface HelpSettingsContextValue extends HelpSettings {
  setSelectedSiteId: (id: string) => void;
  setSudoEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  setHttpsEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const HelpSettingsContext = createContext<HelpSettingsContextValue | null>(null);

function getInitialSite(): MirrorSite {
  return mirrorSites.find((s) => s.id === defaultMirrorSiteId) ?? mirrorSites[0]!;
}

export function HelpSettingsProvider({ children }: { children: ReactNode }) {
  const [selectedSite, setSelectedSite] = useState<MirrorSite>(getInitialSite);
  const [sudoEnabled, setSudoEnabledRaw] = useState(true);
  const [httpsEnabled, setHttpsEnabledRaw] = useState(true);

  const setSelectedSiteId = useCallback((id: string) => {
    const site = mirrorSites.find((s) => s.id === id);
    if (site) setSelectedSite(site);
  }, []);

  const setSudoEnabled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setSudoEnabledRaw(value);
    },
    [],
  );

  const setHttpsEnabled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setHttpsEnabledRaw(value);
    },
    [],
  );

  return (
    <HelpSettingsContext.Provider
      value={{ selectedSite, sudoEnabled, httpsEnabled, setSelectedSiteId, setSudoEnabled, setHttpsEnabled }}
    >
      {children}
    </HelpSettingsContext.Provider>
  );
}

export function useHelpSettings() {
  const ctx = useContext(HelpSettingsContext);
  if (!ctx) throw new Error('useHelpSettings must be used within HelpSettingsProvider');
  return ctx;
}
