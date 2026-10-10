import {
  BookOpen,
  ChevronRight,
  Dumbbell,
  History,
  ListChecks,
  Monitor,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { updateSettings, useSettings } from '../../db/settings';
import type { BudgetSignal } from '../../domain/model';
import { useStorageProtection, type StorageProtection } from '../../lib/storage';
import { useThemePreference, type ThemePreference } from '../../lib/theme';
import { Card } from '../../ui/Card';
import { FieldGroup } from '../../ui/Field';
import { PageHeader, Screen } from '../../ui/Screen';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Stepper } from '../../ui/Stepper';
import { BackupCard } from './BackupCard';
import { MethodsSheet, SectionTypesSheet } from './ListEditSheets';
import styles from './MoreScreen.module.css';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden="true" /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden="true" /> },
] as const satisfies readonly { value: ThemePreference; label: string; icon: ReactNode }[];

const SIGNAL_OPTIONS = [
  { value: 'soundAndVibration', label: 'Sound + vibration' },
  { value: 'vibration', label: 'Vibration' },
  { value: 'off', label: 'Off' },
] as const satisfies readonly { value: BudgetSignal; label: string }[];

const STORAGE_TEXT: Record<StorageProtection, string> = {
  protected: 'Protected: Chrome won’t clear your data to free up space.',
  notProtected: 'Not protected yet. Installing the app usually fixes this.',
  unsupported: 'Protection isn’t available here. It works once the app is online.',
};

function NavRow({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <li>
      <Link to={to} className={styles.navRow}>
        <Icon size={20} className={styles.mutedIcon} aria-hidden="true" />
        <span className={styles.navLabel}>{label}</span>
        <ChevronRight size={18} className={styles.mutedIcon} aria-hidden="true" />
      </Link>
    </li>
  );
}

export function MoreScreen() {
  const settings = useSettings();
  const [theme, setTheme] = useThemePreference();
  const storage = useStorageProtection();
  const [sheet, setSheet] = useState<'methods' | 'sections' | null>(null);

  return (
    <Screen>
      <PageHeader title="More" />

      <Card aria-label="Library">
        <ul className={styles.navList}>
          <NavRow to="/sessions" icon={History} label="Session history" />
          <NavRow to="/templates" icon={ListChecks} label="Templates" />
          <NavRow to="/technique" icon={Dumbbell} label="Technique items" />
          <NavRow to="/books" icon={BookOpen} label="Books" />
        </ul>
      </Card>

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
        <button type="button" className={styles.navRow} onClick={() => setSheet('methods')}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Practice methods</span>
            <span className={styles.rowHint}>{settings.methods.join(', ') || 'None'}</span>
          </span>
          <ChevronRight size={18} className={styles.mutedIcon} aria-hidden="true" />
        </button>
        <button type="button" className={styles.navRow} onClick={() => setSheet('sections')}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Section types</span>
            <span className={styles.rowHint}>Warm-up, Technique, Repertoire…</span>
          </span>
          <ChevronRight size={18} className={styles.mutedIcon} aria-hidden="true" />
        </button>
        <FieldGroup label="When an item’s time is up">
          <SegmentedControl
            legend="When an item’s time is up"
            name="budget-signal"
            options={SIGNAL_OPTIONS}
            value={settings.budgetSignal ?? 'soundAndVibration'}
            onChange={(budgetSignal) => void updateSettings({ budgetSignal })}
          />
        </FieldGroup>
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
      </Card>

      <BackupCard />

      <p className={styles.footer}>Practice Journal · version {__APP_VERSION__}</p>

      <MethodsSheet open={sheet === 'methods'} onClose={() => setSheet(null)} />
      <SectionTypesSheet open={sheet === 'sections'} onClose={() => setSheet(null)} />
    </Screen>
  );
}
