<script lang="ts">
    import { page } from "$app/state";
    import { api } from "$lib/api/client";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Separator } from "$lib/components/ui/separator";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { user } from "$lib/stores/auth";
    import {
        Coins,
        ArrowLeft,
        Leaf,
        Send,
        Trash2,
        Calendar,
        History,
        ShieldCheck,
        FileCertificate,
        TrendingUp,
        MoveRight,
        AlertTriangle,
    } from "@lucide/svelte";
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Dialog from "$lib/components/ui/dialog";

    let credit = $state<any>(null);
    let project = $state<any>(null);
    let transactions = $state<any[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Actions State
    let actionLoading = $state(false);

    // Transfer State
    let transferRecipient = $state("");
    let transferAmount = $state<number>(0);
    let showTransferDialog = $state(false);

    // Retire State
    let retireReason = $state("");
    let showRetireDialog = $state(false);

    onMount(async () => {
        const id = page.params.id; // This assumes standard resource ID, but credit has `creditId` (SKU) too.

        try {
            // Fetch credits list and find (prototype logic)
            // Ideally: api.getCredit(id)
            const response = await api.getCredits({ limit: 100 });
            if (response.status === "success" && response.data) {
                credit = response.data.credits.find((c: any) => c.id === id);

                if (credit) {
                    // Fetch associated project
                    const projRes = await api.getProject(credit.projectId);
                    if (projRes.status === "success") {
                        project = projRes.data.project;
                    }

                    // Simulate fetching history
                    transactions = [
                        {
                            id: "tx-1",
                            type: "ISSUANCE",
                            amount: credit.quantity,
                            date: credit.issuedAt,
                            from: "Registry",
                            to: "Me",
                        },
                        // Mock data
                    ];
                } else {
                    error = "Credit asset not found";
                }
            } else {
                error = "Failed to load credits";
            }
        } catch (e) {
            error = "Network error";
        } finally {
            loading = false;
        }
    });

    async function handleTransfer() {
        if (!credit) return;
        actionLoading = true;
        try {
            const response = await api.transferCredit(
                credit.id,
                transferRecipient,
                Number(transferAmount),
            );
            if (response.status === "success") {
                showTransferDialog = false;
                // Refresh logic or redirect
                goto("/credits");
            } else {
                alert(response.error?.message || "Transfer failed");
            }
        } catch (e) {
            alert("Transfer error");
        } finally {
            actionLoading = false;
        }
    }

    async function handleRetire() {
        if (!credit) return;
        actionLoading = true;
        try {
            const response = await api.retireCredit(credit.id, retireReason);
            if (response.status === "success") {
                showRetireDialog = false;
                goto("/credits");
            } else {
                alert(response.error?.message || "Retirement failed");
            }
        } catch (e) {
            alert("Retirement error");
        } finally {
            actionLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Credit Details - Karbonica</title>
</svelte:head>

<div class="space-y-6 animate-in max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4">
        <Button href="/credits" variant="ghost" size="icon">
            <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Credit Details</h1>
            <p class="text-sm text-muted-foreground">
                Manage your carbon assets
            </p>
        </div>
    </div>

    {#if loading}
        <div class="space-y-6">
            <Skeleton class="h-48 w-full rounded-xl" />
            <Skeleton class="h-64 w-full" />
        </div>
    {:else if error}
        <div class="p-8 text-center border rounded-lg bg-muted/20">
            <p class="text-red-500 mb-4">{error}</p>
            <Button href="/credits">Back to Portfolio</Button>
        </div>
    {:else if credit}
        <!-- Overview Card -->
        <Card.Root
            class="glass-card border-l-4 border-l-primary overflow-hidden relative"
        >
            <!-- Background Pattern -->
            <div
                class="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"
            ></div>

            <Card.Content class="p-8">
                <div
                    class="flex flex-col md:flex-row justify-between gap-8 relative z-10"
                >
                    <div class="space-y-4">
                        <div>
                            <p
                                class="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                            >
                                Carbon Credit ID
                            </p>
                            <h2
                                class="text-3xl font-mono font-bold text-primary mt-1"
                            >
                                {credit.creditId}
                            </h2>
                        </div>

                        <div class="flex flex-wrap gap-4">
                            <Badge
                                variant="outline"
                                class="pl-1 pr-2 py-1 gap-1 border-primary/20 bg-primary/5"
                            >
                                <Calendar class="h-3 w-3" />
                                Vintage {credit.vintage}
                            </Badge>
                            <Badge
                                variant={credit.status === "active"
                                    ? "default"
                                    : "secondary"}
                                class="uppercase"
                            >
                                {credit.status}
                            </Badge>
                            {#if project}
                                <span
                                    class="flex items-center gap-1 text-sm text-muted-foreground"
                                >
                                    From: <span
                                        class="font-medium text-foreground"
                                        >{project.title}</span
                                    >
                                </span>
                            {/if}
                        </div>
                    </div>

                    <div class="flex flex-col items-end justify-center">
                        <p class="text-sm text-muted-foreground">
                            Available Quantity
                        </p>
                        <div
                            class="text-4xl font-bold flex items-baseline gap-1"
                        >
                            {credit.quantity.toLocaleString()}
                            <span
                                class="text-lg font-normal text-muted-foreground"
                                >tCO₂e</span
                            >
                        </div>
                        <p class="text-xs text-muted-foreground mt-2">
                            Issued {new Date(
                                credit.issuedAt,
                            ).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Actions & History -->
        <Tabs.Root value="actions" class="w-full">
            <Tabs.List
                class="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto"
            >
                <Tabs.Trigger
                    value="actions"
                    class="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >Actions</Tabs.Trigger
                >
                <Tabs.Trigger
                    value="history"
                    class="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >History</Tabs.Trigger
                >
                <Tabs.Trigger
                    value="certificate"
                    class="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >Certificate</Tabs.Trigger
                >
            </Tabs.List>

            <div class="mt-6">
                <Tabs.Content
                    value="actions"
                    class="animate-in slide-in-from-bottom-2 fade-in-50 duration-300"
                >
                    <div class="grid md:grid-cols-2 gap-6">
                        <!-- Transfer Card -->
                        <Card.Root class="glass-card">
                            <Card.Header>
                                <Card.Title class="flex items-center gap-2">
                                    <Send class="h-5 w-5 text-blue-500" />
                                    Transfer Credits
                                </Card.Title>
                                <Card.Description
                                    >Send credits to another user or marketplace</Card.Description
                                >
                            </Card.Header>
                            <Card.Content>
                                <p class="text-sm text-muted-foreground mb-4">
                                    Transferring credits moves ownership to
                                    another wallet address or user account. This
                                    action is recorded on the blockchain.
                                </p>
                                <Button
                                    variant="outline"
                                    class="w-full"
                                    disabled={credit.status !== "active"}
                                    onclick={() => (showTransferDialog = true)}
                                >
                                    Transfer Ownership
                                </Button>
                            </Card.Content>
                        </Card.Root>

                        <!-- Retire Card -->
                        <Card.Root class="glass-card">
                            <Card.Header>
                                <Card.Title class="flex items-center gap-2">
                                    <Trash2 class="h-5 w-5 text-green-600" />
                                    Retire Credits
                                </Card.Title>
                                <Card.Description
                                    >Permanently offset emissions</Card.Description
                                >
                            </Card.Header>
                            <Card.Content>
                                <p class="text-sm text-muted-foreground mb-4">
                                    Retiring credits consumes them to offset a
                                    specific carbon footprint. Retired credits
                                    cannot be sold or transferred again.
                                </p>
                                <Button
                                    class="w-full bg-green-600 hover:bg-green-700 text-white"
                                    disabled={credit.status !== "active"}
                                    onclick={() => (showRetireDialog = true)}
                                >
                                    Retire / Offset
                                </Button>
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Tabs.Content>

                <Tabs.Content value="history">
                    <Card.Root class="glass-card">
                        <Card.Content class="p-0">
                            <div class="divide-y">
                                {#each transactions as tx}
                                    <div
                                        class="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div class="flex items-center gap-4">
                                            <div
                                                class="p-2 bg-muted rounded-full"
                                            >
                                                {#if tx.type === "ISSUANCE"}
                                                    <Leaf
                                                        class="h-4 w-4 text-green-600"
                                                    />
                                                {:else if tx.type === "transfer"}
                                                    <Send
                                                        class="h-4 w-4 text-blue-500"
                                                    />
                                                {:else}
                                                    <History class="h-4 w-4" />
                                                {/if}
                                            </div>
                                            <div>
                                                <p class="font-medium text-sm">
                                                    {tx.type} - {new Date(
                                                        tx.date,
                                                    ).toLocaleDateString()}
                                                </p>
                                                <p
                                                    class="text-xs text-muted-foreground"
                                                >
                                                    From: {tx.from} • To: {tx.to}
                                                </p>
                                            </div>
                                        </div>
                                        <div class="font-mono text-sm">
                                            +{tx.amount}
                                        </div>
                                    </div>
                                {/each}
                                <div
                                    class="p-4 text-center text-sm text-muted-foreground"
                                >
                                    End of history
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <Tabs.Content value="certificate">
                    <Card.Root class="glass-card border-dashed">
                        <Card.Content
                            class="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <FileCertificate
                                class="h-16 w-16 text-muted-foreground mb-4 opacity-50"
                            />
                            <h3 class="text-lg font-medium">
                                Digital Certificate
                            </h3>
                            <p class="text-muted-foreground mb-6 max-w-md">
                                View or download the official digital
                                certificate proving ownership and authenticity
                                of these carbon credits.
                            </p>
                            <Button variant="outline">Download PDF</Button>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>
            </div>
        </Tabs.Root>

        <!-- Dialogs -->
        <Dialog.Root bind:open={showTransferDialog}>
            <Dialog.Content class="sm:max-w-[425px] glass border-white/20">
                <Dialog.Header>
                    <Dialog.Title>Transfer Credits</Dialog.Title>
                    <Dialog.Description
                        >Send credits to another user</Dialog.Description
                    >
                </Dialog.Header>
                <div class="grid gap-4 py-4">
                    <div class="grid gap-2">
                        <Label for="recipient">Recipient ID / Email</Label>
                        <Input
                            id="recipient"
                            placeholder="user@example.com"
                            bind:value={transferRecipient}
                        />
                    </div>
                    <div class="grid gap-2">
                        <Label for="amount">Amount (tCO₂e)</Label>
                        <Input
                            id="amount"
                            type="number"
                            max={credit.quantity}
                            bind:value={transferAmount}
                        />
                        <p class="text-xs text-muted-foreground">
                            Max available: {credit.quantity}
                        </p>
                    </div>
                </div>
                <Dialog.Footer>
                    <Button
                        variant="ghost"
                        onclick={() => (showTransferDialog = false)}
                        >Cancel</Button
                    >
                    <Button
                        onclick={handleTransfer}
                        disabled={actionLoading ||
                            !transferRecipient ||
                            transferAmount <= 0}
                    >
                        {actionLoading ? "Sending..." : "Confirm Transfer"}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog.Root>

        <Dialog.Root bind:open={showRetireDialog}>
            <Dialog.Content class="sm:max-w-[425px] glass border-white/20">
                <Dialog.Header>
                    <Dialog.Title class="text-green-700 dark:text-green-400"
                        >Retire Credits</Dialog.Title
                    >
                    <Dialog.Description
                        >Permanently offset these credits to claim environmental
                        impact.</Dialog.Description
                    >
                </Dialog.Header>
                <div class="grid gap-4 py-4">
                    <div
                        class="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-200 dark:border-yellow-900/30"
                    >
                        <p
                            class="text-xs text-yellow-800 dark:text-yellow-500 flex items-start gap-2"
                        >
                            <AlertTriangle class="h-4 w-4 shrink-0" />
                            Warning: This action cannot be undone. Credits will be
                            removed from circulation.
                        </p>
                    </div>
                    <div class="grid gap-2">
                        <Label for="reason"
                            >Retirement Reason / Beneficiary</Label
                        >
                        <Textarea
                            id="reason"
                            placeholder="e.g. Offset for Company X 2024 Operations"
                            bind:value={retireReason}
                        />
                    </div>
                </div>
                <Dialog.Footer>
                    <Button
                        variant="ghost"
                        onclick={() => (showRetireDialog = false)}
                        >Cancel</Button
                    >
                    <Button
                        variant="destructive"
                        class="bg-green-600 hover:bg-green-700 text-white border-green-700"
                        onclick={handleRetire}
                        disabled={actionLoading || !retireReason}
                    >
                        {actionLoading ? "Retiring..." : "Confirm Retirement"}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog.Root>
    {/if}
</div>
