<script setup lang="ts">
import { h, ref } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import { TreeSelect } from 'ant-design-vue'
import { type CategoryTreeNode, pathTo } from '../utils/categoryTree'

/*
 * Category picker of the admin (the shared Select has no tree): children are indented under their
 * parent and only show their own name; "+" / "−" expand or collapse a category, categories
 * without children have no icon. The closed select shows the full trail ("Áo › Áo thun") so two
 * categories with the same name in different branches cannot be confused. On opening, the tree is
 * collapsed except for the branch of the chosen category; searching by name expands the matches.
 * Build `treeData` with `categoryTree` / `parentTree` (utils/categoryTree.ts).
 */
const props = defineProps<{
  treeData: CategoryTreeNode[]
  placeholder?: string
}>()
const model = defineModel<string>()

const expanded = ref<string[]>([])
const search = ref('')

function onOpen(open: boolean) {
  if (!open) return
  search.value = ''
  // Parents of the chosen category (not the category itself: it may have children).
  expanded.value = pathTo(props.treeData, model.value).slice(0, -1)
}

// Rendered by the tree for every node; leaves get no icon (the tree skips them itself).
const switcherIcon = ({ expanded: open }: { expanded: boolean }) =>
  h(open ? Minus : Plus, { class: 'size-3.5', 'aria-hidden': 'true' })
</script>

<template>
  <TreeSelect
    v-model:value="model"
    v-model:search-value="search"
    :tree-data="treeData"
    tree-node-label-prop="trail"
    tree-node-filter-prop="title"
    show-search
    :tree-expanded-keys="search ? undefined : expanded"
    :switcher-icon="switcherIcon"
    :placeholder="placeholder"
    :list-height="320"
    class="w-full"
    @update:tree-expanded-keys="(keys: (string | number)[]) => (expanded = keys.map(String))"
    @dropdown-visible-change="onOpen"
  />
</template>
