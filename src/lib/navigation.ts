import { useLocation, useNavigate } from 'react-router';

/** Goes back in history, or to `fallback` if the app was opened directly on this page. */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key !== 'default') void navigate(-1);
    else void navigate(fallback, { replace: true });
  };
}
