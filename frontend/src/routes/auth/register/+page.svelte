<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Leaf, Loader2, Check } from '@lucide/svelte';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let company = $state('');
  let role = $state<'developer' | 'buyer'>('buyer');
  let error = $state('');
  let loading = $state(false);

  const roles = [
    {
      value: 'developer' as const,
      label: 'Project Developer',
      description: 'Register carbon offset projects and earn credits',
    },
    {
      value: 'buyer' as const,
      label: 'Credit Buyer',
      description: 'Purchase and retire carbon credits to offset emissions',
    },
  ];

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;

    const result = await auth.register({
      name,
      email,
      password,
      company: company || undefined,
      role,
    });
    
    loading = false;
    
    if (result.success) {
      goto('/auth/login?registered=true');
    } else {
      error = result.error || 'Registration failed';
    }
  }
</script>

<svelte:head>
  <title>Sign Up - Karbonica</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
  <Card.Root class="w-full max-w-lg">
    <Card.Header class="text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf class="h-6 w-6" />
      </div>
      <Card.Title class="text-2xl">Create an Account</Card.Title>
      <Card.Description>Join Karbonica to start your carbon offset journey</Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleSubmit} class="space-y-4">
        {#if error}
          <div class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        {/if}

        <!-- Role Selection -->
        <div class="space-y-3">
          <Label>I want to...</Label>
          <div class="grid gap-3 sm:grid-cols-2">
            {#each roles as roleOption}
              <button
                type="button"
                onclick={() => role = roleOption.value}
                class="relative rounded-lg border-2 p-4 text-left transition-colors {role === roleOption.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}"
              >
                {#if role === roleOption.value}
                  <div class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check class="h-3 w-3" />
                  </div>
                {/if}
                <div class="font-medium">{roleOption.label}</div>
                <div class="mt-1 text-xs text-muted-foreground">{roleOption.description}</div>
              </button>
            {/each}
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              bind:value={name}
              required
              disabled={loading}
            />
          </div>

          <div class="space-y-2">
            <Label for="company">Company (Optional)</Label>
            <Input
              id="company"
              type="text"
              placeholder="Acme Inc."
              bind:value={company}
              disabled={loading}
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            bind:value={email}
            required
            disabled={loading}
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              bind:value={password}
              required
              disabled={loading}
            />
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              bind:value={confirmPassword}
              required
              disabled={loading}
            />
          </div>
        </div>

        <Button type="submit" class="w-full" disabled={loading}>
          {#if loading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          {:else}
            Create Account
          {/if}
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="flex flex-col gap-4">
      <div class="text-center text-sm text-muted-foreground">
        Already have an account?
        <a href="/auth/login" class="text-primary hover:underline">Sign in</a>
      </div>
    </Card.Footer>
  </Card.Root>
</div>
