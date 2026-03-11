import type Stripe from 'stripe';
import crypto from 'crypto';

/**
 * Create a mock Stripe webhook event
 */
export function createMockStripeEvent(
  type: string,
  data: any,
  overrides: Partial<Stripe.Event> = {}
): Stripe.Event {
  return {
    id: `evt_${crypto.randomBytes(12).toString('hex')}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type,
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    ...overrides,
  } as Stripe.Event;
}

/**
 * Create a mock Stripe Checkout Session
 */
export function createMockCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: `cs_test_${crypto.randomBytes(12).toString('hex')}`,
    object: 'checkout.session',
    after_expiration: null,
    allow_promotion_codes: null,
    amount_subtotal: 10000,
    amount_total: 10000,
    automatic_tax: { enabled: false, status: null },
    billing_address_collection: null,
    cancel_url: 'https://example.com/cancel',
    client_reference_id: null,
    client_secret: null,
    consent: null,
    consent_collection: null,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    currency_conversion: null,
    custom_fields: [],
    custom_text: {
      after_submit: null,
      shipping_address: null,
      submit: null,
      terms_of_service_acceptance: null,
    },
    customer: null,
    customer_creation: null,
    customer_details: null,
    customer_email: null,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    invoice: null,
    invoice_creation: null,
    livemode: false,
    locale: null,
    metadata: {
      type: 'quest_funding',
      questId: 'test-quest-id',
    },
    mode: 'payment',
    payment_intent: `pi_${crypto.randomBytes(12).toString('hex')}`,
    payment_link: null,
    payment_method_collection: null,
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ['card'],
    payment_status: 'paid',
    phone_number_collection: { enabled: false },
    recovered_from: null,
    redirect_on_completion: null,
    return_url: null,
    setup_intent: null,
    shipping_address_collection: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    status: 'complete',
    submit_type: null,
    subscription: null,
    success_url: 'https://example.com/success',
    total_details: {
      amount_discount: 0,
      amount_shipping: 0,
      amount_tax: 0,
    },
    ui_mode: 'hosted',
    url: null,
    ...overrides,
  } as Stripe.Checkout.Session;
}

/**
 * Create a mock Stripe Charge for refund testing
 */
export function createMockCharge(
  overrides: Partial<Stripe.Charge> = {}
): Stripe.Charge {
  return {
    id: `ch_${crypto.randomBytes(12).toString('hex')}`,
    object: 'charge',
    amount: 10000,
    amount_captured: 10000,
    amount_refunded: 0,
    application: null,
    application_fee: null,
    application_fee_amount: null,
    balance_transaction: `txn_${crypto.randomBytes(8).toString('hex')}`,
    billing_details: {
      address: null,
      email: null,
      name: null,
      phone: null,
    },
    calculated_statement_descriptor: null,
    captured: true,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    customer: null,
    description: null,
    destination: null,
    dispute: null,
    disputed: false,
    failure_balance_transaction: null,
    failure_code: null,
    failure_message: null,
    fraud_details: {},
    invoice: null,
    livemode: false,
    metadata: {},
    on_behalf_of: null,
    order: null,
    outcome: null,
    paid: true,
    payment_intent: null,
    payment_method: `pm_${crypto.randomBytes(12).toString('hex')}`,
    payment_method_details: null,
    radar_options: null,
    receipt_email: null,
    receipt_number: null,
    receipt_url: null,
    refunded: false,
    refunds: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/charges/ch_xxx/refunds',
    },
    review: null,
    shipping: null,
    source: null,
    source_transfer: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: 'succeeded',
    transfer_data: null,
    transfer_group: null,
    ...overrides,
  } as Stripe.Charge;
}

/**
 * Create a mock Stripe Account for account.updated webhook
 */
export function createMockAccount(
  overrides: Partial<Stripe.Account> = {}
): Stripe.Account {
  return {
    id: `acct_${crypto.randomBytes(10).toString('hex')}`,
    object: 'account',
    business_profile: null,
    business_type: null,
    capabilities: {
      card_payments: 'active',
      transfers: 'active',
    },
    charges_enabled: true,
    country: 'US',
    created: Math.floor(Date.now() / 1000),
    default_currency: 'usd',
    details_submitted: true,
    email: 'test@example.com',
    external_accounts: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/accounts/acct_xxx/external_accounts',
    },
    metadata: {},
    payouts_enabled: true,
    requirements: null,
    settings: null,
    tos_acceptance: null,
    type: 'express',
    ...overrides,
  } as Stripe.Account;
}

/**
 * Generate a mock Stripe webhook signature
 */
export function generateStripeSignature(
  payload: string,
  secret: string = 'whsec_test_secret'
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}
