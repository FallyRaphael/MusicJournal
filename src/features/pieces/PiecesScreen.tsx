import { Music, Plus } from 'lucide-react';
import { IconButton } from '../../ui/Button';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';

export function PiecesScreen() {
  return (
    <Screen>
      <PageHeader
        title="Pieces"
        actions={
          <IconButton label="Add piece" disabled>
            <Plus size={24} />
          </IconButton>
        }
      />
      <EmptyState icon={<Music size={24} aria-hidden="true" />} title="No pieces yet">
        Your repertoire lives here: what you're learning, maintaining, or have shelved.
      </EmptyState>
    </Screen>
  );
}
