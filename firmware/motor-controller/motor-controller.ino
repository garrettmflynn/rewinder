/**
 * motor-controller.ino
 *
 * Multi-motor TMC2209 controller with Web Serial support
 * Supports 1-3 motors with scalable architecture (Arduino Mega has Serial1-3)
 *
 * WIRING: See docs/WIRING.md for complete hardware setup instructions
 *
 * Commands support motor addressing:
 *   M0 ENABLE 1       - Address motor 0
 *   ENABLE 1          - Defaults to motor 0 (backward compatible)
 *   M1 SPEED 500      - Address motor 1
 *   ALL STATUS        - Query all motors
 */

#include "MotorDriver.h"

// ==================== CONFIGURATION ====================

// Number of motors to initialize (1-3)
// Arduino Mega has Serial1, Serial2, Serial3 (max 3 motors)
#define NUM_MOTORS 1

// Motor 0 pins (required)
#define M0_EN_PIN    8
#define M0_DIR_PIN   5
#define M0_STEP_PIN  2
#define M0_SERIAL    Serial1
#define M0_ADDR      0b00

// Motor 1 pins (optional - uncomment when adding second motor)
// #define M1_EN_PIN    9
// #define M1_DIR_PIN   6
// #define M1_STEP_PIN  3
// #define M1_SERIAL    Serial2
// #define M1_ADDR      0b01

// Motor 2 pins (optional)
// #define M2_EN_PIN    10
// #define M2_DIR_PIN   7
// #define M2_STEP_PIN  4
// #define M2_SERIAL    Serial3
// #define M2_ADDR      0b10

// Motor 3 pins (optional)
// #define M3_EN_PIN    11
// #define M3_DIR_PIN   12
// #define M3_STEP_PIN  13
// #define M3_SERIAL    Serial4
// #define M3_ADDR      0b11

// TMC2209 UART config
#define TMC_BAUD     115200
#define R_SENSE      0.11f

// ==================== GLOBAL STATE ====================

MotorDriver* motors[4] = {nullptr, nullptr, nullptr, nullptr};
String inputBuffer;

// ==================== INITIALIZATION ====================

void setup() {
  // USB console for Web Serial
  Serial.begin(115200);
  while (!Serial) { /* wait for USB */ }

  Serial.println(F("{\"info\":\"Motor Controller Starting...\"}"));

  // Initialize motors based on NUM_MOTORS
  #if NUM_MOTORS >= 1
    M0_SERIAL.begin(TMC_BAUD);
    motors[0] = new MotorDriver(0, M0_SERIAL, M0_EN_PIN, M0_DIR_PIN, M0_STEP_PIN, R_SENSE, M0_ADDR);
    motors[0]->begin();
    Serial.println(F("{\"info\":\"Motor 0 initialized\"}"));
  #endif

  #if NUM_MOTORS >= 2
    M1_SERIAL.begin(TMC_BAUD);
    motors[1] = new MotorDriver(1, M1_SERIAL, M1_EN_PIN, M1_DIR_PIN, M1_STEP_PIN, R_SENSE, M1_ADDR);
    motors[1]->begin();
    Serial.println(F("{\"info\":\"Motor 1 initialized\"}"));
  #endif

  #if NUM_MOTORS >= 3
    M2_SERIAL.begin(TMC_BAUD);
    motors[2] = new MotorDriver(2, M2_SERIAL, M2_EN_PIN, M2_DIR_PIN, M2_STEP_PIN, R_SENSE, M2_ADDR);
    motors[2]->begin();
    Serial.println(F("{\"info\":\"Motor 2 initialized\"}"));
  #endif

  #if NUM_MOTORS >= 4
    M3_SERIAL.begin(TMC_BAUD);
    motors[3] = new MotorDriver(3, M3_SERIAL, M3_EN_PIN, M3_DIR_PIN, M3_STEP_PIN, R_SENSE, M3_ADDR);
    motors[3]->begin();
    Serial.println(F("{\"info\":\"Motor 3 initialized\"}"));
  #endif

  Serial.print(F("{\"info\":\"Ready - "));
  Serial.print(NUM_MOTORS);
  Serial.println(F(" motor(s) active\"}"));
}

// ==================== MAIN LOOP ====================

void loop() {
  // Update all active motors (non-blocking step generation)
  for (int i = 0; i < NUM_MOTORS; i++) {
    if (motors[i] != nullptr) {
      motors[i]->update();
    }
  }

  // Process incoming commands
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        handleCommand(inputBuffer);
        inputBuffer = "";
      }
    } else if (isPrintable(c)) {
      inputBuffer += c;
      if (inputBuffer.length() > 120) {
        inputBuffer.remove(0, 40);  // Prevent buffer overflow
      }
    }
  }
}

// ==================== COMMAND PARSER ====================

void handleCommand(String line) {
  line.trim();
  if (line.length() == 0) return;

  // Parse motor ID (M0, M1, M2, M3, or ALL)
  // If no motor ID specified, default to motor 0 (backward compatible)
  int targetMotor = 0;
  bool allMotors = false;

  line.toUpperCase();

  // Check for motor addressing prefix
  if (line.startsWith("M")) {
    int spaceIdx = line.indexOf(' ');
    if (spaceIdx > 1) {
      String motorID = line.substring(1, spaceIdx);
      targetMotor = motorID.toInt();
      line = line.substring(spaceIdx + 1);
      line.trim();
    }
  } else if (line.startsWith("ALL ")) {
    allMotors = true;
    line = line.substring(4);
    line.trim();
  }

  // Validate motor index
  if (!allMotors && (targetMotor < 0 || targetMotor >= NUM_MOTORS || motors[targetMotor] == nullptr)) {
    Serial.print(F("{\"err\":\"Invalid motor ID: "));
    Serial.print(targetMotor);
    Serial.println(F("\"}"));
    return;
  }

  // Execute command
  if (allMotors) {
    executeCommandForAll(line);
  } else {
    executeCommand(motors[targetMotor], line);
  }
}

void executeCommand(MotorDriver* motor, String cmd) {
  if (cmd.startsWith("ENABLE")) {
    int val = cmd.substring(6).toInt();
    motor->setEnabled(val != 0);
    Serial.print(F("{\"ack\":\"ENABLE\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("DIR")) {
    if (cmd.indexOf("FWD") > 0) motor->setDirection(true);
    else if (cmd.indexOf("REV") > 0) motor->setDirection(false);
    Serial.print(F("{\"ack\":\"DIR\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("SPEED")) {
    float sps = cmd.substring(5).toFloat();
    motor->setSpeedStepsPerSec(sps);
    Serial.print(F("{\"ack\":\"SPEED\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("MOVE")) {
    char buf[64];
    cmd.toCharArray(buf, sizeof(buf));
    long steps = 0;
    float sps = -1;
    if (sscanf(buf, "MOVE %ld %f", &steps, &sps) >= 1) {
      if (sps > 0) motor->setSpeedStepsPerSec(sps);
      motor->startMove(steps);
      Serial.print(F("{\"ack\":\"MOVE\",\"motor\":"));
      Serial.print(motor->getID());
      Serial.println(F("}"));
    } else {
      Serial.println(F("{\"err\":\"MOVE parse\"}"));
    }

  } else if (cmd.startsWith("CONT")) {
    float sps = cmd.substring(4).toFloat();
    if (sps <= 0) sps = 200;
    motor->startContinuous(sps);
    Serial.print(F("{\"ack\":\"CONT\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("STOP")) {
    motor->stopMotion();
    Serial.print(F("{\"ack\":\"STOP\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("CURRENT")) {
    int mA = cmd.substring(7).toInt();
    motor->setCurrentmA((uint16_t)mA);
    Serial.print(F("{\"ack\":\"CURRENT\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("MICROSTEPS")) {
    int m = cmd.substring(10).toInt();
    motor->setMicrosteps((uint16_t)m);
    Serial.print(F("{\"ack\":\"MICROSTEPS\",\"motor\":"));
    Serial.print(motor->getID());
    Serial.println(F("}"));

  } else if (cmd.startsWith("STATUS")) {
    motor->printStatus(Serial);

  } else {
    Serial.println(F("{\"err\":\"unknown command\"}"));
  }
}

void executeCommandForAll(String cmd) {
  if (cmd.startsWith("STATUS")) {
    Serial.println(F("{\"motors\":["));
    for (int i = 0; i < NUM_MOTORS; i++) {
      if (motors[i] != nullptr) {
        motors[i]->printStatus(Serial);
        if (i < NUM_MOTORS - 1) Serial.println(F(","));
      }
    }
    Serial.println(F("]}"));
  } else {
    // Apply command to all motors
    for (int i = 0; i < NUM_MOTORS; i++) {
      if (motors[i] != nullptr) {
        executeCommand(motors[i], cmd);
      }
    }
  }
}
