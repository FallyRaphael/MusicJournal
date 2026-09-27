import { Outlet, ScrollRestoration } from 'react-router';
import { TabBar } from './TabBar';
import { UpdatePrompt } from './UpdatePrompt';
import styles from './AppShell.module.css';

/** Layout of the four tab screens: scrolling content above a fixed tab bar. */
export function AppShell() {
  return (
    <>
      <main className={styles.main}>
        <Outlet />
      </main>
      <TabBar />
      <UpdatePrompt />
      <ScrollRestoration />
    </>
  );
}
