import 'package:flutter/material.dart';
import '../../core/models/cat.dart';
import '../../core/theme.dart';

/// Bottom sheet de changement rapide de chat, ouverte depuis l'AppBar de "Aujourd'hui" — évite de
/// repasser par l'onglet "Mes chats" juste pour changer de chat quand le foyer en a plusieurs.
Future<Cat?> showCatSwitcherSheet(BuildContext context, {required List<Cat> cats, required String? selectedCatId}) {
  return showModalBottomSheet<Cat>(
    context: context,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
    ),
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Changer de chat', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          ...cats.map(
            (cat) => ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.primary.withValues(alpha: 0.16),
                child: const Icon(Icons.pets, color: AppColors.primary),
              ),
              title: Text(cat.name),
              trailing: cat.id == selectedCatId ? const Icon(Icons.check, color: AppColors.success) : null,
              onTap: () => Navigator.of(context).pop(cat),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
