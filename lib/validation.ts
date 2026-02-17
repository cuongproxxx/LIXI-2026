import { z } from "zod";

const amountSchema = z.coerce.number().int().min(1000).max(5_000_000_000);
const quantitySchema = z.coerce.number().int().min(0).max(100_000);

export const deckItemSchema = z
  .object({
    amount: amountSchema,
    quantity: quantitySchema.refine((value) => value > 0, "Quantity phai lon hon 0."),
    remaining: quantitySchema
  })
  .superRefine((value, ctx) => {
    if (value.remaining > value.quantity) {
      ctx.addIssue({
        code: "custom",
        path: ["remaining"],
        message: "Remaining khong duoc lon hon Quantity."
      });
    }
  });

export const deckStateSchema = z
  .object({
    deck: z.array(deckItemSchema).min(1, "Deck can it nhat 1 menh gia.").max(200)
  })
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    value.deck.forEach((item, index) => {
      if (seen.has(item.amount)) {
        ctx.addIssue({
          code: "custom",
          path: ["deck", index, "amount"],
          message: "Menh gia bi trung."
        });
      }
      seen.add(item.amount);
    });
  });

export const depositSchema = z.object({
  amount: amountSchema,
  quantity: quantitySchema.refine((value) => value > 0, "Quantity phai lon hon 0.")
});
