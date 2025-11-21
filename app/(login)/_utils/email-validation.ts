// app/(login)/_utils/email-validation.ts
import { z } from 'zod';

export const PKU_EMAIL_SUFFIX = '@stu.pku.edu.cn';

// 用于验证北京大学邮箱格式的 Zod 字符串
export const pkuEmailSchema = z
    .string()
    .email('无效的邮箱格式')
    .max(50, '邮箱不能超过50个字符')
    .refine((email) => email.endsWith(PKU_EMAIL_SUFFIX), {
        message: `邮箱必须是北京大学校内邮箱（${PKU_EMAIL_SUFFIX}）。`,
    });

export function isValidPkuEmail(email: string): boolean {
    return email.endsWith(PKU_EMAIL_SUFFIX);
}