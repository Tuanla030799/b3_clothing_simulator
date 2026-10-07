<script setup lang="ts">
import { ref } from 'vue'
import { X } from '@lucide/vue'
import { Button, Container, Flex, Typography } from '@lituta/ui'
import { announcement } from '../data/siteData'

// Dismissal lasts for the page session only; nothing is persisted.
const dismissed = ref(false)
</script>

<template>
  <section v-if="!dismissed" aria-label="Thông báo" class="bg-secondary text-secondary-foreground">
    <Container>
      <Flex align="center" gap="small" class="min-h-11 py-1">
        <Typography variant="body" align="center" class="flex-1 text-sm">
          {{ announcement.text }}
        </Typography>
        <Button variant="text" size="small" aria-label="Đóng thông báo" @click="dismissed = true">
          <template #icon><X /></template>
        </Button>
      </Flex>
    </Container>
  </section>
</template>
