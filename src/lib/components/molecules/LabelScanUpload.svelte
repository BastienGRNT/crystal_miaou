<script lang="ts">
	import Button from '$lib/components/atoms/Button.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import Upload from '@lucide/svelte/icons/upload';
	import type { ParsedFoodLabel } from '$lib/domain/ocr.calc';

	interface ScanResult {
		rawText: string;
		parsed: ParsedFoodLabel;
	}

	let { onScanned }: { onScanned: (result: ScanResult) => void } = $props();

	let cameraInput: HTMLInputElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let previewUrl = $state<string | null>(null);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleFile(file: File | undefined) {
		if (!file) return;

		errorMessage = null;
		previewUrl = URL.createObjectURL(file);
		loading = true;

		try {
			const formData = new FormData();
			formData.append('image', file);

			const response = await fetch('/api/foods/scan', { method: 'POST', body: formData });

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message ?? "Échec de la lecture de l'image.");
			}

			const result = (await response.json()) as ScanResult;
			onScanned(result);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Échec de la lecture de l'image.";
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex gap-2">
		<Button type="button" variant="secondary" onclick={() => cameraInput?.click()} disabled={loading}>
			<Camera />Prendre une photo
		</Button>
		<Button type="button" variant="secondary" onclick={() => fileInput?.click()} disabled={loading}>
			<Upload />Importer une image
		</Button>
	</div>

	<input
		bind:this={cameraInput}
		type="file"
		accept="image/*"
		capture="environment"
		class="hidden"
		onchange={(e) => handleFile((e.currentTarget as HTMLInputElement).files?.[0])}
	/>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={(e) => handleFile((e.currentTarget as HTMLInputElement).files?.[0])}
	/>

	{#if previewUrl}
		<img src={previewUrl} alt="Aperçu de l'étiquette scannée" class="max-h-40 w-auto rounded-lg border border-border object-contain" />
	{/if}

	{#if loading}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<Spinner />Lecture de l'étiquette…
		</div>
	{/if}

	{#if errorMessage}
		<Alert variant="danger">{errorMessage}</Alert>
	{/if}
</div>
