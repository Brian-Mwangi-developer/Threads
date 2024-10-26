import * as z from 'zod';

export const ThreadValidation = z.object({
    thread: z.string().nonempty().min(3, {message: "Thread should be at least 3 characters long"}),
    accountId: z.string(),
})

export const CommentValidation = z.object({
    thread: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
  });