import { z } from "zod";

const amountSchema = z.coerce.number().int().min(1000).max(5_000_000_000);
const quantitySchema = z.coerce.number().int().min(0).max(100_000);

export const deckItemSchema = z
  .object({
    amount: amountSchema,
    quantity: quantitySchema.refine((value) => value > 0, "Quantity phải lớn hơn 0."),
    remaining: quantitySchema
  })
  .superRefine((value, ctx) => {
    if (value.remaining > value.quantity) {
      ctx.addIssue({
        code: "custom",
        path: ["remaining"],
        message: "Remaining không được lớn hơn Quantity."
      });
    }
  });

export const deckStateSchema = z
  .object({
    deck: z.array(deckItemSchema).min(1, "Deck cần ít nhất 1 mệnh giá.").max(200)
  })
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    value.deck.forEach((item, index) => {
      if (seen.has(item.amount)) {
        ctx.addIssue({
          code: "custom",
          path: ["deck", index, "amount"],
          message: "Mệnh giá bị trùng."
        });
      }
      seen.add(item.amount);
    });
  });

export const adminDeckSchema = z.object({
  deck: z.array(
    z.object({
      amount: amountSchema,
      quantity: quantitySchema.refine((value) => value > 0, "Quantity phải lớn hơn 0."),
      remaining: quantitySchema.optional()
    })
  )
});

export const adminLoginSchema = z.object({
  password: z.string().trim().min(1, "Mật khẩu không được để trống.").max(120)
});
