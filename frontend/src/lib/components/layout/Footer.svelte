<script>
    import { Leaf, Twitter, Linkedin, Facebook, Github } from "@lucide/svelte";
</script>

<footer
    class="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 md:py-0"
>
    <div
        class="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4 md:px-8"
    >
        <div
            class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0"
        >
            <Leaf class="h-6 w-6 text-primary hidden md:block" />
            <p
                class="text-center text-sm leading-loose text-muted-foreground md:text-left"
            >
                Built by <a
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    class="font-medium underline underline-offset-4"
                    >Karbonica Team</a
                >. The source code is available on
                <a
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    class="font-medium underline underline-offset-4">GitHub</a
                >.
            </p>
        </div>

        <div class="flex gap-4">
            <a
                href="#"
                class="text-muted-foreground hover:text-foreground transition-colors"
            >
                <Twitter class="h-4 w-4" />
            </a>
            <a
                href="#"
                class="text-muted-foreground hover:text-foreground transition-colors"
            >
                <Linkedin class="h-4 w-4" />
            </a>
            <a
                href="#"
                class="text-muted-foreground hover:text-foreground transition-colors"
            >
                <Github class="h-4 w-4" />
            </a>
        </div>
    </div>
</footer>
