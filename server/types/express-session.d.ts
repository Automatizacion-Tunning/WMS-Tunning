import "express-session";
import { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    user?: Omit<User, 'password'>;
  }
}