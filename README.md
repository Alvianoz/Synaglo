# 🏥 Synaglo API - Smart Health Monitoring System

REST API backend untuk Synaglo Smartwatch dengan fitur monitoring kesehatan mental dan fisik real-time.

![Laravel](https://img.shields.io/badge/Laravel-10.x-red)
![PHP](https://img.shields.io/badge/PHP-8.1+-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [API Endpoints](#-api-endpoints)
- [Hardware Integration](#-hardware-integration)
- [Web Interface](#-web-interface)
- [Database Schema](#-database-schema)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Deployment](#-deployment)

---

## 🎯 Overview

Synaglo API adalah backend sistem monitoring kesehatan untuk smartwatch dengan kemampuan:
- ✅ Real-time health monitoring (Heart Rate, SpO2, HRV, Stress, GSR, Temperature)
- ✅ Analytics & trends visualization
- ✅ Recording history management
- ✅ RESTful API untuk hardware integration
- ✅ Web dashboard untuk data visualization
- ✅ Dummy data generator untuk prototype

---

## ✨ Features

### Health Monitoring
- Real-time biometric readings
- Historical data tracking
- Health score calculation
- Stress level analysis

### Analytics
- Daily, weekly, monthly trends
- Heart rate variability analysis
- Stress pattern recognition
- Health insights generation

### API Features
- Public REST API (no auth required for prototype)
- JSON response format
- CORS enabled
- Comprehensive error handling

---

## 📦 Requirements

### System Requirements
- **PHP** >= 8.1
- **Composer** (latest)
- **Database**: MySQL 8.0+ / PostgreSQL 13+ / SQLite 3+
- **Git** (optional)

### PHP Extensions
```
- pdo
- pdo_mysql (atau pdo_sqlite)
- mbstring
- openssl
- json
- curl
```

### Check Requirements
```bash
php -v           # Should be >= 8.2
composer -V      # Should show version
mysql --version  # Or sqlite3 --version
```

---

## 🚀 Installation

### Step 1: Clone Project

```bash
# Clone repository
git clone https://github.com/athalawiksa/SynagloV1.git
cd SynagloV1

# Or extract from ZIP
unzip SynagloV1.zip
cd SynagloV1
```

### Step 2: Install Dependencies

```bash
composer install
```

Expected output:
```
Loading composer repositories with package information
Installing dependencies from lock file
...
Generating optimized autoload files
```

### Step 3: Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### Step 4: Database Configuration

Edit `.env` file:

#### Option A: MySQL (Recommended)
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=synaglo_db
DB_USERNAME=root
DB_PASSWORD=your_password
```

#### Option B: SQLite (Easy Setup)
```env
DB_CONNECTION=sqlite
# Comment out: DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
```

For SQLite, create database file:
```bash
touch database/database.sqlite
```

### Step 5: Create Database

#### MySQL:
```bash
mysql -u root -p
CREATE DATABASE synaglo_db;
EXIT;
```

#### SQLite:
Already created in Step 4

### Step 6: Run Migrations & Seeders

```bash
# Fresh migration with seed data
php artisan migrate:fresh --seed
```

Expected output:
```
Generating data for: 2026-02-10
Current time: 14:30
Generated readings for today: 120
...
🎉 All Synaglo data seeded successfully!
```

### Step 7: Start Server

#### Local Only:
```bash
php artisan serve
```

#### Network Access (for hardware):
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Server running at:
```
http://127.0.0.1:8000 (local)
http://YOUR_IP:8000 (network)
```

### Step 8: Verify Installation

Open browser:
```
http://127.0.0.1:8000/api/health/current
```

Expected response:
```json
{
  "success": true,
  "data": {
    "heart_rate": 76,
    "spo2": "96.32",
    "stress": 24,
    "hrv": 64,
    ...
  }
}
```

✅ **Installation Complete!**

---

## 📡 API Endpoints

### Base URL
```
Local:      http://127.0.0.1:8000/api
Network:    http://YOUR_IP:8000/api
Production: https://api.synaglo.com/api
```

### 🏥 Health Monitoring

#### Get Current Health Data
```http
GET /api/health/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "heart_rate": 76,
    "heart_rate_status": "Normal",
    "spo2": "96.32",
    "spo2_status": "Excellent",
    "gsr": "3.30",
    "temperature": "36.70",
    "hrv": 64,
    "stress": 24,
    "stress_status": "Low",
    "timestamp": "2026-02-09T21:00:00+00:00",
    "reading_type": "historical"
  }
}
```

#### Get Health Stream (for Charts)
```http
GET /api/health/stream?period=latest&limit=50
```

**Parameters:**
- `period`: `latest`, `today`, `week`, `month` (default: `latest`)
- `limit`: 1-50 (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "labels": ["08:00", "08:15", "08:30", ...],
    "heart_rate": [72, 74, 71, ...],
    "stress": [35, 38, 32, ...],
    "hrv": [65, 63, 67, ...],
    "spo2": [98.5, 98.2, 99.0, ...]
  },
  "meta": {
    "period": "latest",
    "count": 50
  }
}
```

### 📊 Analytics

#### Get Analytics Summary
```http
GET /api/analytics/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_health_score": 85,
    "health_score_change": 5,
    "health_score_trend": "up",
    "avg_stress": 38.5,
    "stress_change": -8,
    "stress_trend": "improved",
    "avg_heart_rate": 73.2,
    "avg_hrv": 62.5,
    "avg_spo2": 98.3,
    "total_readings": 48
  }
}
```

#### Get Trends
```http
GET /api/analytics/trends?period=today
```

**Parameters:**
- `period`: `today`, `week`, `month` (default: `today`)

#### Get Detailed Analytics
```http
GET /api/analytics/detailed
```

#### Get Recording History
```http
GET /api/analytics/history?period=week&limit=10
```

**Parameters:**
- `period`: `today`, `week`, `all` (default: `today`)
- `limit`: 1-20 (default: 20)

### 👤 Profile

#### Get Profile Stats
```http
GET /api/profile/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "days_active": 28,
    "total_sessions": 156,
    "health_score": 85,
    "sessions_this_week": 21,
    "sessions_this_month": 85,
    "avg_session_duration": "18:30",
    "total_monitoring_time": "48:20:00"
  }
}
```

---

## 🔌 Hardware Integration

### Arduino/ESP32 Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* apiUrl = "http://192.168.1.100:8000/api/health/current";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting...");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiUrl);
    
    int httpCode = http.GET();
    if (httpCode > 0) {
      String payload = http.getString();
      
      DynamicJsonDocument doc(2048);
      deserializeJson(doc, payload);
      
      int heartRate = doc["data"]["heart_rate"];
      float spo2 = doc["data"]["spo2"];
      int stress = doc["data"]["stress"];
      
      Serial.printf("HR: %d, SpO2: %.1f, Stress: %d\n", 
                    heartRate, spo2, stress);
    }
    http.end();
  }
  delay(5000);
}
```

### Python Example

```python
import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

def get_health_data():
    response = requests.get(f"{BASE_URL}/health/current")
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            health = data['data']
            print(f"HR: {health['heart_rate']} BPM")
            print(f"SpO2: {health['spo2']}%")
            print(f"Stress: {health['stress']}/100")

while True:
    get_health_data()
    time.sleep(5)
```

### Flutter/Dart Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class SynagloAPI {
  static const String baseUrl = 'http://192.168.1.100:8000/api';
  
  static Future<Map<String, dynamic>> getCurrentHealth() async {
    final response = await http.get(
      Uri.parse('$baseUrl/health/current'),
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data['success']) {
        return data['data'];
      }
    }
    throw Exception('Failed to load health data');
  }
}

// Usage
var health = await SynagloAPI.getCurrentHealth();
print('Heart Rate: ${health['heart_rate']} BPM');
```

### Get Your Network IP

**Windows:**
```bash
ipconfig
# Look for IPv4 Address: 192.168.1.XXX
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
# Look for inet: 192.168.1.XXX
```

**Update hardware code:**
```cpp
const char* apiUrl = "http://192.168.1.XXX:8000/api/health/current";
```

---

## 🌐 Web Interface

Access web dashboard:

```
http://127.0.0.1:8000/dashboard    - Real-time monitoring
http://127.0.0.1:8000/analytics    - Analytics & trends
http://127.0.0.1:8000/health       - Health monitoring (with dummy data)
http://127.0.0.1:8000/profile      - User profile
```

---

## 🗄️ Database Schema

### Tables

#### `health_readings`
```sql
- id
- heart_rate (int)
- spo2 (decimal)
- gsr (decimal)
- temperature (decimal)
- hrv (int)
- stress (int)
- reading_time (timestamp)
- reading_type (enum: realtime, historical)
- timestamps
```

#### `analytics_summary`
```sql
- id
- date (date)
- overall_health_score (int)
- avg_stress (decimal)
- avg_heart_rate (decimal)
- avg_hrv (decimal)
- avg_spo2 (decimal)
- total_readings (int)
- hourly_data (json)
- timestamps
```

#### `recording_history`
```sql
- id
- start_time (timestamp)
- end_time (timestamp)
- duration_seconds (int)
- is_complete (boolean)
- avg_heart_rate (int)
- avg_spo2 (decimal)
- avg_stress (int)
- avg_hrv (int)
- health_score (int)
- summary_data (json)
- timestamps
```

---

## 🧪 Testing

### Test API with cURL

```bash
# Test current health
curl http://127.0.0.1:8000/api/health/current

# Test health stream
curl "http://127.0.0.1:8000/api/health/stream?period=latest&limit=10"

# Test analytics
curl http://127.0.0.1:8000/api/analytics/summary
```

### Test with Postman

1. Create new request
2. Method: `GET`
3. URL: `http://127.0.0.1:8000/api/health/current`
4. Send

### Check Database

```bash
# Laravel Tinker
php artisan tinker

# Then run:
\App\Models\HealthReading::count()
\App\Models\HealthReading::latest()->first()
\App\Models\AnalyticsSummary::orderBy('date', 'desc')->first()
```

---

## 🐛 Troubleshooting

### Issue: Can't access API from hardware

**Solution:**
```bash
# Start server with network access
php artisan serve --host=0.0.0.0 --port=8000

# Check firewall allows port 8000
# Windows: Windows Defender Firewall → Allow port 8000
```

### Issue: Empty data (Array 0)

**Solution:**
```bash
# Re-seed database
php artisan migrate:fresh --seed
```

### Issue: 404 on /api/* routes

**Solution:**
```bash
php artisan route:clear
php artisan cache:clear
php artisan config:clear
```

### Issue: CORS error from hardware

**Solution:**

Already configured in `config/cors.php`:
```php
'allowed_origins' => ['*'],
```

If still error:
```bash
composer require fruitcake/laravel-cors
```

### Issue: "Class not found"

**Solution:**
```bash
composer dump-autoload
php artisan optimize:clear
```

---

## 🚀 Deployment

### Production Setup

#### 1. Environment
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.synaglo.com
```

#### 2. Optimize
```bash
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

#### 3. Apache VirtualHost
```apache
<VirtualHost *:80>
    ServerName api.synaglo.com
    DocumentRoot /var/www/synaglo-api/public
    
    <Directory /var/www/synaglo-api/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

#### 4. Nginx Config
```nginx
server {
    listen 80;
    server_name api.synaglo.com;
    root /var/www/synaglo-api/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
    }
}
```

#### 5. SSL (Let's Encrypt)
```bash
certbot --nginx -d api.synaglo.com
```

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## 🔒 Security Notes

- ⚠️ **Prototype mode**: No authentication required
- ⚠️ **Production**: Implement API token authentication
- ⚠️ **CORS**: Currently allows all origins (`*`)
- ⚠️ **HTTPS**: Use SSL certificate in production

---

## 📄 License

MIT License - Free to use for educational and commercial purposes.

---

## 👥 Contributors

- **Athala** - Initial development

---

## 📞 Support

- **Issues**: Create issue on GitHub
- **Email**: support@synaglo.com
- **Documentation**: [API Docs](http://localhost:8000/api)

---

## 🎯 Roadmap

- [ ] User authentication (Laravel Sanctum)
- [ ] Real hardware sensor integration
- [ ] AI-powered health recommendations
- [ ] Mobile app (Flutter)
- [ ] Cloud deployment
- [ ] WebSocket real-time updates
- [ ] Export data to PDF/CSV
- [ ] Multi-user support

---

**Made with ❤️ for Synaglo Smart Health Monitoring**

---

## Quick Commands Reference

```bash
# Install
composer install
php artisan key:generate
php artisan migrate:fresh --seed

# Run
php artisan serve --host=0.0.0.0

# Test
curl http://127.0.0.1:8000/api/health/current

# Refresh data
php artisan migrate:fresh --seed

# Clear cache
php artisan optimize:clear

# Check routes
php artisan route:list --path=api
```