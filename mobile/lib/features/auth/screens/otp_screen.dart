import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';
import '../../../core/api/providers.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String mobile;
  const OtpScreen({super.key, required this.mobile});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (_otpController.text.length != 6) return;
    setState(() { _isLoading = true; _error = null; });
    try {
      final success = await ref
          .read(authProvider.notifier)
          .verifyOtp(widget.mobile, _otpController.text);
      if (success && mounted) {
        context.go('/home');
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP'), elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 24),
            Text('Enter OTP sent to',
                style: Theme.of(context).textTheme.titleMedium),
            Text('+91 ${widget.mobile}',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 32),
            Center(
              child: Pinput(
                controller: _otpController,
                length: 6,
                onCompleted: (_) => _verify(),
                defaultPinTheme: PinTheme(
                  width: 52,
                  height: 56,
                  textStyle: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            if (_error != null || authState.error != null) ...[
              const SizedBox(height: 12),
              Text(_error ?? authState.error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_isLoading || authState.isLoading) ? null : _verify,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: (_isLoading || authState.isLoading)
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Verify OTP',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
