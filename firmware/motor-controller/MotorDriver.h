#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

#include <Arduino.h>
#include <TMCStepper.h>

class MotorDriver {
public:
  MotorDriver(uint8_t id, HardwareSerial& serial,
              uint8_t enPin, uint8_t dirPin, uint8_t stepPin,
              float rSense = 0.11f, uint8_t driverAddress = 0b00);

  void begin();
  void update();

  // Control
  void setEnabled(bool en);
  void setDirection(bool forward);
  void setSpeedStepsPerSec(float sps);
  void setCurrentmA(uint16_t mA);
  void setMicrosteps(uint16_t m);
  void startMove(long steps);
  void startContinuous(float sps);
  void stopMotion();

  // Accessors
  bool isEnabled() const { return enabled; }
  bool isMoving() const { return movingContinuous || (stepsRemaining > 0); }
  bool getDirection() const { return dirHigh; }
  long getStepsRemaining() const { return stepsRemaining; }
  float getSpeedSPS() const { return 500000.0f / (float)halfPeriodUs; }
  uint16_t getMicrosteps() const;
  uint16_t getCurrentmA() const;
  uint8_t getID() const { return motorID; }

  void printStatus(Stream& out) const;

private:
  uint8_t motorID;
  uint8_t EN_PIN, DIR_PIN, STEP_PIN;

  TMC2209Stepper* driver;

  volatile bool enabled;
  volatile bool dirHigh;
  volatile bool movingContinuous;
  volatile long stepsRemaining;
  volatile unsigned long halfPeriodUs;
  volatile bool stepLevel;
  unsigned long lastToggleMicros;
};

#endif
