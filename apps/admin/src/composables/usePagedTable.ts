import { computed, onScopeDispose, reactive, ref, shallowRef } from 'vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { errorMessage, type Paged } from '../api/httpClient'

/**
 * Server-paged rows for an Ant Design Table: `pagination` and `onChange` plug into the table;
 * `reload(true)` goes back to page 1 (after a filter change). Only the latest request commits.
 */
export function usePagedTable<T>(
  load: (page: number, pageSize: number) => Promise<Paged<T>>,
  initialPageSize = 20,
) {
  const rows = shallowRef<T[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const state = reactive({ page: 1, pageSize: initialPageSize, total: 0 })
  let request = 0
  let disposed = false

  async function reload(resetPage = false) {
    if (resetPage) state.page = 1
    const current = ++request
    loading.value = true
    error.value = null
    try {
      const result = await load(state.page, state.pageSize)
      if (current !== request || disposed) return
      // A deletion can leave the current page empty: step back to the last page.
      if (result.entries.length === 0 && state.page > 1 && result.paging.lastPage > 0) {
        state.page = result.paging.lastPage
        return reload()
      }
      rows.value = result.entries
      state.total = result.paging.total
    } catch (cause) {
      if (current === request && !disposed) error.value = errorMessage(cause)
    } finally {
      if (current === request && !disposed) loading.value = false
    }
  }

  onScopeDispose(() => (disposed = true))

  const pagination = computed<TablePaginationConfig>(() => ({
    current: state.page,
    pageSize: state.pageSize,
    total: state.total,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total: number) => `${total} mục`,
  }))

  function onChange(next: TablePaginationConfig) {
    state.page = next.current ?? 1
    state.pageSize = next.pageSize ?? state.pageSize
    void reload()
  }

  return { rows, loading, error, pagination, onChange, reload }
}
