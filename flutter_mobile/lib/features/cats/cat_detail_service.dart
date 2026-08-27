import 'package:flutter/foundation.dart';
import '../../core/api_client.dart';
import '../../core/models/cat_member.dart';
import '../../core/models/daily_plan.dart';
import '../../core/models/food.dart';
import '../../core/models/weight_log.dart';

/// Regroupe tout ce qui gravite autour d'un chat mais n'est pas "Aujourd'hui" : sélection des
/// aliments actifs, routines, suivi de poids, foyer. Aucune règle métier ici — chaque méthode
/// appelle l'API et relit l'état à jour, exactement comme le fait `invalidateAll()` côté web.
class CatDetailService extends ChangeNotifier {
  CatDetailService(this._api);

  final ApiClient _api;

  bool loading = false;
  String? error;

  List<Food> foods = [];
  List<DailyPlan> dailyPlans = [];
  List<WeightLogEntry> weightHistory = [];
  WeightTrendEvaluation? weightEvaluation;
  List<CatMember> members = [];

  Future<void> load(String catId) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _api.get('/api/foods'),
        _api.get('/api/daily-plans', query: {'catId': catId}),
        _api.get('/api/cats/$catId/weight-logs'),
        _api.get('/api/cats/$catId/members'),
      ]);

      foods = ((results[0] as Map<String, dynamic>)['foods'] as List)
          .map((e) => Food.fromJson(e as Map<String, dynamic>))
          .toList();
      dailyPlans = ((results[1] as Map<String, dynamic>)['dailyPlans'] as List)
          .map((e) => DailyPlan.fromJson(e as Map<String, dynamic>))
          .toList();
      final weightJson = results[2] as Map<String, dynamic>;
      weightHistory =
          (weightJson['historique'] as List).map((e) => WeightLogEntry.fromJson(e as Map<String, dynamic>)).toList();
      weightEvaluation = WeightTrendEvaluation.fromJson(weightJson['evaluation'] as Map<String, dynamic>);
      members = ((results[3] as Map<String, dynamic>)['members'] as List)
          .map((e) => CatMember.fromJson(e as Map<String, dynamic>))
          .toList();
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> updateFoodSelection(
    String catId, {
    String? croquetteFoodId,
    String? pateeFoodId,
    String? friandiseFoodId,
    double? friandiseQuantiteTotaleG,
  }) async {
    await _api.patch('/api/cats/$catId', body: {
      'croquetteFoodId': croquetteFoodId,
      'pateeFoodId': pateeFoodId,
      'friandiseFoodId': friandiseFoodId,
      'friandiseQuantiteTotaleG': friandiseQuantiteTotaleG,
    });
  }

  Future<void> createDailyPlan(String catId, String name, List<DailyPlanSlot> slots) async {
    await _api.post('/api/daily-plans', body: {
      'catId': catId,
      'name': name,
      'slots': slots.map((s) => s.toJson()).toList(),
    });
  }

  Future<void> updateDailyPlan(String catId, String planId, String name, List<DailyPlanSlot> slots) async {
    await _api.patch('/api/daily-plans/$planId', body: {
      'catId': catId,
      'name': name,
      'slots': slots.map((s) => s.toJson()).toList(),
    });
  }

  Future<void> deleteDailyPlan(String planId) async {
    await _api.delete('/api/daily-plans/$planId');
  }

  Future<void> activateDailyPlan(String planId) async {
    await _api.post('/api/daily-plans/$planId/activate');
  }

  Future<void> addWeightLog(String catId, double weightKg, String recordedAt) async {
    await _api.post('/api/cats/$catId/weight-logs', body: {'weightKg': weightKg, 'recordedAt': recordedAt});
  }

  Future<void> deleteWeightLog(String catId, String logId) async {
    await _api.delete('/api/cats/$catId/weight-logs', body: {'id': logId});
  }

  Future<void> addMember(String catId, String email) async {
    await _api.post('/api/cats/$catId/members', body: {'email': email});
  }

  Future<void> removeMember(String catId, String membershipId) async {
    await _api.delete('/api/cats/$catId/members/$membershipId');
  }
}
