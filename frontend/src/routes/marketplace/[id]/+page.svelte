<script lang="ts">
  import { page } from '$app/state';
  import { api } from '$lib/api/client';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Input } from '$lib/components/ui/input';
  import { Separator } from '$lib/components/ui/separator';
  import { Label } from '$lib/components/ui/label';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userRole } from '$lib/stores/auth';
  import {
    ShoppingCart,
    ArrowLeft,
    Leaf,
    Trees,
    Sun,
    Wind,
    Waves,
    Factory,
    Mountain,
    CloudRain,
    ShieldCheck,
    CreditCard,
    Info,
    CheckCircle2
  } from '@lucide/svelte';

  let listing = $state<any>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  
  // Purchase state
  let purchaseQuantity = $state<number>(1);
  let purchaseLoading = $state(false);
  let purchaseSuccess = $state(false);
  let purchaseError = $state<string | null>(null);

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
    const listingId = page.params.id;
    
    try {
        // Fetch all listings and find the specific one
        // Ideally this would be a specific endpoint like api.getListing(id)
        const response = await api.getListings({ limit: 100 });
        if (response.status === 'success' && response.data) {
            listing = response.data.listings.find((l: any) => l.id === listingId);
            if (!listing) error = "Listing not found";
        } else {
            error = "Failed to load listings";
        }
    } catch (e) {
        error = "Network error";
    }
    
    loading = false;
  });

  async function handlePurchase() {
    if (!listing) return;
    
    purchaseLoading = true;
    purchaseError = null;
    
    const response = await api.purchaseListing(listing.id, purchaseQuantity);
    
    if (response.status === 'success') {
        purchaseSuccess = true;
    } else {
        purchaseError = response.error?.message || "Purchase failed";
    }
    
    purchaseLoading = false;
  }
</script>

<svelte:head>
  <title>{listing?.title || 'Listing Details'} - Karbonica Marketplace</title>
</svelte:head>

<div class="space-y-6 animate-in max-w-5xl mx-auto">
  <!-- Header / Navigation -->
  <div class="flex items-center justify-between">
    <Button href="/marketplace" variant="ghost" class="gap-2 pl-0 hover:pl-2 transition-all">
      <ArrowLeft class="h-4 w-4" />
      Back to Marketplace
    </Button>
  </div>

  {#if loading}
    <div class="space-y-6">
      <Skeleton class="h-12 w-2/3" />
      <div class="grid gap-6 md:grid-cols-3">
        <Skeleton class="h-64 md:col-span-2 rounded-xl" />
        <Skeleton class="h-64 rounded-xl" />
      </div>
    </div>
  {:else if error}
    <Card.Root class="glass-card border-red-200 dark:border-red-900/50">
      <Card.Content class="pt-6 text-center text-red-600 dark:text-red-400">
        <p>{error}</p>
        <Button variant="link" href="/marketplace" class="mt-4">Return to Marketplace</Button>
      </Card.Content>
    </Card.Root>
  {:else if listing}
    <div class="grid gap-8 md:grid-cols-3">
      <!-- Main Content -->
      <div class="space-y-6 md:col-span-2">
        <!-- Title & Header -->
        <div class="space-y-4">
            <div class="flex items-center gap-3">
                <Badge variant="outline" class="bg-primary/5 text-primary border-primary/20 capitalize gap-1">
                    {@const Icon = getProjectIcon(listing.projectType)}
                    <Icon class="h-3 w-3" />
                    {listing.projectType?.replace(/_/g, ' ') || 'Carbon Credit'}
                </Badge>
                {#if listing.projectName}
                    <Badge variant="secondary" class="gap-1">
                        <Leaf class="h-3 w-3" />
                        Project: {listing.projectName}
                    </Badge>
                {/if}
            </div>
            
            <h1 class="text-3xl font-bold tracking-tight md:text-4xl text-foreground">
                {listing.title}
            </h1>
            
            <div class="flex items-center gap-4 text-muted-foreground">
                <span class="flex items-center gap-1 text-sm">
                    <ShieldCheck class="h-4 w-4 text-green-600 dark:text-green-400" />
                    Verified Seller: {listing.sellerName || 'Unknown'}
                </span>
                <span class="flex items-center gap-1 text-sm">
                    <Info class="h-4 w-4" />
                    Listed {new Date(listing.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>

        <!-- Description -->
        <Card.Root class="glass-card">
          <Card.Header>
            <Card.Title>Description</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="leading-relaxed text-muted-foreground whitespace-pre-line">
              {listing.description || 'No description provided for this listing.'}
            </p>
          </Card.Content>
        </Card.Root>

        <!-- Project Info Link -->
        <Card.Root class="glass-card bg-muted/30">
            <Card.Content class="py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-background rounded-lg border">
                        <Leaf class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p class="font-medium text-sm">View Project Details</p>
                        <p class="text-xs text-muted-foreground">Learn more about the source of these credits</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" href={`/projects/${listing.projectId}`}>
                    View Project
                </Button>
            </Card.Content>
        </Card.Root>
      </div>

      <!-- Purchase Sidebar -->
      <div class="space-y-6">
        <Card.Root class="glass-card border-primary/20 shadow-lg relative overflow-hidden">
          <!-- Decorative background gradient -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
          
          <Card.Header>
            <Card.Title>Purchase Credits</Card.Title>
            <Card.Description>Secure purchase via smart contract</Card.Description>
          </Card.Header>
          
          <Card.Content class="space-y-6">
            <!-- Price Display -->
            <div class="flex items-baseline justify-between mb-2">
                <span class="text-sm text-muted-foreground">Price per Credit</span>
                <span class="text-3xl font-bold text-primary">
                    ${listing.pricePerCredit.toFixed(2)}
                </span>
            </div>

            <Separator />
            
            <!-- Quantity Input -->
            <div class="space-y-2">
                <Label for="quantity">Quantity (tCO₂e)</Label>
                <div class="flex items-center gap-2">
                    <Input 
                        id="quantity" 
                        type="number" 
                        min="1" 
                        max={listing.quantityAvailable} 
                        bind:value={purchaseQuantity}
                        class="text-lg font-medium"
                    />
                    <span class="text-muted-foreground text-sm whitespace-nowrap">
                        / {listing.quantityAvailable.toLocaleString()} available
                    </span>
                </div>
            </div>

            <!-- Total Calculation -->
            <div class="bg-muted/50 rounded-lg p-3 space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Subtotal</span>
                    <span>${(purchaseQuantity * listing.pricePerCredit).toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Fees (1%)</span>
                    <span>${(purchaseQuantity * listing.pricePerCredit * 0.01).toFixed(2)}</span>
                </div>
                <Separator class="my-2"/>
                <div class="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${(purchaseQuantity * listing.pricePerCredit * 1.01).toFixed(2)}</span>
                </div>
            </div>
            
            {#if purchaseError}
                <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md">
                    {purchaseError}
                </div>
            {/if}

            {#if purchaseSuccess}
                 <div class="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm p-3 rounded-md flex items-center gap-2">
                    <CheckCircle2 class="h-4 w-4" />
                    <div>
                        <p class="font-bold">Purchase Successful!</p>
                        <p>Your credits have been added to your portfolio.</p>
                    </div>
                </div>
                <Button class="w-full" href="/credits">View Portfolio</Button>
            {:else}
                {#if $userRole === 'buyer'}
                    <Button 
                        class="w-full h-12 text-lg shadow-md transition-all hover:scale-[1.02]" 
                        onclick={handlePurchase}
                        disabled={purchaseLoading || purchaseQuantity <= 0 || purchaseQuantity > listing.quantityAvailable}
                    >
                        {#if purchaseLoading}
                            Processing...
                        {:else}
                            <ShoppingCart class="mr-2 h-5 w-5" />
                            Buy Now
                        {/if}
                    </Button>
                {:else if $userRole}
                    <div class="text-center p-2 bg-muted/50 rounded text-sm text-muted-foreground">
                        Log in as a Buyer to purchase credits.
                    </div>
                {:else}
                    <Button href="/auth/login" variant="outline" class="w-full">
                        Login to Purchase
                    </Button>
                {/if}
            {/if}
          </Card.Content>
          
          <Card.Footer class="bg-muted/30 py-3 px-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck class="h-3 w-3" />
            Protected by Verified Audit Trail
          </Card.Footer>
        </Card.Root>
      </div>
    </div>
  {/if}
</div>
