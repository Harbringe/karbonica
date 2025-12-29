<script lang="ts">
  import { api } from '$lib/api/client';
  import { userRole } from '$lib/stores/auth';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Table from '$lib/components/ui/table';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    ClipboardCheck,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
  } from '@lucide/svelte';

  interface Verification {
    id: string;
    projectId: string;
    status: string;
    createdAt: string;
  }

  let verifications = $state<Verification[]>([]);
  let loading = $state(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'in_review':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      case 'pending':
      case 'in_review':
      default:
        return Clock;
    }
  };

  onMount(async () => {
    // Only verifiers and admins can access this page
    if ($userRole !== 'verifier' && $userRole !== 'administrator') {
      goto('/dashboard');
      return;
    }

    const response = await api.getVerifications();
    if (response.status === 'success' && response.data) {
      verifications = response.data.verifications;
    }
    loading = false;
  });

  const pendingCount = $derived(verifications.filter(v => v.status === 'pending').length);
</script>

<svelte:head>
  <title>Verifications - Karbonica</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-3xl font-bold">Verifications</h1>
    <p class="text-muted-foreground">Review and verify carbon offset project submissions</p>
  </div>

  <!-- Summary cards -->
  <div class="grid gap-4 md:grid-cols-3">
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">Pending Review</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-8 w-16" />
        {:else}
          <div class="flex items-center gap-2">
            <Clock class="h-5 w-5 text-yellow-500" />
            <span class="text-3xl font-bold">{pendingCount}</span>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">Approved</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-8 w-16" />
        {:else}
          <div class="flex items-center gap-2">
            <CheckCircle class="h-5 w-5 text-green-500" />
            <span class="text-3xl font-bold">
              {verifications.filter(v => v.status === 'approved').length}
            </span>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">Rejected</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loading}
          <Skeleton class="h-8 w-16" />
        {:else}
          <div class="flex items-center gap-2">
            <XCircle class="h-5 w-5 text-red-500" />
            <span class="text-3xl font-bold">
              {verifications.filter(v => v.status === 'rejected').length}
            </span>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Verifications table -->
  <Card.Root>
    <Card.Header>
      <Card.Title>All Verification Requests</Card.Title>
      <Card.Description>Click on a request to review the full details</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if loading}
        <div class="space-y-3">
          {#each [1, 2, 3, 4, 5] as _}
            <Skeleton class="h-12 w-full" />
          {/each}
        </div>
      {:else if verifications.length === 0}
        <div class="py-12 text-center">
          <ClipboardCheck class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="text-lg font-semibold">No verification requests</h3>
          <p class="text-muted-foreground">
            Verification requests will appear here when projects are submitted for review
          </p>
        </div>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Request ID</Table.Head>
              <Table.Head>Project ID</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Submitted</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each verifications as verification}
              <Table.Row>
                <Table.Cell class="font-mono text-sm">
                  {verification.id.slice(0, 8)}...
                </Table.Cell>
                <Table.Cell class="font-mono text-sm">
                  {verification.projectId.slice(0, 8)}...
                </Table.Cell>
                <Table.Cell>
                  <Badge class={getStatusColor(verification.status)}>
                    {@const StatusIcon = getStatusIcon(verification.status)}
                    <StatusIcon class="mr-1 h-3 w-3" />
                    {verification.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {new Date(verification.createdAt).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <Button 
                    href="/verifications/{verification.id}" 
                    variant="ghost" 
                    size="sm" 
                    class="gap-1"
                  >
                    <Eye class="h-4 w-4" />
                    Review
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
