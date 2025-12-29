<script lang="ts">
  import { page } from "$app/state";
  import { api } from "$lib/api/client";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Separator } from "$lib/components/ui/separator";
  import { onMount } from "svelte";
  import {
    MapPin,
    Calendar,
    Leaf,
    Trees,
    Sun,
    Wind,
    Waves,
    Factory,
    Mountain,
    CloudRain,
    ArrowLeft,
    Share2,
    ShieldCheck,
    Globe,
    Target,
    Clock,
    Building,
    FileText,
  } from "@lucide/svelte";

  let project = $state<any>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let documents = $state<
    Array<{
      id: string;
      name: string;
      description?: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      uploadedAt: string;
    }>
  >([]);

  const projectTypeIcons: Record<string, typeof Leaf> = {
    forest_conservation: Trees,
    renewable_energy: Sun,
    energy_efficiency: Factory,
    methane_capture: CloudRain,
    soil_carbon: Mountain,
    ocean_conservation: Waves,
    direct_air_capture: Wind,
  };

  const projectTypeImages: Record<string, string> = {
    forest_conservation:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop",
    renewable_energy:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=400&fit=crop",
    energy_efficiency:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
    methane_capture:
      "https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=800&h=400&fit=crop",
    soil_carbon:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=400&fit=crop",
    ocean_conservation:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=400&fit=crop",
    direct_air_capture:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=400&fit=crop",
  };

  const getProjectIcon = (type: string) => projectTypeIcons[type] || Leaf;

  // Get project image - use uploaded image if available, otherwise use placeholder
  const getProjectImage = (proj: any) => {
    if (proj?.imageUrl) return proj.imageUrl;
    return (
      projectTypeImages[proj?.type] || projectTypeImages.forest_conservation
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMapUrl = (lat: number | undefined, lon: number | undefined) => {
    if (!lat || !lon) return null;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05},${lat - 0.05},${lon + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lon}`;
  };

  onMount(async () => {
    const projectId = page.params.id;
    const response = await api.getProject(projectId);

    if (response.status === "success" && response.data) {
      project = response.data.project;

      // Fetch documents for this project
      const docsResponse = await api.getProjectDocuments(projectId);
      if (docsResponse.status === "success" && docsResponse.data) {
        documents = docsResponse.data.documents;
      }
    } else {
      error = response.error?.message || "Failed to load project";
    }
    loading = false;
  });
</script>

<svelte:head>
  <title>{project?.title || "Project Details"} - Karbonica</title>
</svelte:head>

<div class="space-y-6 animate-in pb-8">
  <!-- Header / Navigation -->
  <div class="flex items-center justify-between">
    <Button
      href="/projects"
      variant="ghost"
      class="gap-2 pl-0 hover:pl-2 transition-all"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to Projects
    </Button>
    <div class="flex gap-2">
      <Button variant="outline" size="sm" class="gap-2">
        <Share2 class="h-4 w-4" />
        Share
      </Button>
      {#if project?.status === "verified"}
        <Button
          variant="outline"
          size="sm"
          class="gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
        >
          <ShieldCheck class="h-4 w-4" />
          View Certificate
        </Button>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="space-y-6">
      <Skeleton class="h-48 w-full rounded-xl" />
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
        <Button variant="link" href="/projects" class="mt-4"
          >Return to Projects</Button
        >
      </Card.Content>
    </Card.Root>
  {:else if project}
    <!-- Hero Image -->
    <div class="relative h-48 md:h-64 rounded-2xl overflow-hidden">
      <img
        src={getProjectImage(project)}
        alt={project.title}
        class="w-full h-full object-cover"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
      ></div>

      <!-- Overlay Content -->
      <div class="absolute bottom-0 left-0 right-0 p-6">
        <div class="flex items-end justify-between">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <Badge
                class={`${getStatusColor(project.status)} backdrop-blur-sm`}
              >
                {project.status}
              </Badge>
              <span class="text-sm text-white/80 flex items-center gap-1">
                <Calendar class="h-3 w-3" />
                Started {new Date(project.startDate).toLocaleDateString()}
              </span>
            </div>
            <h1
              class="text-2xl md:text-4xl font-bold tracking-tight text-white"
            >
              {project.title}
            </h1>
            <p class="flex items-center gap-2 text-white/80">
              <MapPin class="h-4 w-4" />
              {project.location}, {project.country}
            </p>
          </div>

          <div
            class="hidden md:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg"
          >
            <svelte:component
              this={getProjectIcon(project.type)}
              class="h-8 w-8 text-white"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Quick Stats Row -->
        <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card.Root class="glass-card">
            <Card.Content class="pt-4 pb-4">
              <div class="flex flex-col items-center text-center">
                <div class="p-2 bg-primary/10 rounded-lg mb-2">
                  <Target class="h-5 w-5 text-primary" />
                </div>
                <p class="text-xs text-muted-foreground">Emissions Target</p>
                <p class="text-lg font-bold">
                  {project.emissionsTarget.toLocaleString()}
                </p>
                <p class="text-xs text-muted-foreground">tCO₂e</p>
              </div>
            </Card.Content>
          </Card.Root>

          <Card.Root class="glass-card">
            <Card.Content class="pt-4 pb-4">
              <div class="flex flex-col items-center text-center">
                <div class="p-2 bg-blue-500/10 rounded-lg mb-2">
                  <Globe class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p class="text-xs text-muted-foreground">Project Type</p>
                <p class="text-sm font-semibold capitalize">
                  {project.type.replace(/_/g, " ")}
                </p>
              </div>
            </Card.Content>
          </Card.Root>

          <Card.Root class="glass-card">
            <Card.Content class="pt-4 pb-4">
              <div class="flex flex-col items-center text-center">
                <div class="p-2 bg-orange-500/10 rounded-lg mb-2">
                  <Clock class="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <p class="text-xs text-muted-foreground">Duration</p>
                <p class="text-sm font-semibold">
                  {Math.ceil(
                    (Date.now() - new Date(project.startDate).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )} days
                </p>
              </div>
            </Card.Content>
          </Card.Root>

          <Card.Root class="glass-card">
            <Card.Content class="pt-4 pb-4">
              <div class="flex flex-col items-center text-center">
                <div class="p-2 bg-purple-500/10 rounded-lg mb-2">
                  <Building
                    class="h-5 w-5 text-purple-600 dark:text-purple-400"
                  />
                </div>
                <p class="text-xs text-muted-foreground">Region</p>
                <p class="text-sm font-semibold">{project.country}</p>
              </div>
            </Card.Content>
          </Card.Root>
        </div>

        <!-- Project Description -->
        <Card.Root class="glass-card">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <FileText class="h-5 w-5 text-primary" />
              About this Project
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <p
              class="leading-relaxed text-muted-foreground whitespace-pre-line"
            >
              {project.description}
            </p>
          </Card.Content>
        </Card.Root>

        <!-- Environmental Impact -->
        <Card.Root
          class="glass-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
        >
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Leaf class="h-5 w-5 text-primary" />
              Environmental Impact
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="grid gap-4 sm:grid-cols-2">
              <div
                class="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl"
              >
                <div class="p-3 bg-primary/20 rounded-xl">
                  <Target class="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p class="text-sm font-medium text-muted-foreground">
                    Carbon Reduction Target
                  </p>
                  <p class="text-2xl font-bold text-foreground">
                    {project.emissionsTarget.toLocaleString()}
                    <span class="text-sm font-normal text-muted-foreground"
                      >tCO₂e</span
                    >
                  </p>
                </div>
              </div>

              <div
                class="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl"
              >
                <div class="p-3 bg-green-500/20 rounded-xl">
                  <Trees class="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p class="text-sm font-medium text-muted-foreground">
                    Equivalent Trees
                  </p>
                  <p class="text-2xl font-bold text-foreground">
                    {Math.round(project.emissionsTarget * 45).toLocaleString()}
                    <span class="text-sm font-normal text-muted-foreground"
                      >trees/year</span
                    >
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Documents Section -->
        {#if documents.length > 0}
          <Card.Root class="glass-card">
            <Card.Header>
              <Card.Title class="flex items-center gap-2">
                <FileText class="h-5 w-5 text-primary" />
                Project Documents ({documents.length})
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="space-y-3">
                {#each documents as doc}
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    class="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div class="p-2 bg-primary/10 rounded-lg">
                      <FileText class="h-5 w-5 text-primary" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium truncate group-hover:text-primary">
                        {doc.name}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {doc.mimeType?.split("/")[1]?.toUpperCase() || "FILE"} •
                        {Math.round(doc.fileSize / 1024)} KB
                      </p>
                    </div>
                  </a>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Timeline Section -->
        <Card.Root class="glass-card">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Calendar class="h-5 w-5 text-primary" />
              Project Timeline
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="relative">
              <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-muted"></div>
              <div class="space-y-4">
                <div class="relative flex gap-4 items-start">
                  <div
                    class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10"
                  >
                    <div class="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div>
                    <p class="font-medium">Project Started</p>
                    <p class="text-sm text-muted-foreground">
                      {new Date(project.startDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {#if project.estimatedCompletionDate}
                  <div class="relative flex gap-4 items-start">
                    <div
                      class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center z-10"
                    >
                      <div class="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <p class="font-medium">Estimated Completion</p>
                      <p class="text-sm text-muted-foreground">
                        {new Date(
                          project.estimatedCompletionDate,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                {/if}
                <div class="relative flex gap-4 items-start">
                  <div
                    class="w-6 h-6 rounded-full bg-muted flex items-center justify-center z-10"
                  >
                    <div class="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  </div>
                  <div>
                    <p class="font-medium text-muted-foreground">
                      Credits Issued
                    </p>
                    <p class="text-sm text-muted-foreground">
                      Pending verification
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Sidebar Info -->
      <div class="space-y-6">
        <!-- Location Map -->
        <Card.Root class="glass-card overflow-hidden">
          <Card.Header class="pb-2">
            <Card.Title class="text-sm font-medium flex items-center gap-2">
              <MapPin class="h-4 w-4 text-primary" />
              Project Location
            </Card.Title>
          </Card.Header>
          <div class="px-4">
            {#if project.coordinates?.latitude && project.coordinates?.longitude}
              <div
                class="aspect-square w-full rounded-lg overflow-hidden border"
              >
                <iframe
                  title="Project Location Map"
                  width="100%"
                  height="100%"
                  frameborder="0"
                  scrolling="no"
                  src={getMapUrl(
                    project.coordinates.latitude,
                    project.coordinates.longitude,
                  )}
                  class="rounded-lg"
                ></iframe>
              </div>
            {:else}
              <div
                class="aspect-square w-full bg-muted rounded-lg flex items-center justify-center"
              >
                <div class="text-center text-muted-foreground">
                  <MapPin class="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p class="text-sm">No coordinates available</p>
                </div>
              </div>
            {/if}
          </div>
          <Card.Content class="pt-4 pb-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground block text-xs">Latitude</span
                >
                <span class="font-mono"
                  >{project.coordinates?.latitude?.toFixed(4) || "N/A"}</span
                >
              </div>
              <div>
                <span class="text-muted-foreground block text-xs"
                  >Longitude</span
                >
                <span class="font-mono"
                  >{project.coordinates?.longitude?.toFixed(4) || "N/A"}</span
                >
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Project Metadata -->
        <Card.Root class="glass-card">
          <Card.Header>
            <Card.Title class="text-sm font-medium">Project Details</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Project ID</span>
              <span class="font-mono text-xs">{project.id.slice(0, 8)}...</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Developer ID</span>
              <span class="font-mono text-xs"
                >{project.developerId.slice(0, 8)}...</span
              >
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Start Date</span>
              <span>{new Date(project.startDate).toLocaleDateString()}</span>
            </div>
            {#if project.estimatedCompletionDate}
              <Separator />
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Est. Completion</span>
                <span
                  >{new Date(
                    project.estimatedCompletionDate,
                  ).toLocaleDateString()}</span
                >
              </div>
            {/if}
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Created</span>
              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Last Updated</span>
              <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Contact Information -->
        {#if project.contactInfo}
          <Card.Root class="glass-card">
            <Card.Header>
              <Card.Title class="text-sm font-medium flex items-center gap-2">
                <Building class="h-4 w-4 text-primary" />
                Contact Information
              </Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
              <div>
                <p class="text-xs text-muted-foreground">Project Manager</p>
                <p class="font-medium">
                  {project.contactInfo.projectManagerName}
                </p>
                <a
                  href="mailto:{project.contactInfo.projectManagerEmail}"
                  class="text-sm text-primary hover:underline"
                >
                  {project.contactInfo.projectManagerEmail}
                </a>
              </div>
              <Separator />
              <div>
                <p class="text-xs text-muted-foreground">Organization</p>
                <p class="font-medium">
                  {project.contactInfo.organizationName}
                </p>
                <a
                  href="mailto:{project.contactInfo.organizationEmail}"
                  class="text-sm text-primary hover:underline"
                >
                  {project.contactInfo.organizationEmail}
                </a>
              </div>
            </Card.Content>
          </Card.Root>
        {:else}
          <Card.Root class="glass-card">
            <Card.Header>
              <Card.Title class="text-sm font-medium flex items-center gap-2">
                <Building class="h-4 w-4 text-primary" />
                Contact Information
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="text-center py-4 text-muted-foreground">
                <Building class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p class="text-sm">No contact information provided</p>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Action Buttons -->
        {#if project.status === "verified"}
          <Card.Root
            class="glass-card border-green-200 dark:border-green-800 bg-green-500/5"
          >
            <Card.Content class="pt-6">
              <div class="text-center space-y-3">
                <ShieldCheck
                  class="h-10 w-10 text-green-600 dark:text-green-400 mx-auto"
                />
                <p class="font-semibold text-green-700 dark:text-green-300">
                  Verified Project
                </p>
                <p class="text-sm text-muted-foreground">
                  This project has been verified and carbon credits are
                  available for purchase.
                </p>
                <Button
                  class="w-full gap-2"
                  href={`/marketplace?projectId=${project.id}`}
                >
                  <Leaf class="h-4 w-4" />
                  View Available Credits
                </Button>
              </div>
            </Card.Content>
          </Card.Root>
        {:else if project.status === "pending"}
          <Card.Root
            class="glass-card border-yellow-200 dark:border-yellow-800 bg-yellow-500/5"
          >
            <Card.Content class="pt-6">
              <div class="text-center space-y-3">
                <Clock
                  class="h-10 w-10 text-yellow-600 dark:text-yellow-400 mx-auto"
                />
                <p class="font-semibold text-yellow-700 dark:text-yellow-300">
                  Pending Verification
                </p>
                <p class="text-sm text-muted-foreground">
                  This project is currently awaiting verification review.
                </p>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      </div>
    </div>
  {/if}
</div>
