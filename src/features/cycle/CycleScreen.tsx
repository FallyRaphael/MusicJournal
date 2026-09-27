import { Target } from 'lucide-react';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';

export function CycleScreen() {
  return (
    <Screen>
      <PageHeader title="Cycle" />
      <EmptyState icon={<Target size={24} aria-hidden="true" />} title="No active cycle">
        A cycle is a block of days with goals for specific pieces and technique.
      </EmptyState>
    </Screen>
  );
}
