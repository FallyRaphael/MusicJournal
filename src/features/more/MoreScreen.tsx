import { HardDriveDownload, Monitor, Moon, ShieldAlert, ShieldCheck, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { updateSettings, useSettings } from '../../db/settings';
import { useStorageProtection, type StorageProtection } from '../../lib/storage';
import { useThemePreference, type ThemePreference } from '../../lib/theme';
import { Card } from '../../ui/Card';
import { PageHeader, Screen } from '../../ui/Screen';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Stepper } from '../../ui/Stepper';
import styles from './MoreScreen.module.css';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden="true" /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden="true" /> },
] as const satisfies readonly { value: ThemePreference; label: string; icon: ReactNode }[];

const STORAGE_TEXT: Record<StorageProtection, string> = {
  protected: 'Protected: Chrome won’t clear your data to free up space.',
  notProtected: 'Not protected yet. Installing the app usually fixes this.',
  unsupported: 'Protection isn’t available here. It works once the app is online.',
};

export function MoreScreen() {
  const settings = useSettings();
  const [theme, setTheme] = useThemePreference();
  const storage = useStorageProtection();

  return (
    <Screen>
      <PageHeader title="More" />

      <Card aria-labelledby="practice-title">
        <h2 id="practice-title" className={styles.sectionTitle}>
          Practice
        </h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Weekly target</span>
            <span className={styles.rowHint}>Sessions per week</span>
          </div>
          <Stepper
            label="Weekly target"
            value={settings.weeklyTarget}
            min={1}
            max={14}
            onChange={(weeklyTarget) => void updateSettings({ weeklyTarget })}
          />
        </div>
      </Card>

      <Card aria-labelledby="appearance-title">
        <h2 id="appearance-title" className={styles.sectionTitle}>
          Appearance
        </h2>
        <SegmentedControl
          legend="Theme"
          name="theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
        />
      </Card>

      <Card aria-labelledby="data-title">
        <h2 id="data-title" className={styles.sectionTitle}>
          Data
        </h2>
        <div className={styles.infoRow}>
          {storage === 'protected' ? (
            <ShieldCheck size={20} className={styles.okIcon} aria-hidden="true" />
          ) : (
            <ShieldAlert size={20} className={styles.mutedIcon} aria-hidden="true" />
          )}
          <span>{storage ? STORAGE_TEXT[storage] : 'Checking storage…'}</span>
        </div>
        <div className={styles.infoRow}>
          <HardDriveDownload size={20} className={styles.mutedIcon} aria-hidden="true" />
          <span className={styles.rowHint}>Backup &amp; restore arrive in a later build.</span>
        </div>
      </Card>

      <p className={styles.footer}>Practice Journal · version {__APP_VERSION__}</p>
    </Screen>
  );
}
