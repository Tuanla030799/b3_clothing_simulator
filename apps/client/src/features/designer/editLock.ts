import { computed, ref, type ComputedRef } from 'vue'

/*
 * Temporary lock on changes to the gift set, designs and background. It is held while an image is
 * being exported so that the snapshot and what the customer sees cannot diverge. The mutation
 * functions themselves check it; disabling buttons in the UI is only a courtesy.
 */
export interface EditLock {
  readonly locked: ComputedRef<boolean>
  /** Returns a release function, or null when the lock is already held. */
  acquire(): (() => void) | null
}

export function createEditLock(): EditLock {
  const held = ref(false)
  return {
    locked: computed(() => held.value),
    acquire() {
      if (held.value) return null
      held.value = true
      let released = false
      return () => {
        if (released) return
        released = true
        held.value = false
      }
    },
  }
}
