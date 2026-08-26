import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// URL de base de l'API (app/ web+API), baked au build.
///
/// - Émulateur Android visant l'API lancée en local sur l'hôte : 10.0.2.2 est l'alias standard
///   pour joindre le "localhost" de la machine hôte depuis l'émulateur.
/// - Appareil physique sur le même réseau local : passer l'IP LAN via
///   `--dart-define=API_BASE_URL=http://192.168.1.42:5173`.
/// - Build de production : passer l'URL réelle du serveur déployé.
const String _defaultApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5173',
);

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Client HTTP unique de l'app — aucune logique métier ici, uniquement des appels REST vers
/// `/api/...` avec le token bearer Better Auth, exactement comme le prescrit CLAUDE.md pour le
/// mobile ("client pur de l'API de app/").
class ApiClient {
  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? _defaultApiBaseUrl;

  final String baseUrl;
  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'auth_bearer_token';

  Future<String?> get token => _storage.read(key: _tokenKey);

  Future<void> setToken(String token) => _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<Map<String, String>> _headers({bool json = true}) async {
    final t = await token;
    return {
      if (json) 'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$baseUrl$path').replace(queryParameters: query);

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final res = await http.get(_uri(path, query), headers: await _headers(json: false));
    return _decode(res);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final res = await http.post(_uri(path), headers: await _headers(), body: jsonEncode(body ?? {}));
    return _decode(res);
  }

  Future<dynamic> patch(String path, {Map<String, dynamic>? body}) async {
    final res = await http.patch(_uri(path), headers: await _headers(), body: jsonEncode(body ?? {}));
    return _decode(res);
  }

  Future<dynamic> delete(String path) async {
    final res = await http.delete(_uri(path), headers: await _headers(json: false));
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final message = decoded is Map && decoded['error'] != null
          ? decoded['error'].toString()
          : 'Erreur ${res.statusCode}';
      throw ApiException(res.statusCode, message);
    }
    return decoded;
  }
}
