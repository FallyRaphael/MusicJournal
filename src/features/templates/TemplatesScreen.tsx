import { ChevronRight, ListChecks, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRunningSession } from '../../db/sessions';
import { createTemplate, useTemplates } from '../../db/templates';
import { toDateKey } from '../../domain/dates';
import { BackButton } from '../../ui/BackButton';
import { Button, IconButton } from '../../ui/Button';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import { planSummary, QUICK_START, sessionFromTemplate } from '../session/starters';
import styles from './TemplatesScreen.module.css';

/** Session templates: routines that start with one tap. */
export function TemplatesScreen() {
  const navigate = useNavigate();
  const templates = useTemplates();
  const running = useRunningSession();
  const [today] = useState(() => toDateKey(new Date()));

  const create = async () => {
    const template = await createTemplate('New template', []);
    void navigate(`/templates/${template.id}`);
  };

  if (templates === undefined) return null;

  return (
    <Screen>
      <BackButton label="Back" fallback="/more" />
      <PageHeader
        title="Templates"
        actions={
          <IconButton label="New template" onClick={() => void create()}>
            <Plus size={24} />
          </IconButton>
        }
      />

      {templates.length === 0 ? (
        <>
          <EmptyState icon={<ListChecks size={24} aria-hidden="true" />} title="No templates yet">
            Save a routine you practice often, then start it from Home with one tap.
          </EmptyState>
          <Button variant="primary" size="lg" block onClick={() => void create()}>
            Create a template
          </Button>
        </>
      ) : (
        <ul className={styles.list}>
          {templates.map((template) => (
            <li key={template.id} className={styles.row}>
              <Link to={`/templates/${template.id}`} className={styles.link}>
                <span className={styles.name}>{template.name}</span>
                <span className={styles.summary}>{planSummary(template.sections)}</span>
              </Link>
              {!running && template.sections.length > 0 && (
                <Button
                  variant="soft"
                  onClick={() =>
                    void sessionFromTemplate(template, today).then((session) =>
                      navigate(`/sessions/${session.id}`, { state: QUICK_START }),
                    )
                  }
                >
                  Start
                </Button>
              )}
              <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
