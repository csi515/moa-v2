import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("유효한 이메일 형식을 입력해주세요.")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(["active", "paused", "inactive"]),
  memo: z.string().optional().nullable(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
