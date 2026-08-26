import 'package:flutter/foundation.dart';
import '../../core/api_client.dart';
import '../../core/models/cat.dart';

class CatsService extends ChangeNotifier {
  CatsService(this._api);

  final ApiClient _api;

  List<Cat> cats = [];
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/api/cats');
      cats = ((json as Map<String, dynamic>)['cats'] as List).map((e) => Cat.fromJson(e as Map<String, dynamic>)).toList();
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
