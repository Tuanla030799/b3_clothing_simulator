import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import type { TableColumnType } from 'ant-design-vue'
import Sortable from 'sortablejs'
import { isListChanged, moveRow, sameOrder } from '../utils/listOrder'
import { useFeedback } from './useFeedback'
import { useLeaveGuard } from './useLeaveGuard'

/*
 * Sorting mode of an Ant Design Table (API docs/list-order-contract.md). Outside the mode the
 * table shows its normal (paged) rows without any ordering controls. `start()` loads the whole
 * list; rows are then moved locally, by drag and drop on the `.row-drag-handle` (ReorderHandle)
 * or with its up/down buttons, and `save()` sends the new order once (`PUT .../order`).
 * `cancel()` drops the changes. Leaving the page with unsaved changes asks first. When the list
 * changed meanwhile (409 LIST_CHANGED) nothing is saved: the mode closes and the table reloads.
 *
 * SortableJS moves the DOM row while dragging; the move is undone right away so Vue keeps
 * rendering from `rows` (Ant also puts a measure row in the tbody, so only `.ant-table-row` are
 * draggable).
 */
export function useSortMode<T>(options: {
  /** Element wrapping the Table (its tbody is found inside). */
  container: Ref<HTMLElement | null>
  /** Every row of the list in its current order. */
  loadAll: () => Promise<T[]>
  /** Saves the order (`PUT .../order`). */
  save: (ids: string[]) => Promise<unknown>
  /** Reloads the normal table after a save or a refused save. */
  reload: () => unknown
  /** Id the API orders by; defaults to `row.id`. */
  rowId?: (row: T) => string
}) {
  const feedback = useFeedback()
  const rowId = options.rowId ?? ((row: T) => (row as { id: string }).id)
  const active = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const rows = shallowRef<T[]>([])
  let initial: string[] = []

  const dirty = computed(() => active.value && !sameOrder(initial, rows.value.map(rowId)))
  useLeaveGuard(() => dirty.value)

  async function start() {
    if (active.value || loading.value) return
    loading.value = true
    try {
      rows.value = await options.loadAll()
      initial = rows.value.map(rowId)
      active.value = true
    } catch (error) {
      feedback.error(error)
    } finally {
      loading.value = false
    }
  }

  function close() {
    active.value = false
    rows.value = []
    initial = []
  }

  function cancel() {
    close()
  }

  async function save() {
    if (!dirty.value) return close()
    saving.value = true
    try {
      await options.save(rows.value.map(rowId))
      feedback.success('Đã lưu thứ tự.')
      close()
    } catch (error) {
      if (isListChanged(error)) {
        feedback.warning('Danh sách vừa thay đổi nên chưa lưu; đã tải lại, vui lòng sắp xếp lại.')
        close()
      } else {
        feedback.error(error)
        return
      }
    } finally {
      saving.value = false
    }
    await options.reload()
  }

  function moveTo(from: number, to: number) {
    rows.value = moveRow(rows.value, from, to)
  }

  /** Keyboard alternative: moves the row one place up (-1) or down (+1). */
  function moveBy(index: number, delta: number) {
    moveTo(index, index + delta)
  }

  let sortable: Sortable | null = null
  let body: HTMLElement | null = null
  function attach() {
    const next = active.value
      ? (options.container.value?.querySelector<HTMLElement>('.ant-table-tbody') ?? null)
      : null
    if (next === body) return
    sortable?.destroy()
    body = next
    sortable = body
      ? Sortable.create(body, {
          handle: '.row-drag-handle',
          draggable: '.ant-table-row',
          animation: 150,
          onEnd: (event) => {
            const { item, from, oldIndex, newIndex, oldDraggableIndex, newDraggableIndex } = event
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
            // Undo the DOM move; Vue renders the new order from `rows`.
            from.removeChild(item)
            from.insertBefore(item, from.children[oldIndex] ?? null)
            if (oldDraggableIndex !== undefined && newDraggableIndex !== undefined) {
              moveTo(oldDraggableIndex, newDraggableIndex)
            }
          },
        })
      : null
  }
  // The tbody appears (and may be replaced) when the rows render.
  watch(
    () => [options.container.value, active.value, rows.value],
    () => queueMicrotask(attach),
    { flush: 'post', immediate: true },
  )
  onBeforeUnmount(() => sortable?.destroy())

  return { active, loading, saving, rows, dirty, start, cancel, save, moveBy }
}

/** The table columns for the mode: `order` (handles) only while sorting, `actions` only outside. */
export function sortModeColumns<T>(
  columns: TableColumnType<T>[],
  sorting: boolean,
): TableColumnType<T>[] {
  return columns.filter((column) =>
    column.key === 'order' ? sorting : column.key === 'actions' ? !sorting : true,
  )
}
