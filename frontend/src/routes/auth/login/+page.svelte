<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Leaf, Loader2 } from '@lucide/svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    const result = await auth.login(email, password);
    
    loading = false;
    
    if (result.success) {
      goto('/dashboard');
    } else {
      error = result.error || 'Login failed';
    }
  }
</script>

<svelte:head>
  <title>Login - Karbonica</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf class="h-6 w-6" />
      </div>
      <Card.Title class="text-2xl">Welcome Back</Card.Title>
      <Card.Description>Sign in to your Karbonica account</Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleSubmit} class="space-y-4">
        {#if error}
          <div class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        {/if}

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

        <Button type="submit" class="w-full" disabled={loading}>
          {#if loading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          {:else}
            Sign In
          {/if}
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="flex flex-col gap-4">
      <div class="text-center text-sm text-muted-foreground">
        Don't have an account?
        <a href="/auth/register" class="text-primary hover:underline">Sign up</a>
      </div>
    </Card.Footer>
  </Card.Root>
</div>
