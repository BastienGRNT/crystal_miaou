import 'package:home_widget/home_widget.dart';
import 'package:intl/intl.dart';
import '../core/models/repartition.dart';

/// Pousse les données du prochain repas vers le widget d'écran d'accueil Android
/// (`android/app/src/main/kotlin/.../HomeWidgetProvider.kt`, voir mobile/native/widget/).
///
/// `home_widget` écrit dans les SharedPreferences natives, lues par le AppWidgetProvider Kotlin —
/// zéro appel réseau depuis le widget lui-même, il ne fait qu'afficher la dernière valeur poussée
/// par l'app au premier plan.
class HomeWidgetService {
  static const _androidWidgetName = 'HomeWidgetProvider';

  Future<void> syncFromRepartition(RepartitionJour jour) async {
    final prochain = jour.prochainRepas;
    if (prochain == null) {
      await HomeWidget.saveWidgetData<String>('next_meal_title', 'Tous les repas sont donnés');
      await HomeWidget.saveWidgetData<String>('next_meal_subtitle', '');
    } else {
      final heure = DateFormat.Hm('fr_FR').format(prochain.consumedAt);
      await HomeWidget.saveWidgetData<String>('next_meal_title', '$heure — ${prochain.food.name}');
      await HomeWidget.saveWidgetData<String>(
        'next_meal_subtitle',
        '${prochain.quantiteG.toStringAsFixed(1)} g · ${prochain.kcal.toStringAsFixed(0)} kcal',
      );
    }
    await HomeWidget.updateWidget(androidName: _androidWidgetName);
  }
}
