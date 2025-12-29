<script lang="ts">
  import { api } from "$lib/api/client";
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Separator } from "$lib/components/ui/separator";
  import {
    Trees,
    Sun,
    Wind,
    Waves,
    Factory,
    Mountain,
    CloudRain,
    Leaf,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Check,
    Upload,
    Image,
    FileText,
    X,
    User,
    Building,
    Mail,
    Calendar,
  } from "@lucide/svelte";

  // Form state
  let step = $state(1);
  let loading = $state(false);
  let error = $state("");

  // Step 1: Basic Info
  let title = $state("");
  let type = $state("forest_conservation");
  let description = $state("");

  // Step 2: Location
  let location = $state("");
  let country = $state("");
  let latitude = $state<number | null>(null);
  let longitude = $state<number | null>(null);

  // Step 3: Dates & Emissions
  let emissionsTarget = $state<number>(0);
  let startDate = $state("");
  let estimatedCompletionDate = $state("");

  // Step 4: Contact Info
  let projectManagerName = $state("");
  let projectManagerEmail = $state("");
  let organizationName = $state("");
  let organizationEmail = $state("");

  // Step 5: Media & Documents
  let imageFile = $state<File | null>(null);
  let imagePreview = $state<string | null>(null);
  let imageUrl = $state<string | null>(null);
  let documentFiles = $state<File[]>([]);
  let uploadingImage = $state(false);
  let uploadingDocs = $state(false);

  const projectTypes = [
    {
      value: "forest_conservation",
      label: "Forest Conservation",
      icon: Trees,
      description: "Protect and restore forests",
    },
    {
      value: "renewable_energy",
      label: "Renewable Energy",
      icon: Sun,
      description: "Solar, wind, hydro power",
    },
    {
      value: "energy_efficiency",
      label: "Energy Efficiency",
      icon: Factory,
      description: "Reduce energy consumption",
    },
    {
      value: "methane_capture",
      label: "Methane Capture",
      icon: CloudRain,
      description: "Capture and utilize methane",
    },
    {
      value: "soil_carbon",
      label: "Soil Carbon",
      icon: Mountain,
      description: "Sequester carbon in soil",
    },
    {
      value: "ocean_conservation",
      label: "Ocean Conservation",
      icon: Waves,
      description: "Protect marine ecosystems",
    },
    {
      value: "direct_air_capture",
      label: "Direct Air Capture",
      icon: Wind,
      description: "Remove CO₂ from atmosphere",
    },
  ];

  const steps = [
    { number: 1, label: "Basic Info" },
    { number: 2, label: "Location" },
    { number: 3, label: "Timeline" },
    { number: 4, label: "Contact" },
    { number: 5, label: "Media" },
    { number: 6, label: "Review" },
  ];

  function nextStep() {
    if (step < 6) step++;
  }

  function prevStep() {
    if (step > 1) step--;
  }

  function validateStep(): boolean {
    error = "";

    if (step === 1) {
      if (!title.trim()) {
        error = "Project title is required";
        return false;
      }
      if (description.length < 50) {
        error = "Description must be at least 50 characters";
        return false;
      }
    }
    if (step === 2) {
      if (!location.trim()) {
        error = "Location is required";
        return false;
      }
      if (!country.trim() || country.length !== 3) {
        error = "Country must be a 3-letter ISO code (e.g., USA, GBR)";
        return false;
      }
    }
    if (step === 3) {
      if (emissionsTarget <= 0) {
        error = "Emissions target must be positive";
        return false;
      }
      if (!startDate) {
        error = "Start date is required";
        return false;
      }
    }
    if (step === 4) {
      if (!projectManagerName.trim()) {
        error = "Project manager name is required";
        return false;
      }
      if (!projectManagerEmail.trim() || !projectManagerEmail.includes("@")) {
        error = "Valid project manager email is required";
        return false;
      }
      if (!organizationName.trim()) {
        error = "Organization name is required";
        return false;
      }
      if (!organizationEmail.trim() || !organizationEmail.includes("@")) {
        error = "Valid organization email is required";
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    if (validateStep()) {
      nextStep();
    }
  }

  function handleImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      imageFile = input.files[0];
      imagePreview = URL.createObjectURL(input.files[0]);
    }
  }

  function removeImage() {
    imageFile = null;
    imagePreview = null;
    imageUrl = null;
  }

  function handleDocumentSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      documentFiles = [...documentFiles, ...Array.from(input.files)];
    }
  }

  function removeDocument(index: number) {
    documentFiles = documentFiles.filter((_, i) => i !== index);
  }

  async function uploadImage() {
    if (!imageFile) return;

    uploadingImage = true;
    const response = await api.uploadImage(imageFile);
    uploadingImage = false;

    if (response.status === "success" && response.data) {
      imageUrl = response.data.url;
      return true;
    } else {
      error = response.error?.message || "Failed to upload image";
      return false;
    }
  }

  async function handleSubmit() {
    if (!validateStep()) return;

    loading = true;
    error = "";

    // Upload image if selected but not yet uploaded
    if (imageFile && !imageUrl) {
      const uploaded = await uploadImage();
      if (!uploaded) {
        loading = false;
        return;
      }
    }

    const response = await api.createProject({
      title,
      type,
      description,
      location,
      country: country.toUpperCase(),
      coordinates: latitude && longitude ? { latitude, longitude } : undefined,
      emissionsTarget,
      startDate,
      estimatedCompletionDate: estimatedCompletionDate || undefined,
      imageUrl: imageUrl || undefined,
      contactInfo: {
        projectManagerName,
        projectManagerEmail,
        organizationName,
        organizationEmail,
      },
    });

    if (response.status === "success" && response.data?.project?.id) {
      const projectId = response.data.project.id;

      // Upload documents if any were selected
      if (documentFiles.length > 0) {
        uploadingDocs = true;
        for (const file of documentFiles) {
          await api.uploadProjectDocument(projectId, file, file.name);
        }
        uploadingDocs = false;
      }

      loading = false;
      // Go to the project detail page to see the result
      goto(`/projects/${projectId}`);
    } else {
      loading = false;
      error = response.error?.message || "Failed to create project";
    }
  }

  const selectedType = $derived(
    projectTypes.find((t) => t.value === type) || projectTypes[0],
  );

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
</script>

<svelte:head>
  <title>New Project - Karbonica</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 pb-8">
  <!-- Header -->
  <div>
    <Button href="/projects" variant="ghost" class="mb-4 gap-2">
      <ArrowLeft class="h-4 w-4" />
      Back to Projects
    </Button>
    <h1 class="text-3xl font-bold">Create New Project</h1>
    <p class="text-muted-foreground">
      Register a carbon offset project for verification
    </p>
  </div>

  <!-- Progress steps -->
  <div class="flex items-center justify-between overflow-x-auto pb-2">
    {#each steps as s, i}
      <div class="flex items-center">
        <div class="flex flex-col items-center">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full text-sm {step >=
            s.number
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'}"
          >
            {#if step > s.number}
              <Check class="h-4 w-4" />
            {:else}
              {s.number}
            {/if}
          </div>
          <span
            class="mt-1 text-xs whitespace-nowrap {step >= s.number
              ? 'text-foreground'
              : 'text-muted-foreground'}"
          >
            {s.label}
          </span>
        </div>
        {#if i < steps.length - 1}
          <div
            class="mx-2 h-0.5 w-8 rounded {step > s.number
              ? 'bg-primary'
              : 'bg-muted'}"
          ></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Form card -->
  <Card.Root>
    <Card.Content class="pt-6">
      {#if error}
        <div
          class="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      {/if}

      <!-- Step 1: Basic Info -->
      {#if step === 1}
        <div class="space-y-6">
          <div class="space-y-2">
            <Label for="title">Project Title</Label>
            <Input
              id="title"
              placeholder="e.g., Amazon Rainforest Preservation Initiative"
              bind:value={title}
            />
          </div>

          <div class="space-y-2">
            <Label>Project Type</Label>
            <div class="grid gap-3 sm:grid-cols-2">
              {#each projectTypes as pt}
                <button
                  type="button"
                  onclick={() => (type = pt.value)}
                  class="relative rounded-lg border-2 p-4 text-left transition-colors {type ===
                  pt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'}"
                >
                  {#if type === pt.value}
                    <div
                      class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check class="h-3 w-3" />
                    </div>
                  {/if}
                  <pt.icon class="mb-2 h-6 w-6 text-primary" />
                  <div class="font-medium">{pt.label}</div>
                  <div class="text-xs text-muted-foreground">
                    {pt.description}
                  </div>
                </button>
              {/each}
            </div>
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <textarea
              id="description"
              class="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe your project in detail (minimum 50 characters)..."
              bind:value={description}
            ></textarea>
            <p class="text-xs text-muted-foreground">
              {description.length}/50 characters minimum
            </p>
          </div>
        </div>
      {/if}

      <!-- Step 2: Location -->
      {#if step === 2}
        <div class="space-y-6">
          <div class="space-y-2">
            <Label for="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Amazon Basin, Para State"
              bind:value={location}
            />
          </div>

          <div class="space-y-2">
            <Label for="country">Country Code (ISO 3166-1 alpha-3)</Label>
            <Input
              id="country"
              placeholder="e.g., BRA, USA, GBR"
              maxlength={3}
              class="uppercase"
              bind:value={country}
            />
            <p class="text-xs text-muted-foreground">3-letter country code</p>
          </div>

          <Separator />

          <div>
            <Label>Coordinates (Optional)</Label>
            <p class="mb-2 text-xs text-muted-foreground">
              GPS coordinates for precise location
            </p>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  placeholder="-3.4653"
                  bind:value={latitude}
                />
              </div>
              <div class="space-y-2">
                <Label for="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  placeholder="-62.2159"
                  bind:value={longitude}
                />
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Step 3: Timeline & Emissions -->
      {#if step === 3}
        <div class="space-y-6">
          <div class="space-y-2">
            <Label for="emissionsTarget">Emissions Reduction Target</Label>
            <div class="flex items-center gap-2">
              <Input
                id="emissionsTarget"
                type="number"
                min={1}
                max={9999999}
                placeholder="10000"
                bind:value={emissionsTarget}
              />
              <span class="text-sm text-muted-foreground whitespace-nowrap"
                >tCO₂e</span
              >
            </div>
            <p class="text-xs text-muted-foreground">
              Total carbon dioxide equivalent to offset
            </p>
          </div>

          <Separator />

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="startDate">
                <Calendar class="inline-block h-4 w-4 mr-1" />
                Start Date
              </Label>
              <Input id="startDate" type="date" bind:value={startDate} />
            </div>
            <div class="space-y-2">
              <Label for="estimatedCompletionDate">
                <Calendar class="inline-block h-4 w-4 mr-1" />
                Est. Completion Date
              </Label>
              <Input
                id="estimatedCompletionDate"
                type="date"
                bind:value={estimatedCompletionDate}
              />
              <p class="text-xs text-muted-foreground">Optional</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Step 4: Contact Info -->
      {#if step === 4}
        <div class="space-y-6">
          <div class="p-4 rounded-lg bg-muted/50 border">
            <h3 class="font-medium flex items-center gap-2 mb-4">
              <User class="h-5 w-5 text-primary" />
              Project Manager
            </h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="pmName">Full Name</Label>
                <Input
                  id="pmName"
                  placeholder="John Smith"
                  bind:value={projectManagerName}
                />
              </div>
              <div class="space-y-2">
                <Label for="pmEmail">Email</Label>
                <Input
                  id="pmEmail"
                  type="email"
                  placeholder="john.smith@company.com"
                  bind:value={projectManagerEmail}
                />
              </div>
            </div>
          </div>

          <div class="p-4 rounded-lg bg-muted/50 border">
            <h3 class="font-medium flex items-center gap-2 mb-4">
              <Building class="h-5 w-5 text-primary" />
              Organization
            </h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Green Earth Inc."
                  bind:value={organizationName}
                />
              </div>
              <div class="space-y-2">
                <Label for="orgEmail">Contact Email</Label>
                <Input
                  id="orgEmail"
                  type="email"
                  placeholder="contact@greenearth.com"
                  bind:value={organizationEmail}
                />
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Step 5: Media & Documents -->
      {#if step === 5}
        <div class="space-y-6">
          <!-- Thumbnail Upload -->
          <div class="space-y-2">
            <Label class="flex items-center gap-2">
              <Image class="h-4 w-4" />
              Project Thumbnail
            </Label>
            <p class="text-xs text-muted-foreground mb-2">
              Upload an image to represent your project (PNG, JPG, WebP - max
              5MB)
            </p>

            {#if imagePreview}
              <div class="relative rounded-lg overflow-hidden border">
                <img
                  src={imagePreview}
                  alt="Preview"
                  class="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onclick={removeImage}
                  class="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <X class="h-4 w-4" />
                </button>
                {#if imageUrl}
                  <div
                    class="absolute bottom-2 left-2 px-2 py-1 rounded bg-green-500 text-white text-xs flex items-center gap-1"
                  >
                    <Check class="h-3 w-3" /> Uploaded
                  </div>
                {/if}
              </div>
            {:else}
              <label
                class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload class="h-10 w-10 text-muted-foreground mb-2" />
                <span class="text-sm text-muted-foreground"
                  >Click to upload or drag and drop</span
                >
                <input
                  type="file"
                  accept="image/*"
                  onchange={handleImageSelect}
                  class="hidden"
                />
              </label>
            {/if}
          </div>

          <Separator />

          <!-- Document Upload -->
          <div class="space-y-2">
            <Label class="flex items-center gap-2">
              <FileText class="h-4 w-4" />
              Supporting Documents
            </Label>
            <p class="text-xs text-muted-foreground mb-2">
              Upload project documentation (PDF, Word, Excel - max 10MB each)
            </p>

            {#if documentFiles.length > 0}
              <div class="space-y-2 mb-4">
                {#each documentFiles as file, i}
                  <div
                    class="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div class="flex items-center gap-3">
                      <FileText class="h-5 w-5 text-primary" />
                      <div>
                        <p class="text-sm font-medium">{file.name}</p>
                        <p class="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onclick={() => removeDocument(i)}
                      class="p-1 rounded hover:bg-destructive/10 text-destructive"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <label
              class="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload class="h-5 w-5 text-muted-foreground mr-2" />
              <span class="text-sm text-muted-foreground">Add documents</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onchange={handleDocumentSelect}
                class="hidden"
              />
            </label>
            <p class="text-xs text-muted-foreground text-center">
              Documents can be uploaded after project creation via the project
              details page
            </p>
          </div>
        </div>
      {/if}

      <!-- Step 6: Review -->
      {#if step === 6}
        <div class="space-y-4">
          <h3 class="font-semibold">Review Your Project</h3>

          <div class="rounded-lg border p-4 space-y-3">
            {#if imagePreview}
              <img
                src={imagePreview}
                alt="Project thumbnail"
                class="w-full h-32 object-cover rounded-lg"
              />
            {/if}

            <div class="flex items-center gap-3">
              <selectedType.icon class="h-8 w-8 text-primary" />
              <div>
                <p class="font-semibold">{title}</p>
                <p class="text-sm text-muted-foreground capitalize">
                  {type.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            <Separator />

            <div class="grid gap-3 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Location</span>
                <span>{location}, {country.toUpperCase()}</span>
              </div>
              {#if latitude && longitude}
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Coordinates</span>
                  <span>{latitude}, {longitude}</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Target</span>
                <span>{emissionsTarget.toLocaleString()} tCO₂e</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Start Date</span>
                <span>{new Date(startDate).toLocaleDateString()}</span>
              </div>
              {#if estimatedCompletionDate}
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Est. Completion</span>
                  <span
                    >{new Date(
                      estimatedCompletionDate,
                    ).toLocaleDateString()}</span
                  >
                </div>
              {/if}
            </div>

            <Separator />

            <div class="text-sm">
              <p class="text-xs text-muted-foreground mb-1">Project Manager</p>
              <p class="font-medium">{projectManagerName}</p>
              <p class="text-muted-foreground">{projectManagerEmail}</p>
            </div>

            <div class="text-sm">
              <p class="text-xs text-muted-foreground mb-1">Organization</p>
              <p class="font-medium">{organizationName}</p>
              <p class="text-muted-foreground">{organizationEmail}</p>
            </div>

            <Separator />

            <div>
              <p class="text-xs text-muted-foreground mb-1">Description</p>
              <p class="text-sm">{description}</p>
            </div>

            {#if documentFiles.length > 0}
              <Separator />
              <div>
                <p class="text-xs text-muted-foreground mb-1">
                  Documents ({documentFiles.length})
                </p>
                <p class="text-sm text-muted-foreground">
                  Will be uploaded after project creation
                </p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </Card.Content>

    <Card.Footer class="flex justify-between">
      {#if step > 1}
        <Button variant="outline" onclick={prevStep} disabled={loading}>
          <ArrowLeft class="mr-2 h-4 w-4" />
          Previous
        </Button>
      {:else}
        <div></div>
      {/if}

      {#if step < 6}
        <Button onclick={handleNext}>
          Next
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
      {:else}
        <Button onclick={handleSubmit} disabled={loading || uploadingImage}>
          {#if loading || uploadingImage}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {uploadingImage ? "Uploading..." : "Creating..."}
          {:else}
            Create Project
          {/if}
        </Button>
      {/if}
    </Card.Footer>
  </Card.Root>
</div>
