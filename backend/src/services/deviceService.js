const deviceRepo = require("../repositories/deviceRepository");

async function registerDevice(userId, deviceId, name) {
  return await deviceRepo.upsert({ deviceId, userId, name });
}

async function getUserDevices(userId) {
  return await deviceRepo.findByUser(userId);
}

async function renameDevice(deviceId, userId, name) {
  const device = await deviceRepo.rename(deviceId, userId, name);
  if (!device) throw new Error("Device not found");
  return device;
}

async function removeDevice(deviceId, userId) {
  const success = await deviceRepo.remove(deviceId, userId);
  if (!success) throw new Error("Device not found");
  return true;
}

async function markBookAvailable(userId, deviceId, bookId) {
  return await deviceRepo.markBookAvailable(userId, deviceId, bookId);
}

async function removeBookAvailability(userId, deviceId, bookId) {
  return await deviceRepo.removeBookAvailability(userId, deviceId, bookId);
}

async function getDeviceBooks(userId, deviceId) {
  return await deviceRepo.getDeviceBooks(userId, deviceId);
}

module.exports = {
  registerDevice,
  getUserDevices,
  renameDevice,
  removeDevice,
  markBookAvailable,
  removeBookAvailability,
  getDeviceBooks,
};
