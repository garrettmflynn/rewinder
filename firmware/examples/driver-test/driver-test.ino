#include <TMCStepper.h>
#define EN_PIN 8
#define DIR_PIN 5
#define STEP_PIN 2

#define R_SENSE 0.11f
#define DRIVER_ADDRESS 0b00

TMC2209Stepper driver(&Serial1, R_SENSE, DRIVER_ADDRESS);

void setup() {
  Serial.begin(115200); while(!Serial){}
  Serial1.begin(115200);

  pinMode(EN_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(STEP_PIN, OUTPUT);
  digitalWrite(EN_PIN, LOW);   // enable driver (active LOW)

  driver.begin();
  driver.pdn_disable(true);
  driver.I_scale_analog(false);
  driver.toff(5);
  driver.rms_current(600);
  driver.microsteps(16);

  Serial.print("Connection test: ");
  Serial.println(driver.test_connection() ? "OK" : "FAILED");
}

void loop() {
  digitalWrite(DIR_PIN, HIGH);
  for (int i=0; i<200; i++) { digitalWrite(STEP_PIN, HIGH); delayMicroseconds(1000); digitalWrite(STEP_PIN, LOW); delayMicroseconds(1000); }
  delay(300);
  digitalWrite(DIR_PIN, LOW);
  for (int i=0; i<200; i++) { digitalWrite(STEP_PIN, HIGH); delayMicroseconds(1000); digitalWrite(STEP_PIN, LOW); delayMicroseconds(1000); }
  delay(600);
}
