<script lang="ts">
	import Button from '$lib/components/atoms/Button.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import IconButton from '$lib/components/atoms/IconButton.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	interface Member {
		membershipId: string;
		userId: string;
		name: string;
		email: string;
	}

	let { catId, currentUserId }: { catId: string; currentUserId: string } = $props();

	let members = $state<Member[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	let email = $state('');
	let inviting = $state(false);
	let inviteError = $state<string | null>(null);

	let removingId = $state<string | null>(null);
	let removeError = $state<string | null>(null);

	async function load() {
		loading = true;
		loadError = null;
		const response = await fetch(`/api/cats/${catId}/members`);
		if (response.ok) {
			const body = await response.json();
			members = body.members;
		} else {
			loadError = 'Impossible de charger le foyer.';
		}
		loading = false;
	}

	$effect(() => {
		load();
	});

	async function handleInvite(event: SubmitEvent) {
		event.preventDefault();
		inviteError = null;

		if (!email.trim()) {
			inviteError = 'Adresse email requise.';
			return;
		}

		inviting = true;
		const response = await fetch(`/api/cats/${catId}/members`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		inviting = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			inviteError = body.error ?? "Impossible d'ajouter cette personne.";
			return;
		}

		email = '';
		await load();
	}

	async function handleRemove(member: Member) {
		if (
			!confirm(
				member.userId === currentUserId
					? 'Quitter le foyer de ce chat ? Vous ne verrez plus son suivi.'
					: `Retirer ${member.name} du foyer de ce chat ?`
			)
		) {
			return;
		}

		removingId = member.membershipId;
		removeError = null;

		const response = await fetch(`/api/cats/${catId}/members/${member.membershipId}`, { method: 'DELETE' });
		removingId = null;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			removeError = body.error ?? 'Impossible de retirer ce membre.';
			return;
		}

		await load();
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-muted-foreground">
		Toute personne du foyer voit le même suivi pour ce chat (repas, routine, poids) — pas besoin de
		ressaisir quoi que ce soit chacun de son côté.
	</p>

	<form class="flex items-end gap-2" onsubmit={handleInvite}>
		<div class="flex-1">
			<FormField label="Email d'un compte existant" for="member-email">
				<Input id="member-email" type="email" placeholder="prenom@exemple.fr" bind:value={email} autocomplete="off" />
			</FormField>
		</div>
		<Button type="submit" disabled={inviting}>
			{#if inviting}<Spinner />{:else}<UserPlus />{/if}
			Ajouter
		</Button>
	</form>
	{#if inviteError}<Alert variant="danger">{inviteError}</Alert>{/if}

	{#if loading}
		<Spinner />
	{:else if loadError}
		<Alert variant="danger">{loadError}</Alert>
	{:else}
		<div class="flex flex-col gap-1.5">
			{#each members as member (member.membershipId)}
				<div class="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
					<div class="flex flex-col">
						<span class="text-sm font-medium text-foreground">
							{member.name}{member.userId === currentUserId ? ' (vous)' : ''}
						</span>
						<span class="text-xs text-muted-foreground">{member.email}</span>
					</div>
					<IconButton
						label={member.userId === currentUserId ? 'Quitter le foyer' : 'Retirer du foyer'}
						variant="danger"
						onclick={() => (removingId === member.membershipId ? undefined : handleRemove(member))}
					>
						{#if removingId === member.membershipId}<Spinner />{:else}<Trash2 />{/if}
					</IconButton>
				</div>
			{/each}
		</div>
		{#if removeError}<Alert variant="danger">{removeError}</Alert>{/if}
	{/if}
</div>
