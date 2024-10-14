import { z } from "zod";
import { UserRole } from "~/roles";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.enum(["on"]).optional(),
  role: z.nativeEnum(UserRole),
});

export const RegisterSchema = z
  .object({
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    dob: z.string().min(1, "Date of Birth is required"),
    phoneNo: z.string().min(1, "Phone Number is required"),
    address: z.string().min(1, "Address is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    role: z.nativeEnum(UserRole),
    experience: z.string().optional(),
    portfolio: z.string().optional(),
    skills: z.string().optional(),
    awards: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const ServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
});

export const EditorSchema = z.object({
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  dob: z.string().min(1, "Date of Birth is required"),
  phoneNo: z.string().min(1, "Phone Number is required"),
  address: z.string().min(1, "Address is required"),
  skills: z.string().min(1, "Skills are required"),
  experience: z.string().min(1, "Experience is required"),
  portfolio: z.string().min(1, "Portfolio is required"),
  awards: z.string().min(1, "Awards are required"),
});

export const CreatePostSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  budget: z.string().min(1, "Budget must be a positive number"),
  duration: z.string().min(1, "Duration must be a positive number"),
  deadline: z.string(),
});
