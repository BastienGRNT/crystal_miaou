import { useState } from 'react';
import { View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { LabelScanResponse } from '@shared/ocr';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { Text } from '../atoms/Text';
import { Alert } from './Alert';
import { colors, radii, spacing } from '../tokens';
import { apiPostMultipart, ApiError } from '../../api/client';

interface LabelScanUploadProps {
	onScanned: (result: LabelScanResponse) => void;
}

export function LabelScanUpload({ onScanned }: LabelScanUploadProps) {
	const [previewUri, setPreviewUri] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handlePicked(result: ImagePicker.ImagePickerResult) {
		if (result.canceled || result.assets.length === 0) return;
		const asset = result.assets[0];

		setError(null);
		setPreviewUri(asset.uri);
		setLoading(true);

		try {
			const formData = new FormData();
			// @ts-expect-error -- FormData en React Native attend cette forme {uri, name, type}, pas un Blob.
			formData.append('image', { uri: asset.uri, name: asset.fileName ?? 'label.jpg', type: asset.mimeType ?? 'image/jpeg' });

			const scanResult = await apiPostMultipart<LabelScanResponse>('/api/foods/scan', formData);
			onScanned(scanResult);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Échec de la lecture de l'image.");
		} finally {
			setLoading(false);
		}
	}

	async function handleTakePhoto() {
		const permission = await ImagePicker.requestCameraPermissionsAsync();
		if (!permission.granted) {
			setError('Autorisation caméra refusée.');
			return;
		}
		await handlePicked(await ImagePicker.launchCameraAsync({ quality: 0.8 }));
	}

	async function handlePickFromLibrary() {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			setError('Autorisation galerie refusée.');
			return;
		}
		await handlePicked(await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }));
	}

	return (
		<View style={{ gap: spacing.sm }}>
			<View style={{ flexDirection: 'row', gap: spacing.sm }}>
				<View style={{ flex: 1 }}>
					<Button variant="secondary" label="Prendre une photo" onPress={handleTakePhoto} disabled={loading} />
				</View>
				<View style={{ flex: 1 }}>
					<Button variant="secondary" label="Importer une image" onPress={handlePickFromLibrary} disabled={loading} />
				</View>
			</View>

			{previewUri ? (
				<Image source={{ uri: previewUri }} style={{ height: 140, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }} resizeMode="contain" />
			) : null}

			{loading ? (
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
					<Spinner />
					<Text variant="caption" color="muted">
						Lecture de l'étiquette…
					</Text>
				</View>
			) : null}

			{error ? <Alert variant="error" message={error} /> : null}
		</View>
	);
}
