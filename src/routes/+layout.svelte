<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import NavBar, { type NavItem } from '$lib/components/molecules/NavBar.svelte';
	import House from '@lucide/svelte/icons/house';
	import Cat from '@lucide/svelte/icons/cat';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import Wheat from '@lucide/svelte/icons/wheat';
	import BookOpen from '@lucide/svelte/icons/book-open';

	let { children } = $props();

	const authPaths = new Set(['/login', '/register']);

	const navItems: NavItem[] = [
		{ href: '/', label: 'Accueil', icon: House },
		{ href: '/chats', label: 'Mes chats', icon: Cat },
		{ href: '/repas/routines', label: 'Routines', icon: CalendarClock },
		{ href: '/analyse', label: 'Analyse', icon: ChartLine },
		{ href: '/repas/ajouter', label: 'Ajouter', icon: CirclePlus },
		{ href: '/aliments', label: 'Aliments', icon: Wheat },
		{ href: '/comprendre', label: 'Comprendre', icon: BookOpen }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if authPaths.has(page.url.pathname)}
	{@render children()}
{:else}
	<NavBar brand="Crystal Miaou" items={navItems} activePath={page.url.pathname} />
	<main class="min-h-screen pb-20 md:ml-60 md:pb-0">
		{@render children()}
	</main>
{/if}
