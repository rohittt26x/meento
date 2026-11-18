import jwt from "jsonwebtoken";
import { UserSession, Role } from "../types";

const JWT_SECRET =
  process.env.JWT_SECRET || "meento-secure-development-jwt-secret-key-32chars";

export function signUserToken(user: UserSession): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyUserToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function parseAuthHeader(authHeader?: string | null): UserSession | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyUserToken(token);
}
