<script lang="ts">
  import { api } from '$lib/api/client';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userRole } from '$lib/stores/auth';
  import { ArrowLeft, Loader2, Coins } from '@lucide/svelte';

  let loading = $state(false);
  let error = $state<string | null>(null);
  let userCredits = $state<any[]>([]);
  let creditsLoading = $state(true);

  // Form State
  let selectedCreditId = $state('');
  let quantity = $state<number>(1);
  let pricePerCredit = $state<number>(0);
  let title = $state('');
  let description = $state('');
  let expiresInDays = $state<number>(30); // Default to number

  // Derived state for validation
  let selectedCredit = $derived(userCredits.find(c => c.id === selectedCreditId));
  let maxQuantity = $derived(selectedCredit ? selectedCredit.quantity : 0);

  onMount(async () => {
    // Check role
    if ($userRole !== 'developer' && $userRole !== 'administrator') {
        goto('/marketplace');
        return;
    }

    try {
        // Fetch user's credits to list
        const response = await api.getCredits({ status: 'active', limit: 100 });
        if (response.status === 'success' && response.data) {
            userCredits = response.data.credits;
        }
    } catch (e) {
        console.error('Failed to load credits', e);
    } finally {
        creditsLoading = false;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = null;

    if (!selectedCreditId) {
        error = "Please select a credit bundle to list";
        loading = false;
        return;
    }

    try {
        const response = await api.createListing({
            creditEntryId: selectedCreditId,
            quantity: Number(quantity),
            pricePerCredit: Number(pricePerCredit),
            title,
            description,
            expiresInDays: Number(expiresInDays)
        });

        if (response.status === 'success') {
            goto('/marketplace');
        } else {
            error = response.error?.message || "Failed to create listing";
        }
    } catch (err) {
        error = "An unexpected error occurred";
    } finally {
        loading = false;
    }
  }
</script>

<svelte:head>
  <title>Create Listing - Karbonica Marketplace</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6 animate-in">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <Button href="/marketplace" variant="ghost" size="icon">
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Create Listing</h1>
      <p class="text-sm text-muted-foreground">List your carbon credits for sale on the marketplace</p>
    </div>
  </div>

  <form onsubmit={handleSubmit} class="space-y-6">
    <Card.Root class="glass-card">
      <Card.Content class="space-y-6 pt-6">
        <!-- Credit Selection -->
        <div class="space-y-2">
            <Label>Select Credits to Sell</Label>
            {#if creditsLoading}
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 class="h-4 w-4 animate-spin" />
                    Loading your credits...
                </div>
            {:else if userCredits.length === 0}
                <div class="p-4 border rounded-lg bg-muted/50 text-center">
                    <p class="text-sm text-muted-foreground">You don't have any active credits to list.</p>
                    <Button href="/projects" variant="link" class="mt-2 text-primary">View My Projects</Button>
                </div>
            {:else}
                <Select.Root type="single" bind:value={selectedCreditId}>
                    <Select.Trigger class="w-full">
                        {selectedCredit 
                            ? `${selectedCredit.creditId} (${selectedCredit.quantity} available)` 
                            : "Select credit bundle"}
                    </Select.Trigger>
                    <Select.Content>
                        {#each userCredits as credit}
                            <Select.Item value={credit.id} aria-label={credit.creditId}>
                                <div class="flex flex-col text-left">
                                    <span class="font-medium">{credit.creditId}</span>
                                    <span class="text-xs text-muted-foreground">
                                        Vintage {credit.vintage} • {credit.quantity} tCO₂e available
                                    </span>
                                </div>
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            {/if}
        </div>

        {#if selectedCredit}
            <!-- Quantity -->
            <div class="space-y-2">
                <Label for="quantity">Quantity to List (tCO₂e)</Label>
                <div class="flex items-center gap-2">
                    <Input 
                        id="quantity" 
                        type="number" 
                        min="1" 
                        max={maxQuantity} 
                        bind:value={quantity}
                    />
                    <span class="text-sm text-muted-foreground whitespace-nowrap">
                        Max: {maxQuantity}
                    </span>
                </div>
            </div>
            
            <Separator />
            
            <!-- Price -->
            <div class="space-y-2">
                <Label for="price">Price per Credit (USD)</Label>
                <div class="relative">
                    <span class="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input 
                        id="price" 
                        type="number" 
                        min="0.01" 
                        step="0.01"
                        bind:value={pricePerCredit}
                        class="pl-7"
                    />
                </div>
            </div>

            <!-- Details -->
            <div class="space-y-2">
                <Label for="title">Listing Title</Label>
                <Input 
                    id="title" 
                    placeholder="e.g. Premium Rainforest Carbon Offsets" 
                    bind:value={title} 
                    required 
                    minlength="3"
                />
            </div>

            <div class="space-y-2">
                <Label for="description">Description (Optional)</Label>
                <Textarea 
                    id="description" 
                    placeholder="Describe the credits and project benefits..." 
                    bind:value={description}
                    class="h-32"
                />
            </div>

            <!-- Duration -->
             <div class="space-y-2">
                <Label for="expires">Listing Duration</Label>
                <Select.Root type="single" value={expiresInDays.toString()} onValueChange={(v) => expiresInDays = parseInt(v)}>
                    <Select.Trigger>
                        {expiresInDays ? `${expiresInDays} Days` : "Select duration"}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="7" label="7 Days" />
                        <Select.Item value="30" label="30 Days" />
                        <Select.Item value="90" label="90 Days" />
                        <Select.Item value="365" label="1 Year" />
                    </Select.Content>
                </Select.Root>
            </div>
        {/if}

        {#if error}
            <div class="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-md">
                {error}
            </div>
        {/if}
      </Card.Content>
      <Card.Footer class="justify-between border-t border-border/50 bg-muted/30 p-6">
        <Button variant="ghost" href="/marketplace">Cancel</Button>
        <Button type="submit" disabled={loading || !selectedCredit || quantity <= 0}>
            {#if loading}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                Creating Listing...
            {:else}
                Create Listing
            {/if}
        </Button>
      </Card.Footer>
    </Card.Root>
  </form>
</div>
