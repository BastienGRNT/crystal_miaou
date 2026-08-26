<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import AuthCard from '$lib/components/organisms/AuthCard.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		loading = true;

		const { error: signInError } = await authClient.signIn.email({
			email,
			password
		});

		loading = false;

		if (signInError) {
			error = signInError.message ?? 'Connexion impossible.';
			return;
		}

		await goto('/');
	}
</script>

<AuthCard title="Se connecter" subtitle="Suivez la nutrition de vos chats." onsubmit={handleSubmit}>
	<FormField label="Email" for="email">
		<Input id="email" type="email" name="email" bind:value={email} autocomplete="email" required />
	</FormField>

	<FormField label="Mot de passe" for="password">
		<Input
			id="password"
			type="password"
			name="password"
			bind:value={password}
			autocomplete="current-password"
			required
		/>
	</FormField>

	{#if error}<Alert variant="danger">{error}</Alert>{/if}

	<Button type="submit" block disabled={loading}>
		{#if loading}<Spinner />{/if}
		{loading ? 'Connexion...' : 'Se connecter'}
	</Button>

	{#snippet footer()}
		Pas encore de compte ? <a href="/register">Créer un compte</a>
	{/snippet}
</AuthCard>
