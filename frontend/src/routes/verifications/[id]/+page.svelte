
<script lang="ts">
    import { page } from "$app/state";
    import { api } from "$lib/api/client";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        ClipboardCheck,
        ArrowLeft,
        CheckCircle,
        XCircle,
        FileText,
        Leaf,
        Calendar,
        MapPin,
        AlertTriangle,
    } from "@lucide/svelte";

    let verification = $state<any>(null);
    let project = $state<any>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Action State
    let actionLoading = $state(false);
    let creditsToIssue = $state<number>(0);
    let rejectionReason = $state("");
    let notes = $state("");

    onMount(async () => {
        // For this prototype, we're fetching project details directly
        // assuming the ID passed corresponds to a project.
        const id = page.params.id;

        try {
            const response = await api.getProject(id);
            if (response.status === "success" && response.data) {
                project = response.data.project;
                verification = {
                    id: "ver-" + project.id,
                    projectId: project.id,
                    status: project.status,
                    submittedAt: project.createdAt,
                    // Mock documents
                    documents: [
                        { name: "Project_Design_Document.pdf", size: "2.4 MB" },
                        {
                            name: "Emissions_Calculation_Sheet.xlsx",
                            size: "1.1 MB",
                        },
                        { name: "Land_Ownership_Proof.pdf", size: "0.8 MB" },
                    ],
                };
                creditsToIssue = project.emissionsTarget; // Default to target
            } else {
                error = "Verification request not found";
            }
        } catch (e) {
            error = "Network error";
        } finally {
            loading = false;
        }
    });

    async function handleApprove() {
        if (!project) return;
        actionLoading = true;

        try {
            const response = await api.approveVerification(
                project.id,
                Number(creditsToIssue),
                notes,
            );
            if (response.status === "success") {
                goto("/verifications");
            } else {
                // Using alert for prototype simplicity, ideally use toast
                alert(response.error?.message || "Failed to approve");
            }
        } catch (e) {
            alert("Error processing request");
        } finally {
            actionLoading = false;
        }
    }

    async function handleReject() {
        if (!project) return;
        actionLoading = true;

        try {
            const response = await api.rejectVerification(
                project.id,
                rejectionReason,
            );
            if (response.status === "success") {
                goto("/verifications");
            } else {
                alert(response.error?.message || "Failed to reject");
            }
        } catch (e) {
            alert("Error processing request");
        } finally {
            actionLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Review Verification - Karbonica</title>
</svelte:head>

<div class="space-y-6 animate-in max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4">
        <Button href="/verifications" variant="ghost" size="icon">
            <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                Verification Request
            </h1>
            <p class="text-sm text-muted-foreground">
                Review project documentation and issue credits
            </p>
        </div>
    </div>

    {#if loading}
        <div class="space-y-6">
            <Skeleton class="h-12 w-full" />
            <Skeleton class="h-64 w-full" />
        </div>
    {:else if error}
        <Card.Root class="glass-card border-red-200">
            <Card.Content class="pt-6 text-center text-red-600">
                <p>{error}</p>
                <Button href="/verifications" variant="link" class="mt-4"
                    >Back to List</Button
                >
            </Card.Content>
        </Card.Root>
    {:else if project}
        <div class="grid gap-6 md:grid-cols-2">
            <!-- Project Context -->
            <div class="space-y-6">
                <Card.Root class="glass-card">
                    <Card.Header>
                        <Card.Title>Project Overview</Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div>
                            <Label class="text-muted-foreground"
                                >Project Title</Label
                            >
                            <p class="font-medium text-lg">{project.title}</p>
                        </div>
                        <div>
                            <Label class="text-muted-foreground">Type</Label>
                            <div class="flex items-center gap-2 mt-1">
                                <Badge variant="outline" class="capitalize"
                                    >{project.type.replace(/_/g, " ")}</Badge
                                >
                            </div>
                        </div>
                        <div>
                            <Label class="text-muted-foreground">Location</Label
                            >
                            <p>{project.location}, {project.country}</p>
                        </div>
                        <div>
                            <Label class="text-muted-foreground"
                                >Description</Label
                            >
                            <p
                                class="text-sm text-muted-foreground mt-1 line-clamp-4"
                            >
                                {project.description}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            href={`/projects/${project.id}`}
                            target="_blank"
                        >
                            View Full Project Details
                        </Button>
                    </Card.Content>
                </Card.Root>

                <Card.Root class="glass-card">
                    <Card.Header>
                        <Card.Title>Submitted Documents</Card.Title>
                        <Card.Description
                            >Review the following compliance documents</Card.Description
                        >
                    </Card.Header>
                    <Card.Content class="space-y-2">
                        {#each verification.documents as doc}
                            <div
                                class="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                <div class="flex items-center gap-3">
                                    <FileText class="h-5 w-5 text-primary" />
                                    <div>
                                        <p class="font-medium text-sm">
                                            {doc.name}
                                        </p>
                                        <p
                                            class="text-xs text-muted-foreground"
                                        >
                                            {doc.size}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">View</Button>
                            </div>
                        {/each}
                    </Card.Content>
                </Card.Root>
            </div>

            <!-- Verification Actions -->
            <div class="space-y-6">
                <Card.Root class="glass-card border-primary/20">
                    <Card.Header>
                        <Card.Title>Verification Decision</Card.Title>
                        <Card.Description
                            >Approve emission reductions or reject the request</Card.Description
                        >
                    </Card.Header>
                    <Card.Content class="space-y-6">
                        {#if project.status === "pending"}
                            <div
                                class="space-y-4 p-4 bg-muted/30 rounded-lg border"
                            >
                                <div
                                    class="flex items-center gap-2 font-medium text-green-700 dark:text-green-400"
                                >
                                    <CheckCircle class="h-5 w-5" />
                                    <span>Approve & Issue Credits</span>
                                </div>

                                <div class="space-y-2">
                                    <Label
                                        >Verified Credits to Issue (tCO₂e)</Label
                                    >
                                    <Input
                                        type="number"
                                        bind:value={creditsToIssue}
                                    />
                                    <p class="text-xs text-muted-foreground">
                                        Original Target: {project.emissionsTarget.toLocaleString()}
                                        tCO₂e
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label>Validation Notes</Label>
                                    <Textarea
                                        placeholder="Add notes about the verification audit..."
                                        bind:value={notes}
                                    />
                                </div>

                                <Button
                                    class="w-full bg-green-600 hover:bg-green-700 text-white shadow-md transition-all hover:scale-[1.02]"
                                    onclick={handleApprove}
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? "Processing..."
                                        : "Approve Project"}
                                </Button>
                            </div>

                            <div class="relative">
                                <div class="absolute inset-0 flex items-center">
                                    <span class="w-full border-t border-border"
                                    ></span>
                                </div>
                                <div
                                    class="relative flex justify-center text-xs uppercase"
                                >
                                    <span
                                        class="bg-background px-2 text-muted-foreground"
                                        >Or</span
                                    >
                                </div>
                            </div>

                            <div
                                class="space-y-4 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20"
                            >
                                <div
                                    class="flex items-center gap-2 font-medium text-red-700 dark:text-red-400"
                                >
                                    <XCircle class="h-5 w-5" />
                                    <span>Reject Request</span>
                                </div>

                                <div class="space-y-2">
                                    <Label>Rejection Reason</Label>
                                    <Textarea
                                        placeholder="Explain why this project was rejected..."
                                        bind:value={rejectionReason}
                                        class="border-red-200 focus-visible:ring-red-500"
                                    />
                                </div>

                                <Button
                                    variant="destructive"
                                    class="w-full shadow-sm"
                                    onclick={handleReject}
                                    disabled={actionLoading || !rejectionReason}
                                >
                                    Reject Project
                                </Button>
                            </div>
                        {:else}
                            <div
                                class="flex flex-col items-center justify-center py-6 text-center space-y-4 bg-muted/20 rounded-lg border"
                            >
                                {#if project.status === "verified"}
                                    <div
                                        class="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                                    >
                                        <CheckCircle
                                            class="h-8 w-8 text-green-600 dark:text-green-400"
                                        />
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-lg">
                                            Project Verified
                                        </h3>
                                        <p class="text-muted-foreground">
                                            This project has been approved and
                                            credits issued.
                                        </p>
                                    </div>
                                {:else if project.status === "rejected"}
                                    <div
                                        class="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center"
                                    >
                                        <XCircle
                                            class="h-8 w-8 text-red-600 dark:text-red-400"
                                        />
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-lg">
                                            Project Rejected
                                        </h3>
                                        <p class="text-muted-foreground">
                                            This request was rejected.
                                        </p>
                                    </div>
                                {/if}
                                <Button variant="outline" href="/verifications"
                                    >Return to Queue</Button
                                >
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>
            </div>
        </div>
    {/if}
</div>
