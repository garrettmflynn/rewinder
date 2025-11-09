// DIR/STEP self-test with loopback measurement.
// Wiring (temporary):
//   D3 (DIR_OUT)  -> D7 (DIR_IN)  [~1k series optional]
//   D4 (STEP_OUT) -> D2 (STEP_IN) [interrupt-capable pin on Uno/Nano]
//   GND common

#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

// -------- Pins (adjust if needed) --------
const int DIR_OUT  = 3;
const int STEP_OUT = 4;
const int DIR_IN   = 7;
const int STEP_IN  = 2;   // must support interrupts on your board

// -------- Test parameters --------
const unsigned long HIGH_US = 200;   // step high time
const unsigned long LOW_US  = 200;   // step low time  -> ~2.5 kHz
const int PULSES_PER_BURST  = 500;   // number of rising edges we emit per burst

volatile unsigned long isrEdges = 0; // counts both rising+falling edges

void onStepEdge() {
  isrEdges++;
}

void pulseStep(unsigned long highUs, unsigned long lowUs) {
  digitalWrite(STEP_OUT, HIGH);
  delayMicroseconds(highUs);
  digitalWrite(STEP_OUT, LOW);
  delayMicroseconds(lowUs);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);

  // Startup heartbeat flash
  for (int i = 0; i < 6; i++) {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(100);
  }

  pinMode(DIR_OUT,  OUTPUT);
  pinMode(STEP_OUT, OUTPUT);
  pinMode(DIR_IN,   INPUT);        // external wiring provides the level
  pinMode(STEP_IN,  INPUT);

  Serial.begin(115200);
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 3000) { /* wait briefly for native USB */ }

  attachInterrupt(digitalPinToInterrupt(STEP_IN), onStepEdge, CHANGE);

  Serial.println(F("✅ Self-test ready: generating DIR/STEP and measuring via loopback."));
  Serial.println(F("Wiring: D3->D7 (DIR), D4->D2 (STEP). Set Serial Monitor to 115200 baud."));
}

void loop() {
  // Heartbeat LED
  digitalWrite(LED_BUILTIN, HIGH);
  delay(150);
  digitalWrite(LED_BUILTIN, LOW);
  delay(150);

  // --- Toggle DIR and confirm readback ---
  digitalWrite(DIR_OUT, HIGH);
  delay(2);
  int dirHigh = digitalRead(DIR_IN);

  digitalWrite(DIR_OUT, LOW);
  delay(2);
  int dirLow = digitalRead(DIR_IN);

  // --- Generate a burst of steps and measure with interrupt counter ---
  isrEdges = 0;
  unsigned long startUs = micros();
  for (int i = 0; i < PULSES_PER_BURST; i++) {
    pulseStep(HIGH_US, LOW_US);
  }
  unsigned long elapsedUs = micros() - startUs;

  // Each pulse has a rising + falling edge
  const unsigned long expectedEdges = (unsigned long)PULSES_PER_BURST * 2UL;

  // Effective frequency (pulses per second)
  float pulsesPerSec = (PULSES_PER_BURST / (elapsedUs / 1e6f));

  // Report
  Serial.print(F("DIR read high/low: "));
  Serial.print(dirHigh); Serial.print(F("/"));
  Serial.print(dirLow);

  Serial.print(F(" | STEP edges seen: "));
  Serial.print(isrEdges);
  Serial.print(F(" (expected ~"));
  Serial.print(expectedEdges);
  Serial.print(F(")"));

  Serial.print(F(" | Burst freq: "));
  Serial.print(pulsesPerSec, 1);
  Serial.println(F(" Hz"));
}