import 'package:flutter/foundation.dart';
import '../../core/api_client.dart';
import '../../core/models/analyse.dart';

class AnalyseService extends ChangeNotifier {
  AnalyseService(this._api);

  final ApiClient _api;

  Analyse? analyse;
  bool loading = false;
  String? error;

  Future<void> load(String catId, {int days = 14}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/api/analyse', query: {'catId': catId, 'days': days.toString()});
      analyse = Analyse.fromJson(json as Map<String, dynamic>);
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
