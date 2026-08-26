<script lang="ts">
	type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

	let {
		value,
		tone = 'primary',
		class: className = ''
	}: { value: number; tone?: Tone; class?: string } = $props();

	const tones: Record<Tone, string> = {
		primary: 'bg-primary',
		secondary: 'bg-secondary',
		success: 'bg-success',
		warning: 'bg-warning',
		danger: 'bg-destructive'
	};

	const pct = $derived(Math.max(0, Math.min(100, value)));
</script>

<div class="h-2.5 w-full overflow-hidden rounded-full bg-muted {className}" role="progressbar" aria-valuenow={pct}>
	<div class="h-full rounded-full {tones[tone]} transition-[width] duration-300 ease-out" style={`width: ${pct}%`}></div>
</div>
