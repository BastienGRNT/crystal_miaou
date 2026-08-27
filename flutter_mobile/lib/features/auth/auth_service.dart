import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../core/api_client.dart';

/// Auth Better Auth côté mobile : le plugin `bearer` (voir app/src/lib/server/auth.ts) renvoie le
/// token de session dans l'en-tête de réponse `set-auth-token` (pas dans le corps JSON) — à stocker
/// et renvoyer ensuite en `Authorization: Bearer <token>` sur chaque requête `/api/...`.
class AuthService extends ChangeNotifier {
  AuthService(this._api);

  final ApiClient _api;
  bool _checkedStoredToken = false;
  bool _isAuthenticated = false;

  bool get isAuthenticated => _isAuthenticated;
  bool get checkedStoredToken => _checkedStoredToken;

  Future<void> bootstrap() async {
    final token = await _api.token;
    _isAuthenticated = token != null;
    _checkedStoredToken = true;
    notifyListeners();
  }

  Future<void> signIn({required String email, required String password}) async {
    await _authRequest('/api/auth/sign-in/email', {'email': email, 'password': password});
  }

  Future<void> signUp({required String email, required String password, required String name}) async {
    await _authRequest('/api/auth/sign-up/email', {'email': email, 'password': password, 'name': name});
  }

  Future<void> _authRequest(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('${_api.baseUrl}$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
      final message = decoded is Map && decoded['message'] != null ? decoded['message'].toString() : 'Échec de connexion';
      throw ApiException(res.statusCode, message);
    }
    final token = res.headers['set-auth-token'];
    if (token == null) {
      throw ApiException(res.statusCode, "Le serveur n'a pas renvoyé de token (plugin bearer absent ?)");
    }
    await _api.setToken(token);
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> signOut() async {
    await _api.clearToken();
    _isAuthenticated = false;
    notifyListeners();
  }
}
