import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** A bottom sheet on phones, a centred dialog on wide screens. Closes on Escape and on a tap outside. */
export function Sheet({ open, onClose, title, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose()
      }}
    >
      <div className="px-6 pt-5 pb-6">
        <h2 className="mb-3 truncate text-title font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}

export function SheetButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center gap-3 border-t border-rule text-left text-body first-of-type:border-t-0"
    >
      {children}
    </button>
  )
}
