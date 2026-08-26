import 'package:flutter/foundation.dart';
import '../../core/api_client.dart';
import '../../core/models/repartition.dart';
import '../../widget/home_widget_service.dart';

/// Aucune logique métier ici (calcul DER, répartition...) : tout vient de `GET /api/repartition`,
/// déjà calculé et persisté côté serveur — cf. règle CLAUDE.md "API-first, une seule source de vérité".
class TodayService extends ChangeNotifier {
  TodayService(this._api, this._homeWidget);

  final ApiClient _api;
  final HomeWidgetService _homeWidget;

  RepartitionJour? repartition;
  bool loading = false;
  String? error;

  Future<void> load(String catId, {DateTime? date}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final d = date ?? DateTime.now();
      final dateStr = '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      final json = await _api.get('/api/repartition', query: {'catId': catId, 'date': dateStr});
      repartition = RepartitionJour.fromJson(json as Map<String, dynamic>);
      await _homeWidget.syncFromRepartition(repartition!);
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> setValidated(String catId, String mealEntryId, bool validated) async {
    await _api.patch('/api/meal-entries/$mealEntryId', body: {'validated': validated});
    await load(catId);
  }

  Future<void> adjustQuantity(String catId, String mealEntryId, double quantityG) async {
    await _api.patch('/api/meal-entries/$mealEntryId', body: {'quantityG': quantityG});
    await load(catId);
  }
}
