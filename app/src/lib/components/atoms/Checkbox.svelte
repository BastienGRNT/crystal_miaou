<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Check from '@lucide/svelte/icons/check';

	let {
		checked = $bindable(false),
		children,
		...rest
	}: { checked?: boolean; children: Snippet } & HTMLInputAttributes = $props();
</script>

<label
	class="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground select-none has-disabled:cursor-not-allowed has-disabled:opacity-45"
>
	<span class="relative inline-flex size-5 shrink-0">
		<input type="checkbox" bind:checked {...rest} class="peer absolute inset-0 size-5 cursor-pointer opacity-0" />
		<span
			class="pointer-events-none flex size-5 items-center justify-center rounded-md border-[1.5px] border-input bg-popover text-primary-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40"
		>
			<Check class="size-3.5 transition-opacity {checked ? 'opacity-100' : 'opacity-0'}" strokeWidth={3} />
		</span>
	</span>
	{@render children()}
</label>
