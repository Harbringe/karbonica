<script lang="ts">
    import { onMount } from "svelte";
    import { user } from "$lib/stores/auth";
    import { setMode, resetMode, mode } from "mode-watcher";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import { Separator } from "$lib/components/ui/separator";
    import {
        User,
        Settings,
        Moon,
        Sun,
        Bell,
        Shield,
        LogOut,
        Laptop,
    } from "@lucide/svelte";

    let loading = $state(false);
    let displayName = $state("");
    let email = $state("");
    let notificationsEnabled = $state(true);

    onMount(() => {
        if ($user) {
            displayName = $user.name;
            email = $user.email;
        }
    });

    function handleSaveProfile() {
        loading = true;
        setTimeout(() => {
            loading = false;
            // Mock save
            alert("Profile updated!");
        }, 1000);
    }
</script>

<svelte:head>
    <title>Settings - Karbonica</title>
</svelte:head>

<div class="space-y-6 animate-in max-w-4xl mx-auto pb-10">
    <div class="space-y-0.5">
        <h2 class="text-2xl font-bold tracking-tight">Settings</h2>
        <p class="text-muted-foreground">
            Manage your account settings and preferences.
        </p>
    </div>

    <Separator class="my-6" />

    <div class="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside class="-mx-4 lg:w-1/5">
            <nav class="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                <Button
                    variant="ghost"
                    class="justify-start bg-muted hover:bg-muted"
                >
                    <User class="mr-2 h-4 w-4" />
                    Profile
                </Button>
                <Button
                    variant="ghost"
                    class="justify-start hover:bg-transparent"
                >
                    <Bell class="mr-2 h-4 w-4" />
                    Notifications
                </Button>
                <Button
                    variant="ghost"
                    class="justify-start hover:bg-transparent"
                >
                    <Shield class="mr-2 h-4 w-4" />
                    Security
                </Button>
            </nav>
        </aside>

        <div class="flex-1 lg:max-w-2xl space-y-6">
            <!-- Profile Section -->
            <Card.Root class="glass-card">
                <Card.Header>
                    <Card.Title>Profile</Card.Title>
                    <Card.Description
                        >This is how others will see you on the site.</Card.Description
                    >
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="space-y-2">
                        <Label for="name">Display Name</Label>
                        <Input id="name" bind:value={displayName} />
                    </div>
                    <div class="space-y-2">
                        <Label for="email">Email</Label>
                        <Input
                            id="email"
                            bind:value={email}
                            disabled
                            class="bg-muted"
                        />
                        <p class="text-xs text-muted-foreground">
                            Email cannot be changed successfully.
                        </p>
                    </div>
                    <div class="space-y-2 pt-2">
                        <Label>Role</Label>
                        <div class="flex items-center gap-2">
                            <span
                                class="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium uppercase tracking-wider"
                            >
                                {$user?.role || "User"}
                            </span>
                        </div>
                    </div>
                </Card.Content>
                <Card.Footer>
                    <Button onclick={handleSaveProfile} disabled={loading}>
                        {loading ? "Saving..." : "Update Profile"}
                    </Button>
                </Card.Footer>
            </Card.Root>

            <!-- Appearance Section -->
            <Card.Root class="glass-card">
                <Card.Header>
                    <Card.Title>Appearance</Card.Title>
                    <Card.Description
                        >Customize the look and feel of the application.</Card.Description
                    >
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="flex items-center justify-between p-2">
                        <div class="flex items-center space-x-2">
                            <Sun class="h-4 w-4" />
                            <span class="font-medium">Light</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <Moon class="h-4 w-4" />
                            <span class="font-medium">Dark</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <Laptop class="h-4 w-4" />
                            <span class="font-medium">System</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            class="h-20 flex flex-col gap-2"
                            onclick={() => setMode("light")}
                        >
                            <Sun class="h-6 w-6" />
                            Light
                        </Button>
                        <Button
                            variant="outline"
                            class="h-20 flex flex-col gap-2"
                            onclick={() => setMode("dark")}
                        >
                            <Moon class="h-6 w-6" />
                            Dark
                        </Button>
                        <Button
                            variant="outline"
                            class="h-20 flex flex-col gap-2"
                            onclick={() => resetMode()}
                        >
                            <Laptop class="h-6 w-6" />
                            System
                        </Button>
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- Notifications -->
            <Card.Root class="glass-card">
                <Card.Header>
                    <Card.Title>Notifications</Card.Title>
                    <Card.Description
                        >Configure how you receive alerts.</Card.Description
                    >
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div
                        class="flex items-center justify-between space-x-2 border p-4 rounded-lg"
                    >
                        <div class="flex flex-col space-y-1">
                            <Label class="text-base">Email Notifications</Label>
                            <span class="text-sm text-muted-foreground"
                                >Receive updates about your projects and
                                credits.</span
                            >
                        </div>
                        <Switch bind:checked={notificationsEnabled} />
                    </div>
                </Card.Content>
            </Card.Root>

            <div class="pt-6">
                <Button
                    variant="outline"
                    class="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                >
                    <LogOut class="mr-2 h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    </div>
</div>
