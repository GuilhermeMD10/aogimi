// Zod schemas for /api/devices/*.
//
// `deviceId` is client-generated and becomes half of the `devices` compound
// primary key, so it's the one field here that's worth constraining in shape
// as well as length: it ends up in URLs (`/api/devices/:deviceId/books/...`)
// and in the `book_availability` FK. Restricting it to a URL-safe charset
// means a device id can never need escaping anywhere downstream.

const { z } = require("zod");
const { TEXT } = require("../config/limits");
const { optionalText } = require("./_helpers");

const registerDeviceSchema = z.object({
  deviceId: z
    .string({ error: "deviceId is required" })
    .trim()
    .min(1, "deviceId must not be empty")
    .max(TEXT.DEVICE_ID, `deviceId must be at most ${TEXT.DEVICE_ID} characters`)
    .regex(
      /^[A-Za-z0-9_.:-]+$/,
      "deviceId may contain letters, numbers, '_', '.', ':', '-'",
    ),
  name: optionalText("Device name", TEXT.DEVICE_NAME),
});

const renameDeviceSchema = z.object({
  name: z
    .string({ error: "name is required" })
    .trim()
    .min(1, "name must not be empty")
    .max(TEXT.DEVICE_NAME, `name must be at most ${TEXT.DEVICE_NAME} characters`),
});

module.exports = { registerDeviceSchema, renameDeviceSchema };
