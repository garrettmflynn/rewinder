// Motor 1 pins
const int motor1Step = 3;
const int motor1Dir = 2;
const int motor1Enable = 6;

// Motor 2 pins
const int motor2Step = 5;
const int motor2Dir = 4;
const int motor2Enable = 7;

void setup() {
  pinMode(motor1Step, OUTPUT);
  pinMode(motor1Dir, OUTPUT);
  pinMode(motor1Enable, OUTPUT);
  
  pinMode(motor2Step, OUTPUT);
  pinMode(motor2Dir, OUTPUT);
  pinMode(motor2Enable, OUTPUT);
  
  // Enable motors (LOW = enabled on most drivers)
  digitalWrite(motor1Enable, LOW);
  digitalWrite(motor2Enable, LOW);
}

void loop() {
  // Clockwise rotation
  digitalWrite(motor1Dir, HIGH);
  digitalWrite(motor2Dir, HIGH);
  
  for(int i = 0; i < 200; i++) {
    digitalWrite(motor1Step, HIGH);
    digitalWrite(motor2Step, HIGH);
    delayMicroseconds(800);  // Adjusted for smooth operation
    digitalWrite(motor1Step, LOW);
    digitalWrite(motor2Step, LOW);
    delayMicroseconds(800);
  }
  
  delay(1000);
  
  // Counterclockwise rotation
  digitalWrite(motor1Dir, LOW);
  digitalWrite(motor2Dir, LOW);
  
  for(int i = 0; i < 200; i++) {
    digitalWrite(motor1Step, HIGH);
    digitalWrite(motor2Step, HIGH);
    delayMicroseconds(800);
    digitalWrite(motor1Step, LOW);
    digitalWrite(motor2Step, LOW);
    delayMicroseconds(800);
  }
  
  delay(1000);
}