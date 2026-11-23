#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// ============================================================
// ESP32 + MAX30102 + Patient Monitoring Configuration
// ============================================================

// Wi-Fi credentials
const char* WIFI_SSID = "Ken Kaneki";
const char* WIFI_PASSWORD = "zoroislost";

// Existing Patient Monitoring backend
const char* SERVER_URL =
    "http://10.176.136.184:5004/api/iot/readings";

// Provisioned device
const char* DEVICE_ID = "DEV_004";

// IMPORTANT:
// Put the RAW device token generated when DEV_004 was created.
// Do NOT use the admin/user JWT here.
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";

// Send readings every 5 seconds
const unsigned long SEND_INTERVAL = 5000;

// ============================================================
// MAX30102
// ============================================================

MAX30105 particleSensor;

uint32_t irBuffer[100];
uint32_t redBuffer[100];

int32_t bufferLength = 100;

int32_t spo2 = 0;
int8_t validSPO2 = 0;

int32_t heartRate = 0;
int8_t validHeartRate = 0;

unsigned long lastSendTime = 0;

// ============================================================
// Wi-Fi
// ============================================================

void printWiFiStatus()
{
  switch (WiFi.status())
  {
    case WL_CONNECTED:
      Serial.println("WiFi connection status: CONNECTED");
      Serial.print("ESP32 IP: ");
      Serial.println(WiFi.localIP());
      break;

    case WL_IDLE_STATUS:
      Serial.println("WiFi connection status: IDLE");
      break;

    case WL_NO_SSID_AVAIL:
      Serial.println("WiFi connection status: SSID not found");
      break;

    case WL_CONNECT_FAILED:
      Serial.println("WiFi connection status: CONNECT_FAILED");
      break;

    case WL_DISCONNECTED:
      Serial.println("WiFi connection status: DISCONNECTED");
      break;

    default:
      Serial.println("WiFi connection status: UNKNOWN");
      break;
  }
}

// ============================================================
// Connect to Wi-Fi
// ============================================================

void connectWiFi()
{
  Serial.println();
  Serial.println("Connecting to WiFi...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;

  while (WiFi.status() != WL_CONNECTED && attempt < 40)
  {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  Serial.println();

  printWiFiStatus();

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi connection failed.");
    Serial.println("Check SSID and password.");
  }
}

// ============================================================
// Read MAX30102 and calculate HR + SpO2
// ============================================================

bool sampleReading()
{
  Serial.println();
  Serial.println("Collecting MAX30102 samples...");

  // Collect 100 samples
  for (int i = 0; i < bufferLength; i++)
  {
    while (particleSensor.available() == false)
    {
      particleSensor.check();
    }

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();

    particleSensor.nextSample();
  }

  // Calculate Heart Rate and SpO2
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    bufferLength,
    redBuffer,
    &spo2,
    &validSPO2,
    &heartRate,
    &validHeartRate
  );

  // Check whether readings are valid
  if (!validHeartRate || !validSPO2)
  {
    Serial.println("Sensor status: INVALID reading.");
    Serial.println("Keeping finger steady and trying again.");

    return false;
  }

  // Check backend-compatible ranges
  if (heartRate < 20 || heartRate > 300)
  {
    Serial.println("Invalid heart rate range.");
    return false;
  }

  if (spo2 < 50 || spo2 > 100)
  {
    Serial.println("Invalid SpO2 range.");
    return false;
  }

  // Valid reading
  Serial.println();
  Serial.println("========== PATIENT READING ==========");

  Serial.print("Heart Rate : ");
  Serial.print(heartRate);
  Serial.println(" BPM");

  Serial.print("SpO2       : ");
  Serial.print(spo2);
  Serial.println(" %");

  Serial.println("=====================================");

  return true;
}

// ============================================================
// Send HR + SpO2 to existing backend
// ============================================================

void sendReadingToBackend(int hr, int sp)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println();
    Serial.println("Backend connection failed.");
    Serial.println("WiFi is disconnected.");

    return;
  }

  Serial.println();
  Serial.println("Sending reading to backend...");

  HTTPClient http;

  // Connect to existing IoT endpoint
  http.begin(SERVER_URL);

  // Headers
  http.addHeader("Content-Type", "application/json");

  // Device authentication
  http.addHeader(
    "Authorization",
    String("Bearer ") + DEVICE_TOKEN
  );

  // Create JSON
  StaticJsonDocument<256> doc;

  doc["deviceId"] = DEVICE_ID;
  doc["heartRate"] = hr;
  doc["spo2"] = sp;

  String payload;

  serializeJson(doc, payload);

  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  Serial.print("Payload: ");
  Serial.println(payload);

  // Send POST request
  int httpCode = http.POST(payload);

  Serial.print("HTTP Response Code: ");
  Serial.println(httpCode);

  // Handle response
  if (httpCode > 0)
  {
    String response = http.getString();

    Serial.println("Server response:");
    Serial.println(response);

    if (httpCode == 200)
    {
      Serial.println("Reading successfully accepted by backend.");
    }
    else if (httpCode == 401)
    {
      Serial.println("Device authentication failed.");
      Serial.println("Check DEVICE_ID and DEVICE_TOKEN.");
    }
    else if (httpCode == 400)
    {
      Serial.println("Backend rejected the reading.");
      Serial.println("Check the JSON payload and sensor values.");
    }
    else
    {
      Serial.println("Backend returned an unexpected status.");
    }
  }
  else
  {
    Serial.println("Backend connection failed.");
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ============================================================
// Setup
// ============================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println(" Remote Patient Monitoring");
  Serial.println(" ESP32 + MAX30102");
  Serial.println("========================================");

  // ----------------------------------------------------------
  // Initialize I2C
  // SDA = GPIO21
  // SCL = GPIO22
  // ----------------------------------------------------------

  Wire.begin(21, 22);

  Serial.println();
  Serial.println("Initializing MAX30102...");

  // ----------------------------------------------------------
  // Initialize MAX30102
  // ----------------------------------------------------------

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST))
  {
    Serial.println("MAX30102 NOT FOUND.");
    Serial.println("Check sensor wiring and power.");

    while (1)
    {
      delay(1000);
    }
  }

  Serial.println("MAX30102 initialized successfully.");

  // ----------------------------------------------------------
  // Configure MAX30102
  // ----------------------------------------------------------

  particleSensor.setup();

  // Red LED for heart-rate detection
  particleSensor.setPulseAmplitudeRed(0x0A);

  // Green LED is not required
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("MAX30102 configuration complete.");

  // ----------------------------------------------------------
  // Connect to Wi-Fi
  // ----------------------------------------------------------

  connectWiFi();

  Serial.println();
  Serial.println("System initialization complete.");
  Serial.println("Place your finger steadily on the MAX30102.");
}

// ============================================================
// Main Loop
// ============================================================

void loop()
{
  // ----------------------------------------------------------
  // Reconnect Wi-Fi if disconnected
  // ----------------------------------------------------------

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println();
    Serial.println("WiFi disconnected.");
    connectWiFi();
  }

  // ----------------------------------------------------------
  // Send reading every 5 seconds
  // ----------------------------------------------------------

  unsigned long now = millis();

  if (now - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = now;

    // Read MAX30102
    if (sampleReading())
    {
      // Send valid HR + SpO2 to backend
      sendReadingToBackend(
        (int)heartRate,
        (int)spo2
      );
    }
  }
}