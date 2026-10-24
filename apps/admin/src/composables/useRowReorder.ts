import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import Sortable from 'sortablejs'
import { useFeedback } from './useFeedback'

/*
 * Drag-and-drop ordering of an Ant Design Table. The API owns the order: a move only sends the
 * row's new neighbour (`afterId`, null = first) and the table reloads from the server. SortableJS
 * moves the DOM row while dragging; the move is undone right away so Vue keeps rendering from
 * the data (Ant also puts a measure row in the tbody, so only `.ant-table-row` are draggable).
 *
 * Rows are dragged by the `.row-drag-handle` element (ReorderHandle); its up/down buttons call
 * `moveBy` so the order can also be changed with the keyboard.
 */
export function useRowReorder<T>(options: {
  /** Element wrapping the Table (its tbody is found inside). */
  container: Ref<HTMLElement | null>
  rows: () => readonly T[]
  /** Id the API orders by; defaults to `row.id`. */
  rowId?: (row: T) => string
  move: (id: string, afterId: string | null) => Promise<unknown>
  /** Reloads the rows after a move (also after a failed one). */
  reload: () => unknown
  /** Ordering is off, e.g. on a page other than the first. */
  disabled?: () => boolean
}) {
  const feedback = useFeedback()
  const rowId = options.rowId ?? ((row: T) => (row as { id: string }).id)
  const moving = ref(false)
  let sortable: Sortable | null = null
  let body: HTMLElement | null = null

  async function moveTo(from: number, to: number) {
    const rows = [...options.rows()]
    if (from === to || from < 0 || to < 0 || to >= rows.length || moving.value) return
    const [moved] = rows.splice(from, 1)
    if (!moved) return
    rows.splice(to, 0, moved)
    moving.value = true
    try {
      await options.move(rowId(moved), to === 0 ? null : rowId(rows[to - 1]!))
    } catch (error) {
      feedback.error(error)
    } finally {
      moving.value = false
      await options.reload()
    }
  }

  /** Keyboard alternative: moves the row one place up (-1) or down (+1). */
  function moveBy(index: number, delta: number) {
    void moveTo(index, index + delta)
  }

  function attach() {
    const next = options.container.value?.querySelector<HTMLElement>('.ant-table-tbody') ?? null
    if (next === body) {
      sortable?.option('disabled', options.disabled?.() ?? false)
      return
    }
    sortable?.destroy()
    body = next
    sortable = body
      ? Sortable.create(body, {
          handle: '.row-drag-handle',
          draggable: '.ant-table-row',
          animation: 150,
          disabled: options.disabled?.() ?? false,
          onEnd: (event) => {
            const { item, from, oldIndex, newIndex, oldDraggableIndex, newDraggableIndex } = event
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
            // Undo the DOM move; the server order comes back with the reload.
            from.removeChild(item)
            from.insertBefore(item, from.children[oldIndex] ?? null)
            if (oldDraggableIndex !== undefined && newDraggableIndex !== undefined) {
              void moveTo(oldDraggableIndex, newDraggableIndex)
            }
          },
        })
      : null
  }

  // The tbody appears (and may be replaced) when the rows render.
  watch(
    () => [options.container.value, options.rows(), options.disabled?.()],
    () => queueMicrotask(attach),
    { flush: 'post', immediate: true },
  )
  onBeforeUnmount(() => sortable?.destroy())

  return { moving, moveBy }
}
