<script setup>
import AppShell from './components/AppShell.vue'
import { useRoute } from 'vue-router'
import ToastHost from './components/ui/ToastHost.vue'
const route = useRoute()
</script>

<template>
  <RouterView v-if="route.meta.bare" />
  <AppShell v-else>
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.matched[0]?.path ?? route.path" />
      </Transition>
    </RouterView>
  </AppShell>
  <ToastHost />
</template>
