import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/models/food.dart';
import '../../core/theme.dart';
import 'food_form_screen.dart';
import 'foods_service.dart';

class FoodsScreen extends StatefulWidget {
  const FoodsScreen({super.key});

  @override
  State<FoodsScreen> createState() => _FoodsScreenState();
}

class _FoodsScreenState extends State<FoodsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<FoodsService>().load());
  }

  Future<void> _openManualForm({Food? existing}) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => FoodFormScreen(existing: existing)),
    );
    if (saved == true && mounted) context.read<FoodsService>().load();
  }

  Future<void> _scanAndOpenForm(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 85);
    if (picked == null || !mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );
    try {
      final parsed = await context.read<FoodsService>().scanLabel(File(picked.path));
      if (!mounted) return;
      Navigator.of(context).pop();
      final saved = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => FoodFormScreen(parsedFromScan: parsed)),
      );
      if (saved == true && mounted) context.read<FoodsService>().load();
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Échec du scan : $e')));
      }
    }
  }

  Future<void> _openAddMenu() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: AppColors.primary),
              title: const Text('Scanner une étiquette (appareil photo)'),
              onTap: () => Navigator.of(context).pop('camera'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppColors.primary),
              title: const Text('Scanner depuis une photo existante'),
              onTap: () => Navigator.of(context).pop('gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.edit_outlined, color: AppColors.primary),
              title: const Text('Saisir manuellement'),
              onTap: () => Navigator.of(context).pop('manual'),
            ),
          ],
        ),
      ),
    );

    if (choice == 'camera') {
      await _scanAndOpenForm(ImageSource.camera);
    } else if (choice == 'gallery') {
      await _scanAndOpenForm(ImageSource.gallery);
    } else if (choice == 'manual') {
      await _openManualForm();
    }
  }

  Future<void> _delete(Food food) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cet aliment ?'),
        content: Text('Supprimer "${food.name}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<FoodsService>().deleteFood(food.id);
    }
  }

  IconData _iconFor(String type) => switch (type) {
        'croquette' => Icons.grain,
        'patee' => Icons.set_meal,
        'friandise' => Icons.cookie,
        _ => Icons.restaurant,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Aliments')),
      floatingActionButton: FloatingActionButton(onPressed: _openAddMenu, child: const Icon(Icons.add)),
      body: Consumer<FoodsService>(
        builder: (context, service, _) {
          if (service.loading && service.foods.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (service.error != null) {
            return Center(child: Text(service.error!, style: const TextStyle(color: AppColors.destructive)));
          }
          if (service.foods.isEmpty) {
            return const Center(child: Text('Aucun aliment. Ajoutez-en un avec le bouton +.'));
          }
          return RefreshIndicator(
            onRefresh: service.load,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: service.foods.length,
              itemBuilder: (context, i) {
                final food = service.foods[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.16),
                      child: Icon(_iconFor(food.type), color: AppColors.primary),
                    ),
                    title: Text(food.name),
                    subtitle: Text(
                      '${food.brand}${food.emKcal100g != null ? ' · ${food.emKcal100g!.toStringAsFixed(0)} kcal/100g' : ''}',
                    ),
                    onTap: () => _openManualForm(existing: food),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
                      onPressed: () => _delete(food),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
