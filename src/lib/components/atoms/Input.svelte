<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { value = $bindable(), class: className = '', ...rest }: HTMLInputAttributes & { class?: string } =
		$props();
</script>

<input
	bind:value
	class="min-h-10 w-full rounded-lg border border-input bg-popover px-3 py-2 text-sm text-foreground caret-primary placeholder:text-muted-foreground transition-colors hover:border-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none {className}"
	{...rest}
/>
