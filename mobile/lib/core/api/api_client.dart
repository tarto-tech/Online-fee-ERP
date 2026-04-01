import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String _baseUrl = 'http://10.121.172.202:5000/api';
  static const _storage = FlutterSecureStorage();

  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          _storage.delete(key: 'token');
          // Navigate to login - handled by router
        }
        handler.next(error);
      },
    ));
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? params}) async {
    final res = await _dio.get(path, queryParameters: params);
    return res.data as T;
  }

  Future<T> post<T>(String path, {dynamic data}) async {
    final res = await _dio.post(path, data: data);
    return res.data as T;
  }

  Future<T> patch<T>(String path, {dynamic data}) async {
    final res = await _dio.patch(path, data: data);
    return res.data as T;
  }

  static Future<void> saveToken(String token) =>
      _storage.write(key: 'token', value: token);

  static Future<void> clearToken() => _storage.delete(key: 'token');

  static Future<String?> getToken() => _storage.read(key: 'token');
}

final apiClient = ApiClient();
