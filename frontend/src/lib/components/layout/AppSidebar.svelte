<script lang="ts">
  import { page } from "$app/state";
  import { auth, user, userRole } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";
  import * as Avatar from "$lib/components/ui/avatar";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Separator } from "$lib/components/ui/separator";
  import { toggleMode, mode } from "mode-watcher";
  import {
    LayoutDashboard,
    FolderTree,
    Coins,
    ShoppingCart,
    ClipboardCheck,
    Settings,
    LogOut,
    Sun,
    Moon,
    Leaf,
    Users,
  } from "@lucide/svelte";

  // Navigation items based on user role
  const getNavItems = (role: string | null) => {
    const baseItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ];

    if (role === "developer") {
      return [
        ...baseItems,
        { href: "/projects", label: "My Projects", icon: FolderTree },
        { href: "/credits", label: "My Credits", icon: Coins },
        { href: "/marketplace", label: "Marketplace", icon: ShoppingCart },
      ];
    }

    if (role === "buyer") {
      return [
        ...baseItems,
        { href: "/credits", label: "My Portfolio", icon: Coins },
        { href: "/marketplace", label: "Marketplace", icon: ShoppingCart },
      ];
    }

    if (role === "verifier") {
      return [
        ...baseItems,
        {
          href: "/verifications",
          label: "Verifications",
          icon: ClipboardCheck,
        },
        { href: "/projects", label: "Projects", icon: FolderTree },
      ];
    }

    if (role === "administrator") {
      return [
        ...baseItems,
        { href: "/projects", label: "All Projects", icon: FolderTree },
        { href: "/credits", label: "All Credits", icon: Coins },
        { href: "/marketplace", label: "Marketplace", icon: ShoppingCart },
        {
          href: "/verifications",
          label: "Verifications",
          icon: ClipboardCheck,
        },
        { href: "/users", label: "Users", icon: Users },
      ];
    }

    return baseItems;
  };

  function handleLogout() {
    auth.logout();
    goto("/auth/login");
  }

  $effect(() => {
    // Redirect to login if not authenticated
    if (
      $user === null &&
      page.url.pathname !== "/auth/login" &&
      page.url.pathname !== "/auth/register" &&
      page.url.pathname !== "/"
    ) {
      goto("/auth/login");
    }
  });
</script>

<Sidebar.Sidebar class="backdrop-blur-md border-r border-border/50">
  <Sidebar.SidebarHeader>
    <div class="flex items-center gap-3 px-2 py-4">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <Leaf class="h-6 w-6" />
      </div>
      <div class="flex flex-col">
        <span class="text-lg font-bold">Karbonica</span>
        <span class="text-xs text-muted-foreground">Carbon Registry</span>
      </div>
    </div>
  </Sidebar.SidebarHeader>

  <Separator />

  <Sidebar.SidebarContent>
    <Sidebar.SidebarGroup>
      <Sidebar.SidebarGroupLabel>Navigation</Sidebar.SidebarGroupLabel>
      <Sidebar.SidebarGroupContent>
        <Sidebar.SidebarMenu>
          {#each getNavItems($userRole) as item}
            <Sidebar.SidebarMenuItem>
              <Sidebar.SidebarMenuButton
                isActive={page.url.pathname === item.href ||
                  page.url.pathname.startsWith(item.href + "/")}
              >
                {#snippet child({ props })}
                  <a href={item.href} {...props}>
                    <item.icon class="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                {/snippet}
              </Sidebar.SidebarMenuButton>
            </Sidebar.SidebarMenuItem>
          {/each}
        </Sidebar.SidebarMenu>
      </Sidebar.SidebarGroupContent>
    </Sidebar.SidebarGroup>
  </Sidebar.SidebarContent>

  <Sidebar.SidebarFooter>
    <Separator />
    <div class="p-2">
      {#if $user}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="ghost"
                class="w-full justify-start gap-2"
              >
                <Avatar.Root class="h-8 w-8">
                  <Avatar.Fallback
                    class="bg-primary text-primary-foreground text-sm"
                  >
                    {$user.name.slice(0, 2).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="flex flex-col items-start text-left">
                  <span class="text-sm font-medium">{$user.name}</span>
                  <span class="text-xs text-muted-foreground capitalize"
                    >{$user.role}</span
                  >
                </div>
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-56" align="start">
            <DropdownMenu.Label>My Account</DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={() => goto("/settings")}>
              <Settings class="mr-2 h-4 w-4" />
              Settings
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={toggleMode}>
              {#if mode.current === "dark"}
                <Sun class="mr-2 h-4 w-4" />
                Light Mode
              {:else}
                <Moon class="mr-2 h-4 w-4" />
                Dark Mode
              {/if}
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onclick={handleLogout} class="text-destructive">
              <LogOut class="mr-2 h-4 w-4" />
              Logout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <Button href="/auth/login" variant="outline" class="w-full">
          Login
        </Button>
      {/if}
    </div>
  </Sidebar.SidebarFooter>
</Sidebar.Sidebar>
