import styles from './ServiceAlert.module.css'

/** The service's message after service unavailable, shown verbatim (ADR-0004). */
export function ServiceAlert({ message }: { message: string | null }) {
  if (message === null) return null
  return (
    <p className={styles.alert} role="alert">
      {message}
    </p>
  )
}
