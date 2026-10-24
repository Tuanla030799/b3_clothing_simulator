import { onBeforeRouteLeave } from 'vue-router'
import { useFeedback } from './useFeedback'

/**
 * Asks before leaving the page while `dirty()` is true. Call `allowLeave()` right before a
 * navigation that follows a successful save.
 */
export function useLeaveGuard(dirty: () => boolean) {
  const feedback = useFeedback()
  let allowed = false
  onBeforeRouteLeave(() => allowed || !dirty() || feedback.confirmLeave())
  return {
    allowLeave: () => {
      allowed = true
    },
  }
}
