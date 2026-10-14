<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input, InputPassword } from 'ant-design-vue'
import { Button, Container, Flex, FormField, Typography } from '@lituta/ui'
import { session } from '../api/client'
import { ApiError, errorMessage } from '../api/httpClient'
import { redirectTarget } from '../router'

const route = useRoute()
const router = useRouter()
const form = reactive({ email: '', password: '' })
const submitting = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (submitting.value) return
  error.value = null
  if (!form.email.trim() || !form.password) {
    error.value = 'Nhập email và mật khẩu.'
    return
  }
  submitting.value = true
  try {
    // The password is sent exactly as typed (the API never trims it).
    await session.login(form.email.trim(), form.password)
    void router.replace(redirectTarget(route.query.redirect) ?? '/')
  } catch (cause) {
    error.value =
      cause instanceof ApiError && cause.status === 401
        ? 'Email hoặc mật khẩu không đúng.'
        : errorMessage(cause)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-dvh bg-background py-16">
    <Container size="sm">
      <form
        class="mx-auto max-w-sm rounded-xl border bg-card p-6"
        novalidate
        @submit.prevent="submit"
      >
        <Flex vertical gap="middle">
          <Flex vertical :gap="4">
            <Typography as="h1" variant="title">Lituta Admin</Typography>
            <Typography variant="caption">Đăng nhập để quản lý cửa hàng.</Typography>
          </Flex>
          <FormField for="login-email" label="Email" required>
            <template #default="{ id, required }">
              <Input
                :id="id"
                v-model:value="form.email"
                type="email"
                autocomplete="username"
                :required="required"
                :disabled="submitting"
              />
            </template>
          </FormField>
          <FormField for="login-password" label="Mật khẩu" required>
            <template #default="{ id, required }">
              <InputPassword
                :id="id"
                v-model:value="form.password"
                autocomplete="current-password"
                :required="required"
                :disabled="submitting"
              />
            </template>
          </FormField>
          <Typography v-if="error" role="alert" weight="semibold" class="text-destructive">
            {{ error }}
          </Typography>
          <Button html-type="submit" block :loading="submitting">Đăng nhập</Button>
        </Flex>
      </form>
    </Container>
  </main>
</template>
