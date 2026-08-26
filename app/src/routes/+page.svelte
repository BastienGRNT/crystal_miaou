<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Card from '$lib/components/atoms/Card.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Tabs from '$lib/components/molecules/Tabs.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import FoodSelection from '$lib/components/organisms/FoodSelection.svelte';
	import DailyMealSchedule, {
		type RepartitionOkResponse
	} from '$lib/components/organisms/DailyMealSchedule.svelte';
	import RationDetails from '$lib/components/organisms/RationDetails.svelte';
	import DailyLogView, { type DailyLogOkResponse } from '$lib/components/organisms/DailyLogView.svelte';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Utensils from '@lucide/svelte/icons/utensils';

	interface CatRecord {
		id: string;
		name: string;
		activeCroquetteFoodId: string | null;
		activePateeFoodId: string | null;
		activeFriandiseFoodId: string | null;
		friandiseQuantiteTotaleG: string | null;
	}

	interface FoodOption {
		id: string;
		name: string;
		brand: string;
		type: 'croquette' | 'patee' | 'friandise';
	}

	interface DailyPlanRecord {
		id: string;
		name: string;
		isActive: boolean;
	}

	let {
		data
	}: {
		data: {
			cats: CatRecord[];
			activeCat: CatRecord | null;
			activeCatId: string | null;
			date: string;
			today: string;
			isToday: boolean;
			foods: FoodOption[];
			dailyPlans: DailyPlanRecord[];
			repartition: RepartitionOkResponse | null;
			repartitionError: string | null;
			dailyLog: DailyLogOkResponse | null;
			dailyLogError: string | null;
		};
	} = $props();

	const hasActiveFood = $derived(
		Boolean(data.activeCat?.activeCroquetteFoodId || data.activeCat?.activePateeFoodId)
	);
	const hasActiveRoutine = $derived(data.dailyPlans.some((plan) => plan.isActive));

	function shiftDate(isoDate: string, deltaDays: number): string {
		const d = new Date(isoDate);
		d.setDate(d.getDate() + deltaDays);
		return d.toISOString().slice(0, 10);
	}

	function dateHref(isoDate: string): string {
		const params = new URLSearchParams();
		if (data.activeCatId) params.set('catId', data.activeCatId);
		params.set('date', isoDate);
		return `/?${params.toString()}`;
	}

	function formatDateLabel(isoDate: string, today: string): string {
		if (isoDate === today) return "Aujourd'hui";
		if (isoDate === shiftDate(today, -1)) return 'Hier';
		return new Date(isoDate).toLocaleDateString('fr-FR', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:max-w-5xl md:py-10">
	<div class="mb-6 flex items-center gap-3">
		<span class="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
			<PawPrint class="size-5.5" />
		</span>
		<div>
			<h1 class="text-2xl md:text-3xl">Crystal Miaou</h1>
			<p class="text-sm text-muted-foreground">Suivi de la nutrition de vos chats.</p>
		</div>
	</div>

	{#if data.cats.length === 0}
		<Card>
			{#snippet header()}
				<h3 class="text-[17px] leading-tight">Bienvenue 👋</h3>
			{/snippet}
			<p class="text-sm text-muted-foreground">
				Ajoutez le profil de votre chat pour préparer le calcul de ses besoins nutritionnels.
			</p>
			<Button href="/onboarding/chat" class="w-fit">Ajouter un chat</Button>
		</Card>
	{:else}
		{#if data.cats.length > 1}
			<Tabs
				class="mb-4"
				items={data.cats.map((cat) => ({ value: cat.id, label: cat.name, href: `/?catId=${cat.id}&date=${data.date}` }))}
				value={data.activeCatId ?? ''}
			/>
		{/if}

		{#if data.activeCatId && data.activeCat}
			{#key data.activeCatId}
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
						<Button variant="ghost" size="sm" href={dateHref(shiftDate(data.date, -1))}>
							<ChevronLeft />
							Veille
						</Button>
						<span class="font-heading text-sm font-semibold text-foreground">{formatDateLabel(data.date, data.today)}</span>
						{#if data.isToday}
							<Button variant="ghost" size="sm" disabled>
								Lendemain
								<ChevronRight />
							</Button>
						{:else}
							<Button variant="ghost" size="sm" href={dateHref(shiftDate(data.date, 1))}>
								Lendemain
								<ChevronRight />
							</Button>
						{/if}
					</div>

					{#if data.isToday && !hasActiveRoutine}
						<EmptyState
							icon={CalendarClock}
							title="Aucune routine active"
							description="Configurez une routine pour définir les heures et le type de repas (pâtée/croquette)."
						>
							{#snippet action()}
								<Button href="/repas/routines" size="sm">Configurer une routine</Button>
							{/snippet}
						</EmptyState>
						<FoodSelection cat={data.activeCat} foods={data.foods} dailyPlans={data.dailyPlans} />
					{:else if data.isToday && !hasActiveFood}
						<EmptyState
							icon={Utensils}
							title="Aucun aliment actif"
							description="Choisissez au moins une pâtée ou une croquette ci-dessous pour que l'app calcule les quantités du jour."
						/>
						<FoodSelection cat={data.activeCat} foods={data.foods} dailyPlans={data.dailyPlans} />
					{:else}
						<div class="flex flex-col gap-4">
							{#if data.isToday}
								{#if data.repartitionError}
									<Alert variant="danger">{data.repartitionError}</Alert>
								{:else if data.repartition}
									<DailyMealSchedule
										repartition={data.repartition}
										catId={data.activeCatId}
										catName={data.activeCat.name}
										date={data.date}
										onchange={invalidateAll}
									/>
								{/if}
							{:else if data.dailyLogError}
								<Alert variant="danger">{data.dailyLogError}</Alert>
							{:else if data.dailyLog}
								<DailyLogView log={data.dailyLog} />
							{/if}

							<FoodSelection cat={data.activeCat} foods={data.foods} dailyPlans={data.dailyPlans} />
						</div>

						{#if data.isToday && data.repartition}
							<RationDetails repartition={data.repartition} catId={data.activeCatId} onchange={invalidateAll} />
						{/if}
					{/if}
				</div>
			{/key}
		{/if}
	{/if}
</div>
