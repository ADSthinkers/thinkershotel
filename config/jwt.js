import jwt from "jsonwebtoken";
import 'dotenv/config';

const SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
