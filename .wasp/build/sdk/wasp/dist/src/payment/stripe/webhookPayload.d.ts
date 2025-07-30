import * as z from 'zod';
import { Stripe } from 'stripe';
export declare function parseWebhookPayload(rawStripeEvent: Stripe.Event): Promise<{
    eventName: "checkout.session.completed";
    data: {
        id: string;
        customer: string;
    };
} | {
    eventName: "invoice.paid";
    data: {
        customer: string;
        period_start: number;
    };
} | {
    eventName: "payment_intent.succeeded";
    data: {
        customer: string;
        created: number;
        metadata: {
            priceId?: string | undefined;
        };
        invoice?: unknown;
    };
} | {
    eventName: "customer.subscription.updated";
    data: {
        status: string;
        cancel_at_period_end: boolean;
        customer: string;
        items: {
            data: {
                price: {
                    id: string;
                };
            }[];
        };
    };
} | {
    eventName: "customer.subscription.deleted";
    data: {
        customer: string;
    };
}>;
/**
 * This is a subtype of
 * @type import('stripe').Stripe.Checkout.Session
 */
declare const sessionCompletedDataSchema: z.ZodObject<{
    id: z.ZodString;
    customer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    customer: string;
}, {
    id: string;
    customer: string;
}>;
/**
 * This is a subtype of
 * @type import('stripe').Stripe.Invoice
 */
declare const invoicePaidDataSchema: z.ZodObject<{
    customer: z.ZodString;
    period_start: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    customer: string;
    period_start: number;
}, {
    customer: string;
    period_start: number;
}>;
/**
 * This is a subtype of
 * @type import('stripe').Stripe.PaymentIntent
 */
declare const paymentIntentSucceededDataSchema: z.ZodObject<{
    invoice: z.ZodOptional<z.ZodUnknown>;
    created: z.ZodNumber;
    metadata: z.ZodObject<{
        priceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        priceId?: string | undefined;
    }, {
        priceId?: string | undefined;
    }>;
    customer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    customer: string;
    created: number;
    metadata: {
        priceId?: string | undefined;
    };
    invoice?: unknown;
}, {
    customer: string;
    created: number;
    metadata: {
        priceId?: string | undefined;
    };
    invoice?: unknown;
}>;
/**
 * This is a subtype of
 * @type import('stripe').Stripe.Subscription
 */
declare const subscriptionUpdatedDataSchema: z.ZodObject<{
    customer: z.ZodString;
    status: z.ZodString;
    cancel_at_period_end: z.ZodBoolean;
    items: z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            price: z.ZodObject<{
                id: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            price: {
                id: string;
            };
        }, {
            price: {
                id: string;
            };
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        data: {
            price: {
                id: string;
            };
        }[];
    }, {
        data: {
            price: {
                id: string;
            };
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    status: string;
    cancel_at_period_end: boolean;
    customer: string;
    items: {
        data: {
            price: {
                id: string;
            };
        }[];
    };
}, {
    status: string;
    cancel_at_period_end: boolean;
    customer: string;
    items: {
        data: {
            price: {
                id: string;
            };
        }[];
    };
}>;
/**
 * This is a subtype of
 * @type import('stripe').Stripe.Subscription
 */
declare const subscriptionDeletedDataSchema: z.ZodObject<{
    customer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    customer: string;
}, {
    customer: string;
}>;
export type SessionCompletedData = z.infer<typeof sessionCompletedDataSchema>;
export type InvoicePaidData = z.infer<typeof invoicePaidDataSchema>;
export type PaymentIntentSucceededData = z.infer<typeof paymentIntentSucceededDataSchema>;
export type SubscriptionUpdatedData = z.infer<typeof subscriptionUpdatedDataSchema>;
export type SubscriptionDeletedData = z.infer<typeof subscriptionDeletedDataSchema>;
export {};
//# sourceMappingURL=webhookPayload.d.ts.map