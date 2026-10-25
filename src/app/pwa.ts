import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

let updateReady = false
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined
const listeners = new Set<() => void>()

/** Registers the service worker. A new version waits until the app is closed or the user reloads. */
export function registerServiceWorker() {
  applyUpdate = registerSW({
    onNeedRefresh() {
      updateReady = true
      for (const listener of listeners) listener()
    },
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUpdateReady() {
  return useSyncExternalStore(subscribe, () => updateReady)
}

export function reloadWithUpdate() {
  void applyUpdate?.(true)
}
