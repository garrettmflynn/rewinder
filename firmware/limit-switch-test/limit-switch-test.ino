/**
 * Limit Switch Test
 *
 * Simple test to verify limit switch wiring.
 * Wiring:
 *   - Pin 20 (SDA) -> NO terminal
 *   - GND -> C (Common) terminal
 *
 * Open Serial Monitor at 115200 baud.
 * Press the switch and watch for state changes.
 */

#define LIMIT_SWITCH_PIN 20

bool lastState = HIGH;

void setup() {
  Serial.begin(115200);
  while (!Serial) { /* wait */ }

  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);

  Serial.println("=== Limit Switch Test ===");
  Serial.print("Monitoring pin: ");
  Serial.println(LIMIT_SWITCH_PIN);
  Serial.println("Press the switch...");
  Serial.println();

  // Print initial state
  bool state = digitalRead(LIMIT_SWITCH_PIN);
  Serial.print("Initial state: ");
  Serial.println(state == LOW ? "PRESSED" : "OPEN");
}

void loop() {
  bool currentState = digitalRead(LIMIT_SWITCH_PIN);

  if (currentState != lastState) {
    lastState = currentState;

    if (currentState == LOW) {
      Serial.println(">>> SWITCH PRESSED <<<");
    } else {
      Serial.println("    Switch released");
    }
  }

  delay(10);  // Simple debounce
}
