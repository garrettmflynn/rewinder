#include <TMCStepper.h>

// ---------- Pins (adjust if needed)
#define EN_PIN    8
#define DIR_PIN   5
#define STEP_PIN  2

// ---------- UART on Arduino Mega
#define TMC_SERIAL   Serial1
#define TMC_BAUD     115200

// ---------- TMC2209 config
#define R_SENSE         0.11f
#define DRIVER_ADDRESS  0b00

TMC2209Stepper driver(&TMC_SERIAL, R_SENSE, DRIVER_ADDRESS);

// ----- Stepper motion state (non-blocking pulse generator)
volatile bool enabled = true;
volatile bool dirHigh = true;
volatile bool movingContinuous = false;
volatile long stepsRemaining = 0;       // >0 when executing a MOVE
volatile unsigned long halfPeriodUs = 1000; // half period for 50% duty (default 500 Hz)
volatile bool stepLevel = LOW;
unsigned long lastToggleMicros = 0;

String inbuf;

// ----------------- Helpers
void setDirection(bool forward) {
  dirHigh = forward;
  digitalWrite(DIR_PIN, dirHigh ? HIGH : LOW);
}

void setEnabled(bool en) {
  enabled = en;
  digitalWrite(EN_PIN, en ? LOW : HIGH); // active-low enable
}

void setSpeedStepsPerSec(float sps) {
  if (sps < 1) sps = 1;
  // one full period (HIGH+LOW) = 1/sps seconds
  // halfPeriod = (1/sps)/2 seconds -> in microseconds:
  halfPeriodUs = (unsigned long)(500000.0f / sps);
  if (halfPeriodUs < 50) halfPeriodUs = 50; // avoid too-fast toggling
}

void setCurrentmA(uint16_t mA) {
  driver.rms_current(mA);
}

void setMicrosteps(uint16_t m) {
  if (m < 1) m = 1;
  if (m > 256) m = 256;
  driver.microsteps(m);
}

void startMove(long steps) {
  stepsRemaining = steps;
  movingContinuous = false;
}

void startContinuous(float sps) {
  setSpeedStepsPerSec(sps);
  movingContinuous = true;
  stepsRemaining = 0;
}

void stopMotion() {
  movingContinuous = false;
  stepsRemaining = 0;
  stepLevel = LOW;
  digitalWrite(STEP_PIN, LOW);
}

void reportStatus() {
  // Minimal status; extend as needed
  Serial.print(F("{\"status\":\"ok\",\"enabled\":"));
  Serial.print(enabled ? 1 : 0);
  Serial.print(F(",\"dir\":\""));
  Serial.print(dirHigh ? "FWD" : "REV");
  Serial.print(F("\",\"moving\":"));
  Serial.print((movingContinuous || stepsRemaining > 0) ? 1 : 0);
  Serial.print(F(",\"stepsRemaining\":"));
  Serial.print(stepsRemaining);
  Serial.print(F(",\"speed_sps\":"));
  Serial.print(500000.0 / (float)halfPeriodUs); // approx SPS
  Serial.print(F(",\"microsteps\":"));
  Serial.print(driver.microsteps());
  Serial.print(F(",\"current_mA\":"));
  Serial.print(driver.cs2rms(driver.irun())); // approximate report
  Serial.println(F("}"));
}

// ----------------- Command parser (USB Serial)
void handleCommand(String line) {
  line.trim();
  if (line.length() == 0) return;

  // Uppercase for simple parsing
  line.toUpperCase();

  // Commands:
  // ENABLE 1|0
  // DIR FWD|REV
  // SPEED <steps_per_sec>
  // MOVE <steps> [steps_per_sec]
  // CONT <steps_per_sec>
  // STOP
  // CURRENT <mA>
  // MICROSTEPS <n>
  // STATUS

  if (line.startsWith("ENABLE")) {
    int val = line.substring(6).toInt();
    setEnabled(val != 0);
    Serial.println(F("{\"ack\":\"ENABLE\"}"));
  } else if (line.startsWith("DIR")) {
    if (line.indexOf("FWD") > 0) setDirection(true);
    else if (line.indexOf("REV") > 0) setDirection(false);
    Serial.println(F("{\"ack\":\"DIR\"}"));
  } else if (line.startsWith("SPEED")) {
    float sps = line.substring(5).toFloat();
    setSpeedStepsPerSec(sps);
    Serial.println(F("{\"ack\":\"SPEED\"}"));
  } else if (line.startsWith("MOVE")) {
    // MOVE <steps> [sps]
    char buf[64];
    line.toCharArray(buf, sizeof(buf));
    long steps = 0;
    float sps = -1;
    if (sscanf(buf, "MOVE %ld %f", &steps, &sps) >= 1) {
      if (sps > 0) setSpeedStepsPerSec(sps);
      startMove(steps);
      Serial.println(F("{\"ack\":\"MOVE\"}"));
    } else {
      Serial.println(F("{\"err\":\"MOVE parse\"}"));
    }
  } else if (line.startsWith("CONT")) {
    float sps = line.substring(4).toFloat();
    if (sps <= 0) sps = 200; // default
    startContinuous(sps);
    Serial.println(F("{\"ack\":\"CONT\"}"));
  } else if (line.startsWith("STOP")) {
    stopMotion();
    Serial.println(F("{\"ack\":\"STOP\"}"));
  } else if (line.startsWith("CURRENT")) {
    int mA = line.substring(7).toInt();
    if (mA < 100) mA = 100;
    setCurrentmA((uint16_t)mA);
    Serial.println(F("{\"ack\":\"CURRENT\"}"));
  } else if (line.startsWith("MICROSTEPS")) {
    int m = line.substring(10).toInt();
    setMicrosteps((uint16_t)m);
    Serial.println(F("{\"ack\":\"MICROSTEPS\"}"));
  } else if (line.startsWith("STATUS")) {
    reportStatus();
  } else {
    Serial.println(F("{\"err\":\"unknown\"}"));
  }
}

// ----------------- Arduino
void setup() {
  // USB console for Web Serial / logs
  Serial.begin(115200);
  while (!Serial) { /* wait for USB */ }

  // UART to driver
  TMC_SERIAL.begin(TMC_BAUD);

  // I/O
  pinMode(EN_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(STEP_PIN, OUTPUT);
  digitalWrite(STEP_PIN, LOW);
  setDirection(true);
  setEnabled(true);

  // ----- TMC2209 init
  driver.begin();
  driver.pdn_disable(true);
  driver.I_scale_analog(false);
  driver.toff(5);
  driver.blank_time(24);
  setCurrentmA(600);
  setMicrosteps(16);
  driver.en_spreadCycle(false);
  driver.TPWMTHRS(0);

  // Default speed
  setSpeedStepsPerSec(500); // 500 sps

  Serial.println(F("{\"info\":\"TMC2209 ready\"}"));
}

void loop() {
  // ---- Non-blocking pulse generator
  const unsigned long now = micros();

  bool wantMotion = enabled && (movingContinuous || (stepsRemaining > 0));
  if (wantMotion) {
    if (now - lastToggleMicros >= halfPeriodUs) {
      // Toggle STEP pin
      stepLevel = !stepLevel;
      digitalWrite(STEP_PIN, stepLevel ? HIGH : LOW);
      lastToggleMicros = now;

      // Count a step on the falling edge
      if (!stepLevel && stepsRemaining > 0) {
        stepsRemaining--;
      }
    }
  } else {
    // Ensure STEP is low when idle
    if (stepLevel) {
      stepLevel = LOW;
      digitalWrite(STEP_PIN, LOW);
    }
  }

  // ---- Read incoming USB serial lines
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inbuf.length() > 0) {
        handleCommand(inbuf);
        inbuf = "";
      }
    } else if (isPrintable(c)) {
      inbuf += c;
      if (inbuf.length() > 120) inbuf.remove(0, 40); // avoid runaway
    }
  }
}
