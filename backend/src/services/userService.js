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
    // `users_email_lower_idx` is UNIQUE where email IS NOT NULL, so writing
    // an address another account already holds is a client error, not a
    // server fault. Re-throw with a code the route turns into 409 — the
    // generic wrap below would have made it a 500.
    if (err?.code === "23505") {
      const e = new Error("That email is already in use");
      e.code = "EMAIL_TAKEN";
      throw e;
    }
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
