
const userRepo = require("../repositories/userRepository");


//create user with username  and password
async function createUser(username, password) {
  try {
    return await userRepo.create({ username, password });
  } catch (err) {
    throw new Error(`userService.createUser failed: ${err.message}`);
  }
}

//get user info with username and password
async function getUserInfo(username, password) {
  try {
    return await userRepo.findByUsernameAndPassword(username, password);
  } catch (err) {
    throw new Error(`userService.getUserInfo failed: ${err.message}`);
  }
}

//update user info with username and password
async function updateUser(username, password, updates) {
  try {
    return await userRepo.updateByUsernameAndPassword(username, password, updates);
  } catch (err) {
    throw new Error(`userService.updateUser failed: ${err.message}`);
  }
}

//get user profile by id (public fields only)
async function getProfile(id) {
  try {
    return await userRepo.findById(id);
  } catch (err) {
    throw new Error(`userService.getProfile failed: ${err.message}`);
  }
}

//delete user with username and password
async function deleteUser(username, password) {
  try {
    return await userRepo.deleteByUsernameAndPassword(username, password);
  } catch (err) {
    throw new Error(`userService.deleteUser failed: ${err.message}`);
  }
}

async function setOnboardingCompleted(userId, completed) {
  try {
    return await userRepo.setOnboardingCompleted(userId, completed);
  } catch (err) {
    throw new Error(`userService.setOnboardingCompleted failed: ${err.message}`);
  }
}

module.exports = { createUser, getUserInfo, getProfile, updateUser, deleteUser, setOnboardingCompleted };

