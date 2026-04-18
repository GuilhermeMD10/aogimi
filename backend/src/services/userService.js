
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

//delete user with username and password
async function deleteUser(username, password) {
  try {
    return await userRepo.deleteByUsernameAndPassword(username, password);
  } catch (err) {
    throw new Error(`userService.deleteUser failed: ${err.message}`);
  }
}

module.exports = { createUser, getUserInfo, updateUser, deleteUser };

