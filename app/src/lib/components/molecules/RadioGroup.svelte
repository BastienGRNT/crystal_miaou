<script lang="ts" generics="T extends string">
	type Option<T> = { value: T; label: string };

	let {
		name,
		options,
		value = $bindable(),
		legend
	}: { name: string; options: Option<T>[]; value: T; legend?: string } = $props();
</script>

<fieldset class="flex flex-col gap-2">
	{#if legend}
		<legend class="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">{legend}</legend>
	{/if}
	<div class="flex flex-wrap gap-4">
		{#each options as option (option.value)}
			<label class="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground select-none">
				<span class="relative inline-flex size-4.5 shrink-0">
					<input
						type="radio"
						{name}
						value={option.value}
						checked={value === option.value}
						onchange={() => (value = option.value)}
						class="peer absolute inset-0 size-4.5 cursor-pointer opacity-0"
					/>
					<span
						class="pointer-events-none block size-4.5 rounded-full border-[1.5px] border-input bg-popover transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:shadow-[inset_0_0_0_4px_var(--color-popover)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40"
					></span>
				</span>
				{option.label}
			</label>
		{/each}
	</div>
</fieldset>
