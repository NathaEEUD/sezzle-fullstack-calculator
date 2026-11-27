import styles from './Display.module.css'

export function Display({ text }: { text: string }) {
  return (
    <output className={styles.display} aria-live="polite" aria-label="display">
      {text}
    </output>
  )
}
