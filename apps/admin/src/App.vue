<script setup lang="ts">
import { RouterView } from 'vue-router'
import { App as AntApp, ConfigProvider } from 'ant-design-vue'
import viVN from 'ant-design-vue/es/locale/vi_VN'
import { antTheme } from './theme'

const theme = antTheme()
</script>

<template>
  <ConfigProvider :theme="theme" :locale="viVN">
    <!-- AntApp gives message/modal the theme above (see composables/useFeedback). -->
    <AntApp>
      <RouterView />
    </AntApp>
  </ConfigProvider>
</template>
