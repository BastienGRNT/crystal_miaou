<script lang="ts">
	let {
		label,
		valueLabel,
		min = 0,
		max = 100,
		step = 1,
		value,
		disabled = false,
		oninput,
		onchange
	}: {
		label?: string;
		valueLabel: string;
		min?: number;
		max?: number;
		step?: number;
		value: number;
		disabled?: boolean;
		oninput?: (value: number) => void;
		onchange?: (value: number) => void;
	} = $props();

	const pct = $derived(max > min ? ((value - min) / (max - min)) * 100 : 0);
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-center justify-between gap-2">
		{#if label}<span class="text-sm font-medium text-foreground">{label}</span>{/if}
		<span class="font-heading text-sm font-semibold text-primary">{valueLabel}</span>
	</div>
	<input
		type="range"
		{min}
		{max}
		{step}
		{disabled}
		{value}
		oninput={(e) => oninput?.(Number((e.target as HTMLInputElement).value))}
		onchange={(e) => onchange?.(Number((e.target as HTMLInputElement).value))}
		style={`--slider-fill: ${pct}%`}
		class="nutri-slider w-full disabled:opacity-40"
	/>
</div>

<style>
	.nutri-slider {
		appearance: none;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(
			to right,
			var(--color-primary) 0%,
			var(--color-primary) var(--slider-fill),
			var(--color-muted) var(--slider-fill),
			var(--color-muted) 100%
		);
		cursor: pointer;
	}
	.nutri-slider::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: var(--color-primary-foreground);
		border: 3px solid var(--color-primary);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}
	.nutri-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: var(--color-primary-foreground);
		border: 3px solid var(--color-primary);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}
	.nutri-slider:disabled::-webkit-slider-thumb {
		border-color: var(--color-muted-foreground);
	}
</style>
