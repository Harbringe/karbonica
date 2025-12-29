<script lang="ts">
  import { user, userRole } from '$lib/stores/auth';
  import { api } from '$lib/api/client';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Badge } from '$lib/components/ui/badge';
  import { onMount } from 'svelte';
  import {
    FolderTree,
    Coins,
    ShoppingCart,
    ClipboardCheck,
    TrendingUp,
    Plus,
    ArrowRight,
    Leaf,
    Trees,
    Sun,
    Wind,
    Waves,
    Factory,
    Mountain,
    CloudRain,
  } from '@lucide/svelte';

  // Dashboard stats
  let stats = $state({
    projects: 0,
    credits: 0,
    listings: 0,
    verifications: 0,
    loading: true,
  });

  let recentProjects = $state<Array<{ id: string; title: string; type: string; status: string }>>([]);
  let recentCredits = $state<Array<{ id: string; creditId: string; quantity: number; status: string }>>([]);

  const projectTypeIcons: Record<string, typeof Leaf> = {
    forest_conservation: Trees,
    renewable_energy: Sun,
    energy_efficiency: Factory,
    methane_capture: CloudRain,
    soil_carbon: Mountain,
    ocean_conservation: Waves,
    direct_air_capture: Wind,
  };

  const getProjectIcon = (type: string) => projectTypeIcons[type] || Leaf;

  onMount(async () => {
    // Load dashboard data
    try {
      const [projectsRes, creditsRes] = await Promise.all([
        api.getProjects({ limit: 5 }),
        api.getCredits({ limit: 5 }),
      ]);

      if (projectsRes.status === 'success' && projectsRes.data) {
        recentProjects = projectsRes.data.projects;
        stats.projects = projectsRes.data.pagination.total;
      }

      if (creditsRes.status === 'success' && creditsRes.data) {
        recentCredits = creditsRes.data.credits;
        stats.credits = creditsRes.data.pagination.total;
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      stats.loading = false;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'active':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'rejected':
      case 'retired':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Role-specific dashboard cards
  const getDashboardCards = (role: string | null) => {
    if (role === 'developer') {
      return [
        { label: 'My Projects', value: stats.projects, icon: FolderTree, href: '/projects' },
        { label: 'Total Credits', value: stats.credits, icon: Coins, href: '/credits' },
        { label: 'Active Listings', value: stats.listings, icon: ShoppingCart, href: '/marketplace' },
      ];
    }
    if (role === 'buyer') {
      return [
        { label: 'My Portfolio', value: stats.credits, icon: Coins, href: '/credits' },
        { label: 'Purchases', value: stats.listings, icon: ShoppingCart, href: '/marketplace' },
      ];
    }
    if (role === 'verifier') {
      return [
        { label: 'Pending Reviews', value: stats.verifications, icon: ClipboardCheck, href: '/verifications' },
        { label: 'Completed', value: 0, icon: TrendingUp, href: '/verifications' },
      ];
    }
    if (role === 'administrator') {
      return [
        { label: 'All Projects', value: stats.projects, icon: FolderTree, href: '/projects' },
        { label: 'All Credits', value: stats.credits, icon: Coins, href: '/credits' },
        { label: 'Marketplace', value: stats.listings, icon: ShoppingCart, href: '/marketplace' },
        { label: 'Verifications', value: stats.verifications, icon: ClipboardCheck, href: '/verifications' },
      ];
    }
    return [];
  };
</script>

<svelte:head>
  <title>Dashboard - Karbonica</title>
</svelte:head>

<div class="space-y-8 animate-in p-6">
  <!-- Welcome header -->
  <div>
    <h1 class="text-3xl font-bold">
      Welcome back, {$user?.name?.split(' ')[0] || 'User'}
    </h1>
    <p class="text-muted-foreground">
      Here's an overview of your carbon offset activities
    </p>
  </div>

  <!-- Stats cards -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {#if stats.loading}
      {#each [1, 2, 3] as _}
        <Card.Root>
          <Card.Header class="pb-2">
            <Skeleton class="h-4 w-24" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-8 w-16" />
          </Card.Content>
        </Card.Root>
      {/each}
    {:else}
      {#each getDashboardCards($userRole) as card}
        <Card.Root class="transition-shadow hover:shadow-md glass-card">
          <Card.Header class="flex flex-row items-center justify-between pb-2">
            <Card.Title class="text-sm font-medium text-muted-foreground">{card.label}</Card.Title>
            <card.icon class="h-5 w-5 text-muted-foreground" />
          </Card.Header>
          <Card.Content>
            <div class="flex items-end justify-between">
              <span class="text-3xl font-bold">{card.value}</span>
              <Button href={card.href} variant="ghost" size="sm" class="gap-1">
                View
                <ArrowRight class="h-4 w-4" />
              </Button>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    {/if}
  </div>

  <!-- Quick actions and recent items -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Recent Projects (for developers) -->
    {#if $userRole === 'developer' || $userRole === 'administrator'}
      <Card.Root class="glass-card">
        <Card.Header class="flex flex-row items-center justify-between">
          <div>
            <Card.Title>Recent Projects</Card.Title>
            <Card.Description>Your latest carbon offset projects</Card.Description>
          </div>
          <Button href="/projects/new" size="sm" class="gap-1">
            <Plus class="h-4 w-4" />
            New Project
          </Button>
        </Card.Header>
        <Card.Content>
          {#if stats.loading}
            <div class="space-y-3">
              {#each [1, 2, 3] as _}
                <Skeleton class="h-12 w-full" />
              {/each}
            </div>
          {:else if recentProjects.length === 0}
            <div class="py-8 text-center text-muted-foreground">
              <FolderTree class="mx-auto mb-2 h-8 w-8" />
              <p>No projects yet</p>
              <Button href="/projects/new" variant="link" class="mt-2">
                Create your first project
              </Button>
            </div>
          {:else}
            <div class="space-y-3">
              {#each recentProjects as project}
                {@const Icon = getProjectIcon(project.type)}
                <a
                  href="/projects/{project.id}"
                  class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon class="h-5 w-5 text-primary" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="truncate font-medium">{project.title}</p>
                    <p class="text-xs text-muted-foreground capitalize">
                      {project.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Badge class={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </a>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Recent Credits -->
    <Card.Root class="glass-card">
      <Card.Header class="flex flex-row items-center justify-between">
        <div>
          <Card.Title>
            {$userRole === 'buyer' ? 'My Portfolio' : 'Recent Credits'}
          </Card.Title>
          <Card.Description>
            {$userRole === 'buyer' ? 'Carbon credits you own' : 'Latest issued credits'}
          </Card.Description>
        </div>
        <Button href="/credits" variant="outline" size="sm">
          View All
        </Button>
      </Card.Header>
      <Card.Content>
        {#if stats.loading}
          <div class="space-y-3">
            {#each [1, 2, 3] as _}
              <Skeleton class="h-12 w-full" />
            {/each}
          </div>
        {:else if recentCredits.length === 0}
          <div class="py-8 text-center text-muted-foreground">
            <Coins class="mx-auto mb-2 h-8 w-8" />
            <p>No credits yet</p>
            {#if $userRole === 'buyer'}
              <Button href="/marketplace" variant="link" class="mt-2">
                Browse marketplace
              </Button>
            {/if}
          </div>
        {:else}
          <div class="space-y-3">
            {#each recentCredits as credit}
              <a
                href="/credits/{credit.id}"
                class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p class="font-mono text-sm font-medium">{credit.creditId}</p>
                  <p class="text-xs text-muted-foreground">
                    {credit.quantity.toLocaleString()} tCO₂e
                  </p>
                </div>
                <Badge class={getStatusColor(credit.status)}>
                  {credit.status}
                </Badge>
              </a>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
</div>
