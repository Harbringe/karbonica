<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import {
    Leaf,
    ArrowRight,
    Shield,
    BarChart3,
    Globe,
    Zap,
  } from '@lucide/svelte';

  onMount(() => {
    // Redirect to dashboard if already authenticated
    isAuthenticated.subscribe(authenticated => {
      if (authenticated) {
        goto('/dashboard');
      }
    });
  });

  const features = [
    {
      icon: Shield,
      title: 'Verified Credits',
      description: 'Multi-validator verification ensures authenticity of all carbon credits',
    },
    {
      icon: BarChart3,
      title: 'Track Impact',
      description: 'Monitor your carbon offset contributions with detailed analytics',
    },
    {
      icon: Globe,
      title: 'Global Projects',
      description: 'Support carbon reduction projects from around the world',
    },
    {
      icon: Zap,
      title: 'Fast Trading',
      description: 'Buy and sell carbon credits instantly on our marketplace',
    },
  ];
</script>

<svelte:head>
  <title>Karbonica - Carbon Credit Registry</title>
  <meta name="description" content="Karbonica is a trusted carbon credit registry platform. Track, trade, and retire verified carbon credits." />
</svelte:head>

<div class="min-h-screen bg-background">
  <!-- Hero Section -->
  <header class="border-b">
    <div class="container mx-auto flex h-16 items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Leaf class="h-5 w-5" />
        </div>
        <span class="text-xl font-bold">Karbonica</span>
      </div>
      <nav class="flex items-center gap-4">
        <Button href="/auth/login" variant="ghost">Login</Button>
        <Button href="/auth/register">Get Started</Button>
      </nav>
    </div>
  </header>

  <main>
    <!-- Hero -->
    <section class="container mx-auto px-4 py-24 text-center">
      <div class="mx-auto max-w-3xl">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
          <Leaf class="h-4 w-4" />
          <span>Trusted Carbon Credit Registry</span>
        </div>
        <h1 class="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
          Make Your <span class="text-primary">Carbon Impact</span> Count
        </h1>
        <p class="mb-10 text-xl text-muted-foreground">
          Register carbon offset projects, trade verified credits, and track your environmental impact 
          on our transparent platform.
        </p>
        <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button href="/auth/register" size="lg" class="gap-2">
            Start Offsetting
            <ArrowRight class="h-4 w-4" />
          </Button>
          <Button href="/marketplace" variant="outline" size="lg">
            Browse Marketplace
          </Button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="border-t bg-muted/50 py-24">
      <div class="container mx-auto px-4">
        <h2 class="mb-12 text-center text-3xl font-bold">Why Choose Karbonica?</h2>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {#each features as feature}
            <Card.Root class="border-0 bg-background shadow-sm">
              <Card.Header>
                <div class="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon class="h-6 w-6 text-primary" />
                </div>
                <Card.Title class="text-lg">{feature.title}</Card.Title>
              </Card.Header>
              <Card.Content>
                <p class="text-muted-foreground">{feature.description}</p>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="container mx-auto px-4 py-24 text-center">
      <div class="mx-auto max-w-2xl">
        <h2 class="mb-4 text-3xl font-bold">Ready to Make a Difference?</h2>
        <p class="mb-8 text-lg text-muted-foreground">
          Join thousands of organizations using Karbonica to offset their carbon footprint.
        </p>
        <Button href="/auth/register" size="lg">Create Your Account</Button>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t py-8">
    <div class="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
      <div class="flex items-center gap-2">
        <Leaf class="h-5 w-5 text-primary" />
        <span class="font-semibold">Karbonica</span>
      </div>
      <p class="text-sm text-muted-foreground">
        © 2024 Karbonica. Building a sustainable future.
      </p>
    </div>
  </footer>
</div>
