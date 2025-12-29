<script lang="ts">
  import { api } from "$lib/api/client";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { onMount } from "svelte";
  import {
    Search,
    Filter,
    ShoppingCart,
    Leaf,
    Trees,
    Sun,
    Wind,
    Waves,
    Factory,
    Mountain,
    CloudRain,
  } from "@lucide/svelte";

  interface Listing {
    id: string;
    sellerId: string;
    sellerName?: string;
    projectId: string;
    projectName?: string;
    projectType?: string;
    quantityAvailable: number;
    pricePerCredit: number;
    currency: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
  }

  let listings = $state<Listing[]>([]);
  let loading = $state(true);
  let searchQuery = $state("");
  let filterType = $state<string | null>(null);
  let sortBy = $state<"price_asc" | "price_desc" | "quantity">("price_asc");

  const projectTypes = [
    { value: "forest_conservation", label: "Forest Conservation", icon: Trees },
    { value: "renewable_energy", label: "Renewable Energy", icon: Sun },
    { value: "energy_efficiency", label: "Energy Efficiency", icon: Factory },
    { value: "methane_capture", label: "Methane Capture", icon: CloudRain },
    { value: "soil_carbon", label: "Soil Carbon", icon: Mountain },
    { value: "ocean_conservation", label: "Ocean Conservation", icon: Waves },
    { value: "direct_air_capture", label: "Direct Air Capture", icon: Wind },
  ];

  const projectTypeIcons: Record<string, typeof Leaf> = {
    forest_conservation: Trees,
    renewable_energy: Sun,
    energy_efficiency: Factory,
    methane_capture: CloudRain,
    soil_carbon: Mountain,
    ocean_conservation: Waves,
    direct_air_capture: Wind,
  };

  const getProjectIcon = (type: string | undefined) =>
    projectTypeIcons[type || ""] || Leaf;

  onMount(async () => {
    await loadListings();
  });

  async function loadListings() {
    loading = true;
    const params: Record<string, string | number> = {};
    if (filterType) params.projectType = filterType;

    const response = await api.getListings(params);
    if (response.status === "success" && response.data) {
      listings = response.data.listings;
    }
    loading = false;
  }

  const filteredListings = $derived(() => {
    let result = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false),
    );

    // Sort
    if (sortBy === "price_asc") {
      result = result.sort((a, b) => a.pricePerCredit - b.pricePerCredit);
    } else if (sortBy === "price_desc") {
      result = result.sort((a, b) => b.pricePerCredit - a.pricePerCredit);
    } else if (sortBy === "quantity") {
      result = result.sort((a, b) => b.quantityAvailable - a.quantityAvailable);
    }

    return result;
  });
</script>

<svelte:head>
  <title>Marketplace - Karbonica</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <h1 class="text-3xl font-bold">Marketplace</h1>
      <p class="text-muted-foreground">
        Buy verified carbon credits from trusted projects
      </p>
    </div>
  </div>

  <!-- Filters and search -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative flex-1">
      <Search
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        placeholder="Search listings..."
        bind:value={searchQuery}
        class="pl-10"
      />
    </div>

    <div class="flex gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="outline" class="gap-2">
              <Filter class="h-4 w-4" />
              Project Type
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onclick={() => {
              filterType = null;
              loadListings();
            }}
          >
            All Types
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {#each projectTypes as type}
            <DropdownMenu.Item
              onclick={() => {
                filterType = type.value;
                loadListings();
              }}
            >
              <type.icon class="mr-2 h-4 w-4" />
              {type.label}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="outline" class="gap-2">Sort</Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onclick={() => (sortBy = "price_asc")}>
            Price: Low to High
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => (sortBy = "price_desc")}>
            Price: High to Low
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => (sortBy = "quantity")}>
            Quantity Available
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

  <!-- Listings grid -->
  {#if loading}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each [1, 2, 3, 4, 5, 6] as _}
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-6 w-3/4" />
            <Skeleton class="h-4 w-1/2" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-16 w-full" />
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if filteredListings().length === 0}
    <Card.Root class="py-12 text-center">
      <ShoppingCart class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="text-lg font-semibold">No listings found</h3>
      <p class="text-muted-foreground">
        {searchQuery
          ? "Try a different search term"
          : "No carbon credits are currently listed for sale"}
      </p>
    </Card.Root>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredListings() as listing}
        {@const Icon = getProjectIcon(listing.projectType)}
        <a href="/marketplace/{listing.id}">
          <Card.Root
            class="h-full transition-all hover:shadow-lg hover:border-primary/50"
          >
            <Card.Header>
              <div class="flex items-start justify-between">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
                >
                  <Icon class="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary" class="capitalize">
                  {listing.projectType?.replace(/_/g, " ") || "Carbon Credit"}
                </Badge>
              </div>
              <Card.Title class="line-clamp-1">{listing.title}</Card.Title>
              {#if listing.projectName}
                <Card.Description class="line-clamp-1">
                  From: {listing.projectName}
                </Card.Description>
              {/if}
            </Card.Header>
            <Card.Content>
              {#if listing.description}
                <p class="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {listing.description}
                </p>
              {/if}
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">Available</span>
                  <span class="font-medium"
                    >{listing.quantityAvailable.toLocaleString()} tCO₂e</span
                  >
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-muted-foreground">Price</span>
                  <span class="text-lg font-bold text-primary">
                    ${listing.pricePerCredit.toFixed(2)}
                    <span class="text-sm font-normal text-muted-foreground"
                      >/tCO₂e</span
                    >
                  </span>
                </div>
              </div>
            </Card.Content>
            <Card.Footer>
              <Button class="w-full gap-2">
                <ShoppingCart class="h-4 w-4" />
                View Listing
              </Button>
            </Card.Footer>
          </Card.Root>
        </a>
      {/each}
    </div>
  {/if}
</div>
