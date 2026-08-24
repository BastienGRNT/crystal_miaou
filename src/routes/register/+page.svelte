<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import AuthCard from '$lib/components/organisms/AuthCard.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		loading = true;

		const { error: signUpError } = await authClient.signUp.email({
			name,
			email,
			password
		});

		loading = false;

		if (signUpError) {
			error = signUpError.message ?? 'Inscription impossible.';
			return;
		}

		await goto('/onboarding/chat');
	}
</script>

<AuthCard title="Créer un compte" subtitle="Suivez la nutrition de vos chats." onsubmit={handleSubmit}>
	<FormField label="Nom" for="name">
		<Input id="name" type="text" name="name" bind:value={name} autocomplete="name" />
	</FormField>

	<FormField label="Email" for="email">
		<Input id="email" type="email" name="email" bind:value={email} autocomplete="email" required />
	</FormField>

	<FormField label="Mot de passe" for="password">
		<Input
			id="password"
			type="password"
			name="password"
			bind:value={password}
			autocomplete="new-password"
			minlength={8}
			required
		/>
	</FormField>

	{#if error}<Alert variant="danger">{error}</Alert>{/if}

	<Button type="submit" block disabled={loading}>
		{#if loading}<Spinner />{/if}
		{loading ? 'Création...' : 'Créer mon compte'}
	</Button>

	{#snippet footer()}
		Déjà un compte ? <a href="/login">Se connecter</a>
	{/snippet}
</AuthCard>
