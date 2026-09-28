import assert from "node:assert/strict";
import test from "node:test";
import { newWheelGesture, swipeStep, wheelStep } from "../src/lib/carousel-input";

test("wheel advances once per gesture and absorbs inertial tail", () => {
  const gesture = newWheelGesture();
  assert.equal(wheelStep(gesture, 0, 100, 0, 0), 1);
  for (let time = 20; time < 600; time += 20) assert.equal(wheelStep(gesture, 0, 10, 0, time), 0);
  assert.equal(wheelStep(gesture, 0, 80, 0, 800), 1);
});
test("trackpad accumulates small deltas and uses the dominant axis", () => {
  const gesture = newWheelGesture();
  for (let time = 0; time < 60; time += 20) assert.equal(wheelStep(gesture, 12, 2, 0, time), 0);
  assert.equal(wheelStep(gesture, 12, 2, 0, 60), 1);
  assert.equal(wheelStep(gesture, -60, 4, 0, 80), -1);
});
test("line and page wheels normalize; tiny or paused gestures do not misfire", () => {
  assert.equal(wheelStep(newWheelGesture(), 0, 3, 1, 0), 1);
  assert.equal(wheelStep(newWheelGesture(), 0, -1, 2, 0), -1);
  const gesture = newWheelGesture();
  assert.equal(wheelStep(gesture, 0, 20, 0, 0), 0);
  assert.equal(wheelStep(gesture, 0, 30, 0, 250), 0);
  assert.equal(wheelStep(gesture, 0, 0, 0, 260), 0);
});
test("swipe needs horizontal intent and distance; vertical page motion stays free", () => {
  assert.equal(swipeStep(-100, 10), 1);
  assert.equal(swipeStep(100, 10), -1);
  assert.equal(swipeStep(10, 100), 0);
  assert.equal(swipeStep(50, 60), 0);
  assert.equal(swipeStep(47, 0), 0);
});
