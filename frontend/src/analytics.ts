// Cookieless Real User Monitoring for Sandcastle.
//
// Uses @webmaxru/cookieless-insights (beacon transport): it never touches
// cookies, localStorage, or sessionStorage and keeps only an in-memory session
// id — so no cookie/GDPR consent banner is required. Data goes to a workspace-
// based Azure Application Insights on the free tier.
import { init, trackEvent, trackChangeDebounced } from '@webmaxru/cookieless-insights'

type Props = Record<string, string | number | boolean | undefined>

/**
 * Initialize RUM once at app startup. The connection string is a PUBLIC
 * client-side ingestion key injected at build time (repo variable in CI, `.env`
 * locally). Kill switch: telemetry is a safe no-op when the connection string
 * is absent, and can be force-disabled with `VITE_ANALYTICS_ENABLED=false`.
 */
export function initAnalytics(): void {
  init({
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
    cloudRole: 'sandcastle-web',
    // autoPageView defaults to true → a page view is sent on load.
  })
}

/** Track a discrete key interaction (button, toggle, preset, outbound link). */
export const track = (name: string, properties?: Props): void => trackEvent(name, properties)

/** Debounced typing signal — collapses a burst of keystrokes into one event. */
export const trackTyping = (key: string): void => trackChangeDebounced('prompt_typing', key)
