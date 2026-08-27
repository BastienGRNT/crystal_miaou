import 'package:flutter/foundation.dart';
import '../../core/api_client.dart';
import '../../core/models/cat.dart';

class CatsService extends ChangeNotifier {
  CatsService(this._api);

  final ApiClient _api;

  List<Cat> cats = [];
  // Valeurs fermées d'ajustement DER, renvoyées par GET /api/cats (miroir de
  // CAT_DER_AJUSTEMENT_PCT_VALEURS, app/src/lib/domain/cat.calc.ts) — jamais codées en dur ici, sinon
  // rien ne garantit qu'elles restent identiques à ce que le web propose (CLAUDE.md règle 9).
  List<int> derAjustementPctValeurs = [];
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/api/cats') as Map<String, dynamic>;
      cats = (json['cats'] as List).map((e) => Cat.fromJson(e as Map<String, dynamic>)).toList();
      derAjustementPctValeurs = (json['derAjustementPctValeurs'] as List).map((e) => (e as num).toInt()).toList();
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Ajustement DER en un clic (±10/±5/normal), miroir de la card "Mes chats" du web.
  Future<void> setDerAjustementPct(String catId, int pct) async {
    await _api.patch('/api/cats/$catId', body: {'derAjustementPct': pct});
    await load();
  }
}
