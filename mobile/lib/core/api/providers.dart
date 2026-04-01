import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'repositories.dart';

final authRepositoryProvider = Provider((_) => AuthRepository());
final feeRepositoryProvider = Provider((_) => FeeRepository());

class AuthState {
  final bool isLoading;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({this.isLoading = false, this.user, this.error});

  AuthState copyWith({bool? isLoading, Map<String, dynamic>? user, String? error}) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState());

  Future<void> sendOtp(String mobile) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.sendOtp(mobile);
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString().replaceAll('Exception: ', ''));
      rethrow;
    }
  }

  Future<bool> verifyOtp(String mobile, String otp) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _repo.verifyOtp(mobile, otp);
      final user = res['data']['user'] as Map<String, dynamic>;
      state = state.copyWith(isLoading: false, user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString().replaceAll('Exception: ', ''));
      return false;
    }
  }

  Future<void> loadUser() async {
    try {
      final res = await _repo.getMe();
      // Response: { status, data: { student: { ... } } }
      final user = res['data']['student'] as Map<String, dynamic>;
      state = state.copyWith(user: user);
    } catch (_) {}
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.read(authRepositoryProvider)),
);

final feeStatusProvider = FutureProvider((ref) async {
  return ref.read(feeRepositoryProvider).getMyFeeStatus();
});

final myPaymentsProvider = FutureProvider((ref) async {
  return ref.read(feeRepositoryProvider).getMyPayments();
});
