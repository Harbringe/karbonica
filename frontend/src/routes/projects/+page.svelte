<script lang="ts">
  import { api } from "$lib/api/client";
  import { userRole } from "$lib/stores/auth";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { onMount } from "svelte";
  import {
    Plus,
    Search,
    Filter,
    Grid3x3,
    List,
    Trees,
    Sun,
    Wind,
    Waves,
    Factory,
    Mountain,
    CloudRain,
    Leaf,
    MapPin,
    Trash2,
    Loader2,
  } from "@lucide/svelte";

  interface Project {
    id: string;
    developerId: string;
    title: string;
    type: string;
    description: string;
    location: string;
    country: string;
    emissionsTarget: number;
    status: string;
    createdAt: string;
  }

  let projects = $state<Project[]>([]);
  let loading = $state(true);
  let searchQuery = $state("");
  let viewMode = $state<"grid" | "list">("grid");
  let filterType = $state<string | null>(null);
  let filterStatus = $state<string | null>(null);
  let deletingId = $state<string | null>(null);

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

  const getProjectIcon = (type: string) => projectTypeIcons[type] || Leaf;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  onMount(async () => {
    await loadProjects();
  });

  async function loadProjects() {
    loading = true;
    const params: Record<string, string> = {};
    if (filterType) params.type = filterType;
    if (filterStatus) params.status = filterStatus;

    const response = await api.getProjects(params);
    if (response.status === "success" && response.data) {
      projects = response.data.projects;
    }
    loading = false;
  }

  const filteredProjects = $derived(
    projects.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  async function handleDelete(e: Event, projectId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    deletingId = projectId;
    const response = await api.deleteProject(projectId);
    deletingId = null;

    if (response.status === "success") {
      projects = projects.filter((p) => p.id !== projectId);
    } else {
      alert(response.error?.message || "Failed to delete project");
    }
  }
</script>

<svelte:head>
  <title>Projects - Karbonica</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <h1 class="text-3xl font-bold">Projects</h1>
      <p class="text-muted-foreground">
        {$userRole === "developer"
          ? "Manage your carbon offset projects"
          : "Browse all carbon offset projects"}
      </p>
    </div>
    {#if $userRole === "developer" || $userRole === "administrator"}
      <Button href="/projects/new" class="gap-2">
        <Plus class="h-4 w-4" />
        New Project
      </Button>
    {/if}
  </div>

  <!-- Filters and search -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative flex-1">
      <Search
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        placeholder="Search projects..."
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
              Type
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onclick={() => {
              filterType = null;
              loadProjects();
            }}
          >
            All Types
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {#each projectTypes as type}
            <DropdownMenu.Item
              onclick={() => {
                filterType = type.value;
                loadProjects();
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
            <Button {...props} variant="outline" class="gap-2">
              <Filter class="h-4 w-4" />
              Status
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onclick={() => {
              filterStatus = null;
              loadProjects();
            }}
          >
            All Status
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onclick={() => {
              filterStatus = "pending";
              loadProjects();
            }}
          >
            Pending
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => {
              filterStatus = "verified";
              loadProjects();
            }}
          >
            Verified
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => {
              filterStatus = "rejected";
              loadProjects();
            }}
          >
            Rejected
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <div class="flex rounded-lg border">
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          onclick={() => (viewMode = "grid")}
        >
          <Grid3x3 class="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          onclick={() => (viewMode = "list")}
        >
          <List class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Projects grid/list -->
  {#if loading}
    <div
      class="grid gap-4 {viewMode === 'grid'
        ? 'md:grid-cols-2 lg:grid-cols-3'
        : ''}"
    >
      {#each [1, 2, 3, 4, 5, 6] as _}
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-6 w-3/4" />
            <Skeleton class="h-4 w-1/2" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-20 w-full" />
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if filteredProjects.length === 0}
    <Card.Root class="py-12 text-center">
      <Leaf class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="text-lg font-semibold">No projects found</h3>
      <p class="text-muted-foreground">
        {searchQuery
          ? "Try a different search term"
          : "Create your first carbon offset project"}
      </p>
      {#if $userRole === "developer"}
        <Button href="/projects/new" class="mt-4">Create Project</Button>
      {/if}
    </Card.Root>
  {:else}
    <div
      class="grid gap-4 {viewMode === 'grid'
        ? 'md:grid-cols-2 lg:grid-cols-3'
        : ''}"
    >
      {#each filteredProjects as project}
        {@const Icon = getProjectIcon(project.type)}
        <a href="/projects/{project.id}">
          <Card.Root
            class="h-full transition-all hover:shadow-lg hover:border-primary/50"
          >
            <Card.Header>
              <div class="flex items-start justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"
                >
                  <Icon class="h-6 w-6 text-primary" />
                </div>
                <div class="flex items-center gap-2">
                  <Badge class={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  {#if $userRole === "developer" || $userRole === "administrator"}
                    <button
                      onclick={(e) => handleDelete(e, project.id)}
                      disabled={deletingId === project.id}
                      class="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete project"
                    >
                      {#if deletingId === project.id}
                        <Loader2 class="h-4 w-4 animate-spin" />
                      {:else}
                        <Trash2 class="h-4 w-4" />
                      {/if}
                    </button>
                  {/if}
                </div>
              </div>
              <Card.Title class="line-clamp-1">{project.title}</Card.Title>
              <Card.Description class="flex items-center gap-1">
                <MapPin class="h-3 w-3" />
                {project.location}, {project.country}
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <p class="mb-4 line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Target</span>
                <span class="font-medium"
                  >{project.emissionsTarget.toLocaleString()} tCO₂e</span
                >
              </div>
            </Card.Content>
          </Card.Root>
        </a>
      {/each}
    </div>
  {/if}
</div>
