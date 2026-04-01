import '../api/api_client.dart';

class AuthRepository {
  Future<Map<String, dynamic>> sendOtp(String mobile) async {
    return await apiClient.post('/auth/student/send-otp', data: {'mobile': mobile});
  }

  Future<Map<String, dynamic>> verifyOtp(String mobile, String otp) async {
    final res = await apiClient.post('/auth/student/verify-otp', data: {
      'mobile': mobile,
      'otp': otp,
    });
    if (res['token'] != null) await ApiClient.saveToken(res['token']);
    return res;
  }

  Future<Map<String, dynamic>> getMe() async {
    return await apiClient.get('/auth/student/me');
  }

  Future<void> logout() => ApiClient.clearToken();
}

class FeeRepository {
  Future<Map<String, dynamic>> getMyFeeStatus() async {
    return await apiClient.get('/payments/my-fee-status');
  }

  Future<Map<String, dynamic>> getMyFeeStructure() async {
    return await apiClient.get('/fee-structures/my-fee-structure');
  }

  Future<Map<String, dynamic>> getMyPayments() async {
    return await apiClient.get('/payments/my-payments');
  }

  Future<Map<String, dynamic>> createOrder({
    required String feeStructureId,
    required int installmentNumber,
    double? amount,
  }) async {
    return await apiClient.post('/payments/create-order', data: {
      'feeStructureId': feeStructureId,
      'installmentNumber': installmentNumber,
      if (amount != null) 'amount': amount,
      if (amount != null) 'isPartialPayment': true,
    });
  }

  Future<Map<String, dynamic>> verifyPayment({
    required String orderId,
    required String paymentId,
    required String signature,
  }) async {
    return await apiClient.post('/payments/verify', data: {
      'razorpayOrderId': orderId,
      'razorpayPaymentId': paymentId,
      'razorpaySignature': signature,
    });
  }
}
