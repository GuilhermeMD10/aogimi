const userRepo = require("../repositories/userRepository");

// Whitelist of mutable profile fields. Anything else in the `updates`
// payload is silently dropped before hitting the DB — keeps clients
// from accidentally (or deliberately) writing to `id`, `password_hash`,
// `username`, etc. by stuffing the field into the patch.
const ALLOWED_UPDATES = new Set([
  "display_name",
  "email",
  "language",
  "avatar_index",
  "onboarding_completed",
]);

async function getProfile(id) {
  try {
    return await userRepo.findById(id);
  } catch (err) {
    throw new Error(`userService.getProfile failed: ${err.message}`);
  }
}

async function updateProfile(id, updates) {
  const filtered = {};
  for (const [k, v] of Object.entries(updates)) {
    if (ALLOWED_UPDATES.has(k)) filtered[k] = v;
  }
  if (Object.keys(filtered).length === 0) {
    return await userRepo.findById(id);
  }
  try {
    return await userRepo.updateById(id, filtered);
  } catch (err) {
    throw new Error(`userService.updateProfile failed: ${err.message}`);
  }
}

async function deleteUser(id) {
  try {
    return await userRepo.deleteById(id);
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

module.exports = { getProfile, updateProfile, deleteUser, setOnboardingCompleted };
