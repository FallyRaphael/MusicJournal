import { useParams } from 'react-router';
import { useSession } from '../../db/sessions';
import { BackButton } from '../../ui/BackButton';
import { EmptyState, Screen } from '../../ui/Screen';
import { SessionDetailScreen } from './SessionDetailScreen';
import { StageScreen } from './StageScreen';

/** `/sessions/:id` – the practice screen, or the summary once the session is finished. */
export function SessionRoute() {
  const { sessionId = '' } = useParams();
  const session = useSession(sessionId);

  if (session === undefined) return null;
  if (session === null) {
    return (
      <Screen>
        <BackButton label="Back" fallback="/" />
        <EmptyState title="Session not found">It may have been deleted.</EmptyState>
      </Screen>
    );
  }
  return session.status === 'finished' ? (
    <SessionDetailScreen key={session.id} session={session} />
  ) : (
    <StageScreen key={session.id} session={session} />
  );
}
