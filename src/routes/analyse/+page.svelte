<script lang="ts">
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Tabs from '$lib/components/molecules/Tabs.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import AnalyseEvolution, {
		type AnalyseOkResponse
	} from '$lib/components/organisms/AnalyseEvolution.svelte';
	import ChartLine from '@lucide/svelte/icons/chart-line';

	interface CatRecord {
		id: string;
		name: string;
	}

	let {
		data
	}: {
		data: {
			cats: CatRecord[];
			activeCatId: string | null;
			days: number;
			analyse: AnalyseOkResponse | null;
			analyseError: string | null;
		};
	} = $props();

	const periodes = [
		{ jours: 7, label: '7 jours' },
		{ jours: 14, label: '14 jours' },
		{ jours: 30, label: '30 jours' },
		{ jours: 90, label: '90 jours' }
	];

	function periodeHref(jours: number): string {
		const params = new URLSearchParams();
		if (data.activeCatId) params.set('catId', data.activeCatId);
		params.set('days', String(jours));
		return `/analyse?${params.toString()}`;
	}

	function catHref(catId: string): string {
		const params = new URLSearchParams();
		params.set('catId', catId);
		params.set('days', String(data.days));
		return `/analyse?${params.toString()}`;
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-10">
	<PageHeader title="Analyse" subtitle="Évolution des apports alimentaires dans le temps." />

	<Alert variant="info" class="mb-4">
		Ces chiffres sont une estimation basée sur les valeurs saisies pour vos aliments, pas une mesure
		en laboratoire — vérifiez-les avec le dosage conseillé sur le paquet et consultez votre
		vétérinaire pour toute décision de suivi de poids ou de régime.
	</Alert>

	{#if data.cats.length === 0}
		<EmptyState icon={ChartLine} title="Aucun chat" description="Ajoutez d'abord un chat pour voir son évolution." />
	{:else}
		<div class="mb-4 flex flex-wrap items-center gap-2">
			{#if data.cats.length > 1}
				<Tabs
					items={data.cats.map((cat) => ({ value: cat.id, label: cat.name, href: catHref(cat.id) }))}
					value={data.activeCatId ?? ''}
				/>
			{/if}
			<Tabs
				items={periodes.map((p) => ({ value: String(p.jours), label: p.label, href: periodeHref(p.jours) }))}
				value={String(data.days)}
			/>
		</div>

		{#if data.analyseError}
			<Alert variant="danger">{data.analyseError}</Alert>
		{:else if data.analyse}
			<div class="flex flex-col gap-4">
				<AnalyseEvolution analyse={data.analyse} />
			</div>
		{/if}
	{/if}
</div>
