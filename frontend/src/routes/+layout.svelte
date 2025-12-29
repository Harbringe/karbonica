<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";
  import { auth, isAuthenticated } from "$lib/stores/auth";
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import AppSidebar from "$lib/components/layout/AppSidebar.svelte";
  import Footer from "$lib/components/layout/Footer.svelte";

  let { children } = $props();

  onMount(() => {
    auth.initialize();
  });

  // Public routes that don't need sidebar
  const publicRoutes = ["/", "/auth/login", "/auth/register"];
  const isPublicRoute = $derived(publicRoutes.includes(page.url.pathname));
</script>

<ModeWatcher defaultMode="light" />

{#if isPublicRoute}
  {@render children()}
{:else}
  <Sidebar.SidebarProvider>
    <AppSidebar />
    <Sidebar.SidebarInset class="flex flex-col min-h-screen">
      <main class="flex-1 p-6 overflow-auto">
        {@render children()}
      </main>
      <Footer />
    </Sidebar.SidebarInset>
  </Sidebar.SidebarProvider>
{/if}
