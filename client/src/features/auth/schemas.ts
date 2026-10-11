import { z } from "zod"

const email = z.email("Enter a valid email address.")

export const signinSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
})

export const signupSchema = z
  .object({
    email,
    password: z.string().min(10, "Use at least 10 characters."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  })

export type SigninValues = z.infer<typeof signinSchema>
export type SignupValues = z.infer<typeof signupSchema>
