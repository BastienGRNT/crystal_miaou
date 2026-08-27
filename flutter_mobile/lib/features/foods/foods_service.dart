import 'dart:io';
import 'package:flutter/foundation.dart';
import '../../core/api_client.dart';
import '../../core/models/food.dart';

class FoodsService extends ChangeNotifier {
  FoodsService(this._api);

  final ApiClient _api;

  List<Food> foods = [];
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/api/foods') as Map<String, dynamic>;
      foods = (json['foods'] as List).map((e) => Food.fromJson(e as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> createFood(Map<String, dynamic> input) async {
    await _api.post('/api/foods', body: input);
    await load();
  }

  Future<void> updateFood(String id, Map<String, dynamic> input) async {
    await _api.patch('/api/foods/$id', body: input);
    await load();
  }

  Future<void> deleteFood(String id) async {
    await _api.delete('/api/foods/$id');
    await load();
  }

  /// OCR local self-hosted (Tesseract.js côté serveur, `foods/scan/+server.ts`) — jamais d'API tierce
  /// (CLAUDE.md règle 8). Le résultat n'est qu'une pré-saisie : `food_form_screen.dart` affiche
  /// toujours ces valeurs dans un formulaire éditable avant tout `POST /api/foods`.
  Future<ParsedFoodLabel> scanLabel(File image) async {
    final json = await _api.postMultipartFile(
      '/api/foods/scan',
      fieldName: 'image',
      bytes: await image.readAsBytes(),
      filename: image.path.split('/').last,
    ) as Map<String, dynamic>;
    return ParsedFoodLabel.fromJson(json['parsed'] as Map<String, dynamic>);
  }
}
