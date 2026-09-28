import { Ellipsis, Play, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useRunningSession } from '../../db/sessions';
import { deleteTemplate, mutateTemplate, useTemplate } from '../../db/templates';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import type { SessionTemplate, TemplateItem } from '../../domain/model';
import { changeBudget, planItems } from '../../domain/session';
import { useGoBack } from '../../lib/navigation';
import { ActionList } from '../../ui/ActionList';
import { Button, IconButton } from '../../ui/Button';
import { TextInput } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import { useLookups, type Lookups } from '../session/lookups';
import { BudgetControl, PlanEditor } from '../session/PlanEditor';
import styles from '../session/PlanScreen.module.css';
import { QUICK_START, sessionFromTemplate } from '../session/starters';

export function TemplateEditorScreen() {
  const { templateId = '' } = useParams();
  const template = useTemplate(templateId);
  const lookups = useLookups();

  if (template === undefined || !lookups.loaded) return null;
  if (template === null) return <Navigate to="/templates" replace />;
  return <TemplateEditor template={template} lookups={lookups} />;
}

function TemplateEditor({ template, lookups }: { template: SessionTemplate; lookups: Lookups }) {
  const navigate = useNavigate();
  const goBack = useGoBack('/templates');
  const running = useRunningSession();
  const [name, setName] = useState(template.name);
  const [sheet, setSheet] = useState<'menu' | 'delete' | null>(null);
  const [today] = useState(() => toDateKey(new Date()));

  const change = (update: (t: SessionTemplate) => SessionTemplate) =>
    void mutateTemplate(template.id, update);
  const saveName = () => {
    const clean = name.trim();
    if (clean && clean !== template.name) change((t) => ({ ...t, name: clean }));
  };
  const empty = planItems(template.sections).length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <IconButton label="Close" onClick={goBack}>
          <X size={22} />
        </IconButton>
        <h1 className={styles.heading}>Template</h1>
        <IconButton label="More options" onClick={() => setSheet('menu')}>
          <Ellipsis size={22} />
        </IconButton>
      </header>

      <main className={styles.content}>
        <TextInput
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={saveName}
        />
        <PlanEditor
          sections={template.sections}
          lookups={lookups}
          createItem={(ref): TemplateItem => ({ id: newId(), ref })}
          onChange={(update) => change((t) => ({ ...t, sections: update(t.sections) }))}
          timeControl={(item) => (
            <BudgetControl
              minutes={item.budgetMinutes ?? 0}
              onChange={(update) =>
                change((t) => ({ ...t, sections: changeBudget(t.sections, item.id, update) }))
              }
            />
          )}
        />
      </main>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          icon={<Play size={18} fill="currentColor" aria-hidden="true" />}
          disabled={empty || Boolean(running)}
          onClick={() => {
            saveName();
            void sessionFromTemplate(
              { ...template, name: name.trim() || template.name },
              today,
            ).then((session) => navigate(`/sessions/${session.id}`, { state: QUICK_START }));
          }}
        >
          Start session
        </Button>
      </footer>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title={template.name}>
        <ActionList
          actions={[
            {
              label: 'Delete template',
              icon: <Trash2 size={20} />,
              danger: true,
              onSelect: () => setSheet('delete'),
            },
          ]}
        />
      </Sheet>

      <Sheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Delete this template?"
        footer={
          <>
            <Button onClick={() => setSheet(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setSheet(null);
                goBack();
                void deleteTemplate(template.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Sessions you already practiced with it are kept.</p>
      </Sheet>
    </div>
  );
}
