import 'package:shared_preferences/shared_preferences.dart';

/// Mémorise le dernier chat sélectionné (SharedPreferences, local à l'appareil) pour ne pas
/// redemander "choisis un chat" à chaque ouverture de l'app.
class SelectedCatStore {
  static const _key = 'selected_cat_id';

  Future<String?> read() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key);
  }

  Future<void> write(String catId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, catId);
  }
}
