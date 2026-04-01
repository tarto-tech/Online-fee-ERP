import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/api/api_client.dart';
import 'core/api/providers.dart';
import 'features/auth/screens/otp_screen.dart';
import 'features/fees/screens/fee_status_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: CollegeERPApp()));
}

final _router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) async {
    final token = await ApiClient.getToken();
    final isAuth = token != null;
    final loc = state.matchedLocation;
    final isPublic = loc == '/' || loc.startsWith('/otp');
    if (!isAuth && !isPublic) return '/';
    if (isAuth && isPublic) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/', builder: (_, __) => const LoginScreen()),
    GoRoute(
      path: '/otp/:mobile',
      builder: (_, state) => OtpScreen(mobile: state.pathParameters['mobile']!),
    ),
    GoRoute(
      path: '/home',
      builder: (_, __) => const HomeScreen(),
      routes: [
        GoRoute(path: 'fees', builder: (_, __) => const FeeStatusScreen()),
      ],
    ),
  ],
);

class CollegeERPApp extends StatelessWidget {
  const CollegeERPApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'College ERP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(centerTitle: true),
      ),
      routerConfig: _router,
    );
  }
}

// ─── Login Screen ────────────────────────────────────────────────────────────

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _mobileController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _mobileController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final mobile = _mobileController.text.trim();
    if (mobile.length != 10) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    setState(() { _isLoading = true; _error = null; });
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendOtp(mobile);
      if (mounted) context.push('/otp/$mobile');
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.school, size: 64, color: Colors.blue),
              const SizedBox(height: 16),
              Text('College ERP',
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const Text('Student Fee Portal',
                  style: TextStyle(color: Colors.grey, fontSize: 16)),
              const SizedBox(height: 48),
              const Text('Mobile Number',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              const SizedBox(height: 8),
              TextField(
                controller: _mobileController,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(
                  prefixText: '+91  ',
                  hintText: '9876543210',
                  counterText: '',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _sendOtp,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Send OTP',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Load user profile if not already loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authProvider).user;
      if (user == null) {
        ref.read(authProvider.notifier).loadUser();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('College ERP'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Card
            if (user != null)
              Card(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.blue.shade100,
                        child: Text(
                          (user['name'] as String? ?? 'S')[0].toUpperCase(),
                          style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user['name']?.toString() ?? 'Student',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(user['studentId']?.toString() ?? '',
                                style: const TextStyle(color: Colors.grey)),
                            Text(
                              '${(user['course'] is Map ? user['course']['name'] : '') ?? ''} · Year ${user['currentYear']?.toString() ?? ''}',
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),

            const SizedBox(height: 24),
            const Text('Quick Actions',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),

            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                _ActionCard(
                    icon: Icons.payment,
                    label: 'Pay Fees',
                    color: Colors.blue,
                    onTap: () => context.push('/home/fees')),
                _ActionCard(
                    icon: Icons.history,
                    label: 'Payment History',
                    color: Colors.green,
                    onTap: () => context.push('/home/fees')),
                _ActionCard(
                    icon: Icons.receipt_long,
                    label: 'Download Receipt',
                    color: Colors.orange,
                    onTap: () => context.push('/home/fees')),
                _ActionCard(
                    icon: Icons.person,
                    label: 'My Profile',
                    color: Colors.purple,
                    onTap: () {}),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard(
      {required this.icon,
      required this.label,
      required this.color,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 36, color: color),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(fontWeight: FontWeight.w500, color: color),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
