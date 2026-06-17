import { z } from 'zod';
import { NextResponse } from 'next/server';

export const LineItemSchema = z.object({
  description: z.string(),
  qty: z.number().positive(),
  unit_price: z.number().min(0),
});

export type LineItem = z.infer<typeof LineItemSchema>;

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
