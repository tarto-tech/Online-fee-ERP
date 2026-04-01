# Flutter Mobile App Setup Guide

## Prerequisites
1. Install Flutter SDK: https://docs.flutter.dev/get-started/install
2. Install Android Studio (for Android) or Xcode (for iOS/Mac)
3. Install VS Code with Flutter extension (optional but recommended)

## Setup Steps

### 1. Verify Flutter Installation
```bash
flutter doctor
```
Should show all checkmarks. If not, follow the instructions to fix issues.

### 2. Navigate to Mobile Directory
```bash
cd mobile
```

### 3. Install Dependencies
```bash
flutter pub get
```

### 4. Update API URL
Edit `lib/core/api/api_client.dart` and change the base URL:

**For Android Emulator:**
```dart
static const String _baseUrl = 'http://10.0.2.2:5000/api';
```

**For iOS Simulator:**
```dart
static const String _baseUrl = 'http://localhost:5000/api';
```

**For Real Device (same WiFi network):**
```dart
static const String _baseUrl = 'http://YOUR_COMPUTER_IP:5000/api';
// Example: 'http://192.168.1.100:5000/api'
```

To find your computer's IP:
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` (look for inet)

### 5. Run the App

**For Android Emulator:**
```bash
# Start emulator first from Android Studio
flutter run
```

**For iOS Simulator (Mac only):**
```bash
open -a Simulator
flutter run
```

**For Physical Device:**
```bash
# Connect device via USB with USB debugging enabled
flutter devices  # Check if device is detected
flutter run
```

## Testing the App

### 1. Login Flow
- Open app → Enter mobile number: `9876543210` (the student you created)
- Backend will log OTP in console (development mode)
- Check backend terminal for: `[DEV] OTP for 9876543210: 123456`
- Enter the OTP → Login successful

### 2. View Fee Status
- Home screen shows student profile
- Click "Pay Fees" card
- See total fees, paid amount, pending amount
- Fee breakdown with components

### 3. Make Payment (Test Mode)
- Click "Pay ₹XXXX" button
- Razorpay checkout opens
- Use test card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- Payment succeeds → Receipt generated

## Common Issues

### Issue 1: "Unable to connect to backend"
**Solution:** 
- Ensure backend is running on port 5000
- Check API URL in `api_client.dart`
- For real device, ensure both are on same WiFi
- Disable firewall temporarily to test

### Issue 2: "Gradle build failed"
**Solution:**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

### Issue 3: "CocoaPods not installed" (iOS)
**Solution:**
```bash
sudo gem install cocoapods
cd ios
pod install
cd ..
flutter run
```

### Issue 4: OTP not visible
**Solution:** OTP is logged in backend console during development. Check the terminal where `npm run dev` is running.

## Building Release APK (Android)

```bash
flutter build apk --release
```
APK location: `build/app/outputs/flutter-apk/app-release.apk`

## Building for iOS (Mac only)

```bash
flutter build ios --release
```
Then open `ios/Runner.xcworkspace` in Xcode and archive.

---

# Alternative: Web-Based Student Portal

If Flutter setup is complex, use the web-based student portal below.
