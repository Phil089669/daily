import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/PageHeader.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import { iconButton, primaryButton, secondaryButton, textInput } from '../../components/styles.ts'
import { createCategory, deleteCategory, renameCategory, reorder } from '../../data/actions.ts'
import type { CategoryRecord } from '../../data/db.ts'
import { useHabitData } from '../../data/hooks.ts'
import { store } from '../../data/instance.ts'

/** Saves the new name when the field loses focus or Enter is pressed. */
function CategoryName({ category }: { category: CategoryRecord }) {
  const [name, setName] = useState(category.name)
  const commit = () => {
    if (name.trim() && name.trim() !== category.name) void renameCategory(store, category, name)
    else setName(category.name)
  }
  return (
    <input
      className={`${textInput} min-w-0 flex-1`}
      aria-label={`Name der Kategorie ${category.name}`}
      value={name}
      onChange={(event) => setName(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export function CategoriesPage() {
  const data = useHabitData()
  const [newName, setNewName] = useState('')
  const [toDelete, setToDelete] = useState<CategoryRecord | null>(null)
  if (!data) return null
  const { categories } = data

  function move(index: number, offset: number) {
    const ordered = [...categories]
    const [category] = ordered.splice(index, 1)
    ordered.splice(index + offset, 0, category)
    void reorder(store, 'categories', ordered)
  }

  async function add(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    await createCategory(store, newName, categories.length)
    setNewName('')
  }

  const habitsIn = (category: CategoryRecord) => data.allHabits.filter((habit) => habit.categoryId === category.id).length

  return (
    <>
      <PageHeader title="Kategorien" back="/gewohnheiten" />
      <p className="mb-6 text-muted">Kategorien gruppieren deine Gewohnheiten auf Heute.</p>
      <ul className="mb-8 space-y-2">
        {categories.map((category, index) => (
          <li key={category.id} className="flex items-center gap-1">
            <CategoryName key={category.updatedAt} category={category} />
            <button type="button" className={iconButton} aria-label={`${category.name} nach oben`} disabled={index === 0} onClick={() => move(index, -1)}>
              <ArrowUp size={20} />
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label={`${category.name} nach unten`}
              disabled={index === categories.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={20} />
            </button>
            <button type="button" className={`${iconButton} -mr-3`} aria-label={`${category.name} löschen`} onClick={() => setToDelete(category)}>
              <Trash2 size={20} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex gap-2">
        <input className={`${textInput} min-w-0 flex-1`} aria-label="Neue Kategorie" placeholder="Neue Kategorie" value={newName} onChange={(event) => setNewName(event.target.value)} />
        <button type="submit" className={secondaryButton} disabled={!newName.trim()}>
          Hinzufügen
        </button>
      </form>

      <Sheet open={toDelete !== null} onClose={() => setToDelete(null)} title={`„${toDelete?.name ?? ''}“ löschen?`}>
        <p className="mb-5 text-muted">
          {toDelete && habitsIn(toDelete) > 0
            ? `${habitsIn(toDelete)} Gewohnheiten bleiben erhalten und stehen danach ohne Kategorie da.`
            : 'Die Kategorie ist leer.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButton}
            onClick={async () => {
              if (toDelete) await deleteCategory(store, toDelete, data.allHabits)
              setToDelete(null)
            }}
          >
            Löschen
          </button>
          <button type="button" className={secondaryButton} onClick={() => setToDelete(null)}>
            Abbrechen
          </button>
        </div>
      </Sheet>
    </>
  )
}
