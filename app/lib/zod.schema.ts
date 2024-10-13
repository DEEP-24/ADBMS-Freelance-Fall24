import { z } from "zod";
import { UserRole } from "~/roles";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.enum(["on"]).optional(),
  role: z.nativeEnum(UserRole),
});
