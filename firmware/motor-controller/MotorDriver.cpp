/**
 * MotorDriver.cpp
 *
 * Implementation of MotorDriver class
 */

#include "MotorDriver.h"

MotorDriver::MotorDriver(uint8_t id,
                         HardwareSerial& serial,
                         uint8_t enPin,
                         uint8_t dirPin,
                         uint8_t stepPin,
                         float rSense,
                         uint8_t driverAddress)
  : motorID(id),
    EN_PIN(enPin),
    DIR_PIN(dirPin),
    STEP_PIN(stepPin),
    enabled(false),
    dirHigh(true),
    movingContinuous(false),
    stepsRemaining(0),
    halfPeriodUs(1000),
    stepLevel(LOW),
    lastToggleMicros(0)
{
  driver = new TMC2209Stepper(&serial, rSense, driverAddress);
}

void MotorDriver::begin() {
  // Configure pins
  pinMode(EN_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(STEP_PIN, OUTPUT);
  digitalWrite(STEP_PIN, LOW);
  setDirection(true);
  setEnabled(false);  // Start disabled for safety

  // Initialize TMC2209
  driver->begin();
  driver->pdn_disable(true);
  driver->I_scale_analog(false);
  driver->toff(5);
  driver->blank_time(24);
  setCurrentmA(600);        // Default current
  setMicrosteps(16);        // Default microsteps
  driver->en_spreadCycle(false);
  driver->TPWMTHRS(0);

  // Default speed
  setSpeedStepsPerSec(500);
}

void MotorDriver::setEnabled(bool en) {
  enabled = en;
  digitalWrite(EN_PIN, en ? LOW : HIGH);  // Active-low enable
}

void MotorDriver::setDirection(bool forward) {
  dirHigh = forward;
  digitalWrite(DIR_PIN, dirHigh ? HIGH : LOW);
}

void MotorDriver::setSpeedStepsPerSec(float sps) {
  if (sps < 1) sps = 1;
  // Calculate half period in microseconds
  // Full period = 1/sps seconds, half period = (1/sps)/2 = 1/(2*sps)
  halfPeriodUs = (unsigned long)(500000.0f / sps);
  if (halfPeriodUs < 50) halfPeriodUs = 50;  // Limit maximum speed
}

void MotorDriver::setCurrentmA(uint16_t mA) {
  if (mA < 100) mA = 100;
  if (mA > 2000) mA = 2000;
  driver->rms_current(mA);
}

void MotorDriver::setMicrosteps(uint16_t m) {
  if (m < 1) m = 1;
  if (m > 256) m = 256;
  driver->microsteps(m);
}

void MotorDriver::startMove(long steps) {
  stepsRemaining = abs(steps);
  movingContinuous = false;
}

void MotorDriver::startContinuous(float sps) {
  setSpeedStepsPerSec(sps);
  movingContinuous = true;
  stepsRemaining = 0;
}

void MotorDriver::stopMotion() {
  movingContinuous = false;
  stepsRemaining = 0;
  stepLevel = LOW;
  digitalWrite(STEP_PIN, LOW);
}

uint16_t MotorDriver::getMicrosteps() const {
  return driver->microsteps();
}

uint16_t MotorDriver::getCurrentmA() const {
  return driver->cs2rms(driver->irun());
}

void MotorDriver::update() {
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
}

void MotorDriver::printStatus(Stream& out) const {
  out.print(F("{\"motor\":"));
  out.print(motorID);
  out.print(F(",\"enabled\":"));
  out.print(enabled ? 1 : 0);
  out.print(F(",\"dir\":\""));
  out.print(dirHigh ? "FWD" : "REV");
  out.print(F("\",\"moving\":"));
  out.print(isMoving() ? 1 : 0);
  out.print(F(",\"stepsRemaining\":"));
  out.print(stepsRemaining);
  out.print(F(",\"speed_sps\":"));
  out.print(getSpeedSPS());
  out.print(F(",\"microsteps\":"));
  out.print(getMicrosteps());
  out.print(F(",\"current_mA\":"));
  out.print(getCurrentmA());
  out.println(F("}"));
}
