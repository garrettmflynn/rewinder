/**
 * motor-controller.ino
 *
 * Dual-motor TMC2209 controller with Web Serial support
 */

#include "MotorDriver.h"

// ==================== CONFIGURATION ====================
#define NUM_MOTORS 2

#define M0_EN_PIN    8
#define M0_DIR_PIN   5
#define M0_STEP_PIN  2
#define M0_SERIAL    Serial1
#define M0_ADDR      0b00

#define M1_EN_PIN    9
#define M1_DIR_PIN   6
#define M1_STEP_PIN  3
#define M1_SERIAL    Serial2
#define M1_ADDR      0b01

#define TMC_BAUD     115200
#define R_SENSE      0.11f

// Limit switch for guide motor (Motor 1) home position
// Pin 22 - general digital I/O (pins 20/21 have I2C pull-downs)
#define LIMIT_SWITCH_PIN  22
#define LIMIT_SWITCH_MOTOR 1

// ==================== GLOBAL STATE ====================
MotorDriver* motors[4] = {nullptr, nullptr, nullptr, nullptr};
String inputBuffer;

// Limit switch state (polling-based)
bool lastLimitSwitchState = HIGH;

// ==== FORWARD DECLARATIONS (needed before loop uses them) ====
void handleCommand(String line);
void executeCommand(MotorDriver* motor, String cmd);
void executeCommandForAll(String cmd);

// ==================== INITIALIZATION ====================
void setup() {
  Serial.begin(115200);
  while (!Serial) { /* wait for USB */ }

  Serial.println(F("{\"info\":\"Motor Controller Starting...\"}"));

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

  // Configure limit switch with internal pull-up
  // Switch connects pin to GND when pressed (active LOW)
  // Using polling (pin 22 doesn't support hardware interrupts)
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);
  Serial.println(F("{\"info\":\"Limit switch configured on pin 22\"}"));

  // Print initial limit switch state for debugging
  bool initialState = digitalRead(LIMIT_SWITCH_PIN);
  Serial.print(F("{\"info\":\"Limit switch initial state: "));
  Serial.print(initialState == LOW ? F("PRESSED") : F("OPEN"));
  Serial.println(F("\"}"));

  Serial.print(F("{\"info\":\"Ready - "));
  Serial.print(NUM_MOTORS);
  Serial.println(F(" motor(s) active\"}"));
}

// ==================== MAIN LOOP ====================
void loop() {
  for (int i = 0; i < NUM_MOTORS; i++) {
    if (motors[i]) motors[i]->update();
  }

  // Check limit switch state (polling-based)
  bool currentLimitState = digitalRead(LIMIT_SWITCH_PIN);
  if (currentLimitState != lastLimitSwitchState) {
    lastLimitSwitchState = currentLimitState;

    // LOW = pressed (active), HIGH = released
    Serial.print(F("{\"limitSwitch\":"));
    Serial.print(currentLimitState == LOW ? F("true") : F("false"));
    Serial.println(F("}"));

    // If switch just pressed and motor is moving, stop it
    if (currentLimitState == LOW) {
      if (motors[LIMIT_SWITCH_MOTOR] && motors[LIMIT_SWITCH_MOTOR]->isMoving()) {
        motors[LIMIT_SWITCH_MOTOR]->stopMotion();

        // Send HOME event to web app
        Serial.print(F("{\"event\":\"HOME\",\"motor\":"));
        Serial.print(LIMIT_SWITCH_MOTOR);
        Serial.println(F("}"));
      }
    }
  }

  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        handleCommand(inputBuffer);
        inputBuffer = "";
      }
    } else if (isPrintable(c)) {
      inputBuffer += c;
      if (inputBuffer.length() > 120) inputBuffer.remove(0, 40);
    }
  }
}
// ==================== COMMAND PARSER ====================

void handleCommand(String line) {
  line.trim();
  if (line.length() == 0) return;

  line.toUpperCase();

  // Copy to C buffer for strtok_r
  char buf[128];
  line.toCharArray(buf, sizeof(buf));

  char* savep = nullptr;
  char* t0 = strtok_r(buf, " \t", &savep);      // first token
  if (!t0) return;

  bool allMotors = false;
  int targetMotor = 0;

  // Determine addressing & command token
  char* cmdTok = nullptr;
  if (t0[0] == 'M' && isdigit((unsigned char)t0[1]) && t0[2] == '\0') {
    // "M0" / "M1" / ...
    targetMotor = atoi(&t0[1]);
    cmdTok = strtok_r(nullptr, " \t", &savep);  // next token is command
  } else if (strcmp(t0, "ALL") == 0) {
    allMotors = true;
    cmdTok = strtok_r(nullptr, " \t", &savep);
  } else {
    // No explicit addressing; default to M0; t0 is the command token
    cmdTok = t0;
  }

  // Bare addressing line (e.g., "M0" with no command) → ignore
  if (!cmdTok) return;

  // Rebuild cmd string: cmdTok + remaining args
  String cmd = cmdTok;
  for (char* tok = strtok_r(nullptr, " \t", &savep); tok; tok = strtok_r(nullptr, " \t", &savep)) {
    cmd += ' ';
    cmd += tok;
  }

  // Validate and execute
  if (!allMotors) {
    if (targetMotor < 0 || targetMotor >= NUM_MOTORS || !motors[targetMotor]) {
      Serial.print(F("{\"err\":\"Invalid motor ID: "));
      Serial.print(targetMotor);
      Serial.println(F("\"}"));
      return;
    }
    executeCommand(motors[targetMotor], cmd);
  } else {
    executeCommandForAll(cmd);
  }
}


void executeCommand(MotorDriver* motor, String cmd) {
  cmd.trim();

  if (cmd.startsWith("ENABLE")) {
    int v = cmd.substring(6).toInt();
    motor->setEnabled(v != 0);
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
    char cbuf[64];
    cmd.toCharArray(cbuf, sizeof(cbuf));
    long steps = 0; float sps = -1;
    if (sscanf(cbuf, "MOVE %ld %f", &steps, &sps) >= 1) {
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
    // Previously this produced the unknown error you saw for bare address lines
    Serial.println(F("{\"err\":\"unknown command\"}"));
  }
}

void executeCommandForAll(String cmd) {
  if (cmd.startsWith("STATUS")) {
    Serial.print(F("{\"motors\":["));
    bool first = true;
    for (int i = 0; i < NUM_MOTORS; i++) {
      if (!motors[i]) continue;
      if (!first) Serial.print(F(","));
      motors[i]->printStatus(Serial);
      first = false;
    }
    Serial.println(F("]}"));
    return;
  }

  for (int i = 0; i < NUM_MOTORS; i++) {
    if (motors[i]) executeCommand(motors[i], cmd);
  }
}
