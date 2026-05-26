#include <Arduino.h>
#include "HX711.h"

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ======================================================
// HX711 Objects
// ======================================================

HX711 scale1;
HX711 scale2;
HX711 scale3;
HX711 scale4;

// ======================================================
// Pin Configuration
// ======================================================

#define DT1   16
#define SCK1   4

#define DT2   17
#define SCK2   5

#define DT3   18
#define SCK3   19

#define DT4   21
#define SCK4   22

// ======================================================
// Calibration Values
// ======================================================

// LC1
#define OFFSET1   540522
#define SCALE1    409.080627

// LC2
#define OFFSET2   -32549
#define SCALE2    384.099976

// LC3
#define OFFSET3   -74712
#define SCALE3    371.600220

// LC4
#define OFFSET4   -133023
#define SCALE4    381.858521

// ======================================================
// Filter
// ======================================================

// 0.0 = smooth มาก
// 1.0 = realtime มาก

const float alpha = 0.45;

// ======================================================
// Noise Threshold
// ======================================================

#define NOISE_THRESHOLD 5

// ======================================================
// Variables
// ======================================================

float w1 = 0;
float w2 = 0;
float w3 = 0;
float w4 = 0;

float filteredW1 = 0;
float filteredW2 = 0;
float filteredW3 = 0;
float filteredW4 = 0;

float totalWeight = 0;

// ======================================================
// BLE
// ======================================================

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;

bool deviceConnected = false;

// ======================================================
// UUID
// ======================================================

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ======================================================
// Function Prototype
// ======================================================

void tareAll();

// ======================================================
// BLE Server Callback
// ======================================================

class MyServerCallbacks : public BLEServerCallbacks {

    void onConnect(BLEServer* pServer) {

      deviceConnected = true;

      Serial.println("BLE Connected");
    }

    void onDisconnect(BLEServer* pServer) {

      deviceConnected = false;

      Serial.println("BLE Disconnected");

      BLEDevice::startAdvertising();
    }
};

// ======================================================
// BLE Write Callback
// ======================================================

class MyCallbacks : public BLECharacteristicCallbacks {

    void onWrite(BLECharacteristic *pCharacteristic) {

      String value =
        pCharacteristic->getValue().c_str();

      value.trim();

      Serial.print("BLE CMD: ");
      Serial.println(value);

      // ==========================================
      // TARE ALL
      // ==========================================

      if (value == "tare_all") {

        tareAll();
      }

      // ==========================================
      // TARE LC1
      // ==========================================

      else if (value == "tare1") {

        scale1.set_offset(scale1.read());

        filteredW1 = 0;

        Serial.println("Tare LC1");
      }

      // ==========================================
      // TARE LC2
      // ==========================================

      else if (value == "tare2") {

        scale2.set_offset(scale2.read());

        filteredW2 = 0;

        Serial.println("Tare LC2");
      }

      // ==========================================
      // TARE LC3
      // ==========================================

      else if (value == "tare3") {

        scale3.set_offset(scale3.read());

        filteredW3 = 0;

        Serial.println("Tare LC3");
      }

      // ==========================================
      // TARE LC4
      // ==========================================

      else if (value == "tare4") {

        scale4.set_offset(scale4.read());

        filteredW4 = 0;

        Serial.println("Tare LC4");
      }
    }
};

// ======================================================
// TARE FUNCTION
// ======================================================

void tareAll() {

  Serial.println("\nTaring All Load Cells...");

  scale1.set_offset(scale1.read());
  scale2.set_offset(scale2.read());
  scale3.set_offset(scale3.read());
  scale4.set_offset(scale4.read());

  filteredW1 = 0;
  filteredW2 = 0;
  filteredW3 = 0;
  filteredW4 = 0;

  totalWeight = 0;

  Serial.println("Tare Complete\n");
}

// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(115200);

  Serial.println("\n==============================");
  Serial.println("4 Load Cell BLE System");
  Serial.println("==============================");

  // ======================================================
  // HX711 Begin
  // ======================================================

  scale1.begin(DT1, SCK1);
  scale2.begin(DT2, SCK2);
  scale3.begin(DT3, SCK3);
  scale4.begin(DT4, SCK4);

  // ======================================================
  // Calibration
  // ======================================================

  scale1.set_offset(OFFSET1);
  scale1.set_scale(SCALE1);

  scale2.set_offset(OFFSET2);
  scale2.set_scale(SCALE2);

  scale3.set_offset(OFFSET3);
  scale3.set_scale(SCALE3);

  scale4.set_offset(OFFSET4);
  scale4.set_scale(SCALE4);

  Serial.println("Calibration Loaded");

  // ======================================================
  // Warm Up
  // ======================================================

  Serial.println("Stabilizing HX711...");
  delay(3000);

  // ======================================================
  // Initial Tare
  // ======================================================

  tareAll();

  // ======================================================
  // BLE Setup
  // ======================================================

  BLEDevice::init("LC_SYSTEM");

  pServer = BLEDevice::createServer();

  pServer->setCallbacks(
    new MyServerCallbacks()
  );

  BLEService *pService =
    pServer->createService(
      SERVICE_UUID
    );

  pCharacteristic =
    pService->createCharacteristic(
      CHARACTERISTIC_UUID,

      BLECharacteristic::PROPERTY_NOTIFY |
      BLECharacteristic::PROPERTY_READ   |
      BLECharacteristic::PROPERTY_WRITE
    );

  pCharacteristic->addDescriptor(
    new BLE2902()
  );

  pCharacteristic->setCallbacks(
    new MyCallbacks()
  );

  pService->start();

  BLEAdvertising *pAdvertising =
    BLEDevice::getAdvertising();

  pAdvertising->start();

  Serial.println("BLE Advertising Started");
  Serial.println("Device Name: LC_SYSTEM");
}

// ======================================================
// LOOP
// ======================================================

void loop() {

  // ======================================================
  // SERIAL COMMAND
  // ======================================================

  if (Serial.available()) {

    char cmd = Serial.read();

    if (cmd == 't' || cmd == 'T') {

      tareAll();
    }
  }

  // ======================================================
  // READ LOAD CELLS
  // ======================================================

  w1 = scale1.get_units(1);
  w2 = scale2.get_units(1);
  w3 = scale3.get_units(1);
  w4 = scale4.get_units(1);

  // ======================================================
  // Remove Small Noise
  // ======================================================

  if (abs(w1) < NOISE_THRESHOLD)
    w1 = 0;

  if (abs(w2) < NOISE_THRESHOLD)
    w2 = 0;

  if (abs(w3) < NOISE_THRESHOLD)
    w3 = 0;

  if (abs(w4) < NOISE_THRESHOLD)
    w4 = 0;

  // ======================================================
  // Low Pass Filter
  // ======================================================

  filteredW1 =
    alpha * w1 +
    (1.0 - alpha) * filteredW1;

  filteredW2 =
    alpha * w2 +
    (1.0 - alpha) * filteredW2;

  filteredW3 =
    alpha * w3 +
    (1.0 - alpha) * filteredW3;

  filteredW4 =
    alpha * w4 +
    (1.0 - alpha) * filteredW4;

  // ======================================================
  // Remove Negative Drift
  // ======================================================

  if (filteredW1 < 0)
    filteredW1 = 0;

  if (filteredW2 < 0)
    filteredW2 = 0;

  if (filteredW3 < 0)
    filteredW3 = 0;

  if (filteredW4 < 0)
    filteredW4 = 0;

  // ======================================================
  // Total Weight
  // ======================================================

  totalWeight =
    filteredW1 +
    filteredW2 +
    filteredW3 +
    filteredW4;

  // ======================================================
  // SERIAL MONITOR
  // ======================================================

  Serial.print("LC1: ");
  Serial.print(filteredW1, 1);

  Serial.print(" g | LC2: ");
  Serial.print(filteredW2, 1);

  Serial.print(" g | LC3: ");
  Serial.print(filteredW3, 1);

  Serial.print(" g | LC4: ");
  Serial.print(filteredW4, 1);

  Serial.print(" g | TOTAL: ");
  Serial.print(totalWeight, 1);

  Serial.println(" g");

  // ======================================================
  // JSON
  // ======================================================

  String json = "{";

  json += "\"lc1\":";
  json += String(filteredW1, 1);

  json += ",\"lc2\":";
  json += String(filteredW2, 1);

  json += ",\"lc3\":";
  json += String(filteredW3, 1);

  json += ",\"lc4\":";
  json += String(filteredW4, 1);

  json += ",\"total\":";
  json += String(totalWeight, 1);

  json += "}";

  // ======================================================
  // BLE Notify
  // ======================================================

  if (deviceConnected) {

    pCharacteristic->setValue(
      json.c_str()
    );

    pCharacteristic->notify();
  }

  // ======================================================
  // Fast Loop
  // ======================================================

  delay(5);
}