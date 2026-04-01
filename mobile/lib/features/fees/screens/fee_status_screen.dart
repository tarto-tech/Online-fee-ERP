import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../../core/api/providers.dart';
import '../../../core/api/repositories.dart';

class FeeStatusScreen extends ConsumerStatefulWidget {
  const FeeStatusScreen({super.key});

  @override
  ConsumerState<FeeStatusScreen> createState() => _FeeStatusScreenState();
}

class _FeeStatusScreenState extends ConsumerState<FeeStatusScreen> {
  late Razorpay _razorpay;
  final _feeRepo = FeeRepository();
  String? _pendingOrderId;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onPaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _onPaymentError);
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  Future<void> _initiatePayment(Map<String, dynamic> feeData) async {
    try {
      final feeStructure = await _feeRepo.getMyFeeStructure();
      final feeStructureId = feeStructure['data']['feeStructure']['_id'];

      final orderData = await _feeRepo.createOrder(
        feeStructureId: feeStructureId,
        installmentNumber: 1,
      );

      _pendingOrderId = orderData['data']['orderId'];

      final options = {
        'key': orderData['data']['keyId'],
        'amount': orderData['data']['amount'],
        'currency': 'INR',
        'order_id': _pendingOrderId,
        'name': 'College ERP',
        'description': 'Fee Payment',
        'prefill': {
          'name': orderData['data']['studentName'],
          'email': orderData['data']['studentEmail'],
          'contact': '+91${orderData['data']['studentMobile']}',
        },
        'theme': {'color': '#3B82F6'},
      };

      _razorpay.open(options);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _onPaymentSuccess(PaymentSuccessResponse response) async {
    try {
      await _feeRepo.verifyPayment(
        orderId: response.orderId!,
        paymentId: response.paymentId!,
        signature: response.signature!,
      );
      ref.invalidate(feeStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment successful!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Verification failed: ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _onPaymentError(PaymentFailureResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment failed: ${response.message}'), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    final feeStatus = ref.watch(feeStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Fee Status'), elevation: 0),
      body: feeStatus.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (data) {
          final d = data['data'];
          final totalFees = (d['totalFees'] as num?)?.toDouble() ?? 0.0;
          final paidAmount = (d['paidAmount'] as num?)?.toDouble() ?? 0.0;
          final pendingAmount = (d['pendingAmount'] as num?)?.toDouble() ?? 0.0;
          final progress = totalFees > 0 ? paidAmount / totalFees : 0.0;
          final components = (d['feeComponents'] as List?) ?? [];

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Summary Card
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        _FeeRow('Total Fees', totalFees, Colors.blue),
                        const Divider(height: 24),
                        _FeeRow('Paid Amount', paidAmount, Colors.green),
                        const SizedBox(height: 8),
                        _FeeRow('Pending Amount', pendingAmount, Colors.orange),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 10,
                            backgroundColor: Colors.grey.shade200,
                            valueColor: const AlwaysStoppedAnimation(Colors.green),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text('${(progress * 100).toStringAsFixed(1)}% paid',
                            style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Fee Components
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Fee Breakdown',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 12),
                        ...(components).map((comp) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(comp['name']?.toString() ?? '',
                                  style: const TextStyle(color: Colors.grey)),
                              Text('₹${(comp['amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                                  style: const TextStyle(fontWeight: FontWeight.w500)),
                            ],
                          ),
                        )),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                if (pendingAmount > 0)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _initiatePayment(d),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: Colors.blue,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        'Pay ₹${pendingAmount.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 16, color: Colors.white),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FeeRow extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;

  const _FeeRow(this.label, this.amount, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 15)),
        Text(
          '₹${amount.toStringAsFixed(0)}',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }
}
