<script lang="ts">
  import { api } from '$lib/api/client';
  import { userRole } from '$lib/stores/auth';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Table from '$lib/components/ui/table';
  import { onMount } from 'svelte';
  import {
    Coins,
    ArrowRightLeft,
    Trash2,
    ShoppingCart,
    Plus,
  } from '@lucide/svelte';

  interface Credit {
    id: string;
    creditId: string;
    projectId: string;
    ownerId: string;
    quantity: number;
    vintage: number;
    status: string;
    issuedAt: string;
  }

  let credits = $state<Credit[]>([]);
  let loading = $state(true);
  let totalValue = $derived(credits.reduce((sum, c) => sum + c.quantity, 0));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'transferred':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'retired':
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  onMount(async () => {
    const response = await api.getCredits();
    if (response.status === 'success' && response.data) {
      credits = response.data.credits;
    }
    loading = false;
  });
</script>

<svelte:head>
  <title>Credits - Karbonica</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold">
        {$userRole === 'buyer' ? 'My Portfolio' : 'Carbon Credits'}
      </h1>
      <p class="text-muted-foreground">
        {$userRole === 'buyer' ? 'Manage your carbon credit holdings' : 'View and manage carbon credits'}
      </p>
    </div>
    {#if $userRole === 'buyer'}
      <Button href="/marketplace" class="gap-2">
        <ShoppingCart class="h-4 w-4" />
        Browse Marketplace
      </Button>
    {/if}
  </div>

  <!-- Summary cards -->
  <div class="grid gap-4 md:grid-cols-3">
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">Total Credits</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-8 w-24" />
        {:else}
          <div class="text-3xl font-bold">{totalValue.toLocaleString()}</div>
          <p class="text-sm text-muted-foreground">tCO₂e offset</p>
        {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">Active Credits</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-8 w-24" />
        {:else}
          <div class="text-3xl font-bold">
            {credits.filter(c => c.status === 'active').length}
          </div>
          <p class="text-sm text-muted-foreground">Available to trade</p>
        {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">Retired Credits</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-8 w-24" />
        {:else}
          <div class="text-3xl font-bold">
            {credits.filter(c => c.status === 'retired').reduce((sum, c) => sum + c.quantity, 0).toLocaleString()}
          </div>
          <p class="text-sm text-muted-foreground">Permanently offset</p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Credits table -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Credit Holdings</Card.Title>
      <Card.Description>Your carbon credit inventory</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if loading}
        <div class="space-y-3">
          {#each [1, 2, 3, 4, 5] as _}
            <Skeleton class="h-12 w-full" />
          {/each}
        </div>
      {:else if credits.length === 0}
        <div class="py-12 text-center">
          <Coins class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="text-lg font-semibold">No credits yet</h3>
          <p class="text-muted-foreground">
            {$userRole === 'buyer' 
              ? 'Purchase carbon credits from the marketplace'
              : 'Credits will appear here when your projects are verified'}
          </p>
          {#if $userRole === 'buyer'}
            <Button href="/marketplace" class="mt-4 gap-2">
              <ShoppingCart class="h-4 w-4" />
              Browse Marketplace
            </Button>
          {/if}
        </div>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Credit ID</Table.Head>
              <Table.Head>Vintage</Table.Head>
              <Table.Head>Quantity</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Issued</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each credits as credit}
              <Table.Row>
                <Table.Cell>
                  <a href="/credits/{credit.id}" class="font-mono text-sm hover:text-primary hover:underline">
                    {credit.creditId}
                  </a>
                </Table.Cell>
                <Table.Cell>{credit.vintage}</Table.Cell>
                <Table.Cell>{credit.quantity.toLocaleString()} tCO₂e</Table.Cell>
                <Table.Cell>
                  <Badge class={getStatusColor(credit.status)}>
                    {credit.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {new Date(credit.issuedAt).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell class="text-right">
                  {#if credit.status === 'active'}
                    <div class="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" class="gap-1">
                        <ArrowRightLeft class="h-4 w-4" />
                        Transfer
                      </Button>
                      <Button variant="ghost" size="sm" class="gap-1 text-destructive hover:text-destructive">
                        <Trash2 class="h-4 w-4" />
                        Retire
                      </Button>
                    </div>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
