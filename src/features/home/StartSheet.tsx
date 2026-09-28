import { CalendarPlus, ListChecks, PenLine, Plus, Repeat } from 'lucide-react';
import type { Session, SessionTemplate } from '../../domain/model';
import { sessionTime } from '../../domain/pieceStats';
import { formatDayLabel } from '../../lib/format';
import { ActionList, type Action } from '../../ui/ActionList';
import { Sheet } from '../../ui/Sheet';
import { planSummary } from '../session/starters';
import styles from './StartSheet.module.css';

interface StartSheetProps {
  open: boolean;
  onClose: () => void;
  templates: readonly SessionTemplate[];
  lastSession?: Session;
  now: Date;
  onTemplate: (template: SessionTemplate) => void;
  onRepeat: (session: Session) => void;
  onEmpty: () => void;
  onPlanLater: () => void;
  onLogPast: () => void;
}

/** The ways to start practicing, from Home's "Start session". */
export function StartSheet(props: StartSheetProps) {
  const { templates, lastSession, now } = props;

  const quick: Action[] = [
    ...templates.map((template) => ({
      label: template.name,
      description: planSummary(template.sections),
      icon: <ListChecks size={20} />,
      onSelect: () => props.onTemplate(template),
    })),
    ...(lastSession
      ? [
          {
            label: 'Repeat last session',
            description: `${formatDayLabel(new Date(sessionTime(lastSession)), now)} · ${planSummary(lastSession.sections)}`,
            icon: <Repeat size={20} />,
            onSelect: () => props.onRepeat(lastSession),
          },
        ]
      : []),
  ];

  const other: Action[] = [
    {
      label: 'Empty session',
      description: 'Pick what to practice first',
      icon: <Plus size={20} />,
      onSelect: props.onEmpty,
    },
    {
      label: 'Plan for later',
      description: 'Prepare a session for another day',
      icon: <CalendarPlus size={20} />,
      onSelect: props.onPlanLater,
    },
    {
      label: 'Log a past session',
      description: 'For when you practiced without the timer',
      icon: <PenLine size={20} />,
      onSelect: props.onLogPast,
    },
  ];

  return (
    <Sheet open={props.open} onClose={props.onClose} title="Start a session">
      {quick.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Start right away</h3>
          <ActionList actions={quick} />
        </section>
      )}
      <section className={styles.group}>
        {quick.length > 0 && <h3 className={styles.groupTitle}>Or</h3>}
        <ActionList actions={other} />
      </section>
    </Sheet>
  );
}
