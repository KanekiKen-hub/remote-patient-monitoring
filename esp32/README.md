# ESP32 + MAX30102 Integration Guide

## Overview

This document provides the complete hardware setup and Arduino firmware for integrating an **ESP32 NodeMCU (30-pin)** with the **MAX30102 Pulse Oximeter** sensor into the HealthMonitor RPM backend.

---

## Hardware Requirements

| Component | Quantity |
|-----------|----------|
| ESP32 NodeMCU 30-pin | 1 |
| MAX30102 Pulse Oximeter Module | 1 |
| Jumper wires | 4 |
| USB cable (for programming) | 1 |

---

## Wiring Diagram

```
MAX30102        ESP32 (30-pin)
---------       --------------
VIN/VCC  ─────  3.3V (Pin 1)
GND      ─────  GND
SDA      ─────  GPIO 21 (SDA)
SCL      ─────  GPIO 22 (SCL)
INT      ─────  (optional) GPIO 19
```

> **Note**: The MAX30102 operates at 3.3V logic level — compatible with ESP32 directly.

---

## Arduino Libraries Required

Install these via Arduino IDE Library Manager:

| Library | Author |
|---------|--------|
| MAX30105 (MAX30102 compatible) | SparkFun Electronics |
| WiFi | Built-in (ESP32) |
| HTTPClient | Built-in (ESP32) |
| ArduinoJson | Benoit Blanchon |

---

## Firmware Setup

### 1. Arduino IDE Setup

1. Install Arduino IDE 2.x
2. Add ESP32 board support:
   - File → Preferences → Additional Board URLs:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Tools → Board → ESP32 Arduino → ESP32 Dev Module

### 2. Firmware Configuration

Edit these constants in the firmware file:

```cpp
// WiFi credentials
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Server configuration
const char* SERVER_URL = "http://YOUR_SERVER_IP:5000/api/iot/readings";

// Device credentials (get these from admin when device is created)
const char* DEVICE_ID = "DEV_001";
const char* DEVICE_TOKEN = "your_device_token_here";

// Sending interval (milliseconds)
const int SEND_INTERVAL = 5000; // Every 5 seconds
```

### 3. ESP32 Firmware (esp32_firmware.ino)

```cpp
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =============================================
// CONFIGURATION - Edit these values
// =============================================
const char* WIFI_SSID = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* SERVER_URL = "http://192.168.1.100:5000/api/iot/readings";
const char* DEVICE_ID = "DEV_001";
const char* DEVICE_TOKEN = "your_device_token_here";
const int SEND_INTERVAL = 5000;

// =============================================
// Global variables
// =============================================
MAX30105 particleSensor;

// SpO2 algorithm buffers
uint32_t irBuffer[100];
uint32_t redBuffer[100];
int32_t bufferLength = 100;
int32_t spo2;
int8_t validSPO2;
int32_t heartRate;
int8_t validHeartRate;

unsigned long lastSendTime = 0;

// =============================================
void setup() {
  Serial.begin(115200);
  Serial.println("HealthMonitor RPM - ESP32 Starting...");

  // Initialize MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERROR: MAX30102 not found. Check wiring.");
    while (1);
  }

  // Configure sensor
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
}

// =============================================
void loop() {
  // Collect 100 samples for SpO2 algorithm
  for (byte i = 0; i < bufferLength; i++) {
    while (particleSensor.available() == false)
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
  }

  // Calculate SpO2 and Heart Rate
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, bufferLength, redBuffer,
    &spo2, &validSPO2, &heartRate, &validHeartRate
  );

  // Send to server every SEND_INTERVAL ms
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;

    if (validHeartRate && validSPO2) {
      sendReading((int)heartRate, (int)spo2);
    } else {
      Serial.println("Warning: Invalid reading, skipping send.");
    }
  }
}

// =============================================
void sendReading(int hr, int sp) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping send.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["heartRate"] = hr;
  doc["spo2"] = sp;

  String payload;
  serializeJson(doc, payload);

  Serial.print("Sending: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("Response (");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(response);
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
  }

  http.end();
}
```

---

## Getting Device Credentials

1. Admin logs into the system
2. Admin navigates to Device Management → Create New Device
3. System generates `DEV_001` and a random device token
4. **Copy the device token immediately** — it is shown only once
5. Enter `DEVICE_ID` and `DEVICE_TOKEN` in the firmware

---

## Server Configuration for ESP32

If running the backend on your local machine, the ESP32 must be on the same WiFi network.

Find your computer's local IP:
```bash
# Windows
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

Update `SERVER_URL` in the firmware to use this IP.

For production deployment, use a public server URL.

---

## Testing the Connection

1. Flash firmware to ESP32
2. Open Arduino IDE Serial Monitor (115200 baud)
3. Watch for "Connected! IP: ..." message
4. Place finger on MAX30102 sensor
5. Within 10-15 seconds, readings should appear
6. Check backend logs for "Reading accepted" messages
7. Check patient dashboard for updated readings

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MAX30102 not found | Check I2C wiring (SDA=21, SCL=22) |
| WiFi not connecting | Check SSID and password |
| HTTP 401 error | Invalid device token — recreate device in admin panel |
| HTTP 404 error | Wrong SERVER_URL — check IP and port |
| Invalid readings | Keep finger still on sensor for 15+ seconds |
| Readings not in dashboard | Check that device is assigned to patient in doctor panel |

---

## Future Integration Notes

- The backend endpoint `/api/iot/readings` is ready to receive ESP32 data
- Currently uses HTTP REST — MQTT support can be added later (see [backend/README.md](../backend/README.md))
- For production: use HTTPS with proper certificates
- Consider OTA (Over-the-Air) updates for firmware management
- Add deep sleep between readings to conserve battery if using battery power
