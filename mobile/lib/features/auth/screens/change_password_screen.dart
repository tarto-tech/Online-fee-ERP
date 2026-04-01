import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/providers.dart';

class ChangePasswordScreen extends ConsumerStatefulWidget {
  final bool isFirstLogin;
  const ChangePasswordScreen({super.key, this.isFirstLogin = false});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_newCtrl.text != _confirmCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match'), backgroundColor: Colors.red),
      );
      return;
    }
    if (_newCtrl.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters'), backgroundColor: Colors.red),
      );
      return;
    }
    final success = await ref.read(authProvider.notifier).changePassword(
          _currentCtrl.text,
          _newCtrl.text,
        );
    if (success && mounted) Navigator.pushReplacementNamed(context, '/home');
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isFirstLogin ? 'Set New Password' : 'Change Password'),
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.isFirstLogin) ...[
              const Text('You are using a temporary password. Please set a new password to continue.',
                  style: TextStyle(color: Colors.orange)),
              const SizedBox(height: 24),
            ],
            _PasswordField(controller: _currentCtrl, label: 'Current / Temporary Password', obscure: _obscure,
                onToggle: () => setState(() => _obscure = !_obscure)),
            const SizedBox(height: 16),
            _PasswordField(controller: _newCtrl, label: 'New Password', obscure: _obscure,
                onToggle: () => setState(() => _obscure = !_obscure)),
            const SizedBox(height: 16),
            _PasswordField(controller: _confirmCtrl, label: 'Confirm New Password', obscure: _obscure,
                onToggle: () => setState(() => _obscure = !_obscure)),
            if (authState.error != null) ...[
              const SizedBox(height: 12),
              Text(authState.error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: authState.isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: authState.isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Update Password', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool obscure;
  final VoidCallback onToggle;

  const _PasswordField({required this.controller, required this.label, required this.obscure, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        suffixIcon: IconButton(
          icon: Icon(obscure ? Icons.visibility_off : Icons.visibility),
          onPressed: onToggle,
        ),
      ),
    );
  }
}
