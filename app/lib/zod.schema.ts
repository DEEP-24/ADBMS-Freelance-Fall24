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

export const createFileEntrySchema = z.object({
  name: z.string().min(3, "File name must be at least 3 characters long"),
  description: z.string().optional(),
  key: z.string().min(1, "File must be selected"),
  bucket: z.string().min(1, "File must be selected"),
  extension: z.string().min(1, "File must be selected"),
  region: z.string().min(1, "File must be selected"),
  postId: z.string().min(1, "postId is required"),
  type: z.string().optional(),
});

export const paymentSchema = z.object({
  cardHolderName: z.string().min(1, "Card holder name is required"),
  cardNumber: z.string().length(16, "Card number must be 16 digits"),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Invalid expiry date format (MM/YY)"),
  cardCvv: z.string().length(3, "CVV must be 3 digits"),
});
