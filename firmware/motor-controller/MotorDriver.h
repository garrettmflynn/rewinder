/**
 * MotorDriver.h
 *
 * Encapsulates a single TMC2209 stepper motor driver
 * Supports non-blocking motion control
 */

#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

#include <Arduino.h>
#include <TMCStepper.h>

class MotorDriver {
public:
  // Constructor
  MotorDriver(uint8_t id,
              HardwareSerial& serial,
              uint8_t enPin,
              uint8_t dirPin,
              uint8_t stepPin,
              float rSense = 0.11f,
              uint8_t driverAddress = 0b00);

  // Initialization
  void begin();

  // Configuration
  void setEnabled(bool en);
  void setDirection(bool forward);
  void setSpeedStepsPerSec(float sps);
  void setCurrentmA(uint16_t mA);
  void setMicrosteps(uint16_t m);

  // Motion commands
  void startMove(long steps);
  void startContinuous(float sps);
  void stopMotion();

  // Status
  bool isEnabled() const { return enabled; }
  bool isMoving() const { return movingContinuous || (stepsRemaining > 0); }
  bool getDirection() const { return dirHigh; }
  long getStepsRemaining() const { return stepsRemaining; }
  float getSpeedSPS() const { return 500000.0f / (float)halfPeriodUs; }
  uint16_t getMicrosteps() const;
  uint16_t getCurrentmA() const;
  uint8_t getID() const { return motorID; }

  // Must be called in loop() for non-blocking step generation
  void update();

  // Status reporting
  void printStatus(Stream& out) const;

private:
  // Motor ID
  uint8_t motorID;

  // Pin assignments
  uint8_t EN_PIN;
  uint8_t DIR_PIN;
  uint8_t STEP_PIN;

  // TMC2209 driver
  TMC2209Stepper* driver;

  // Motion state (non-blocking pulse generator)
  volatile bool enabled;
  volatile bool dirHigh;
  volatile bool movingContinuous;
  volatile long stepsRemaining;
  volatile unsigned long halfPeriodUs;  // half period for 50% duty cycle
  volatile bool stepLevel;
  unsigned long lastToggleMicros;
};

#endif // MOTOR_DRIVER_H
