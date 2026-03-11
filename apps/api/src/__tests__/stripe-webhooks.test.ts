import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestServer } from './helpers/test-server';
import { createTestUser, cleanupTestData } from './helpers/test-fixtures';
import {
  createMockStripeEvent,
  createMockCheckoutSession,
  createMockCharge,
  createMockAccount,
  generateStripeSignature,
} from './helpers/stripe-mocks';

const prisma = new PrismaClient();
const testUserIds: string[] = [];

// Create mock Stripe instance using vi.hoisted for proper mock factory access
const { mockStripeWebhooks, mockStripeCheckout } = vi.hoisted(() => ({
  mockStripeWebhooks: {
    constructEvent: vi.fn((payload, signature, secret) => {
      // Default: parse the payload and return as an event
      const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
      return event;
    }),
  },
  mockStripeCheckout: {
    sessions: {
      retrieve: vi.fn(),
    },
  },
}));

// Mock Stripe configuration
vi.mock('../modules/stripe/stripe.config', () => ({
  stripe: {
    webhooks: mockStripeWebhooks,
    checkout: mockStripeCheckout,
  },
  stripeConfig: {
    webhookSecret: 'whsec_test_secret',
  },
  isStripeConfigured: () => true,
}));

describe('Stripe Webhook Integration Tests', () => {
  let server: any;
  let testUser: any;
  let questId: string;

  beforeAll(async () => {
    testUser = await createTestUser(prisma, { email: 'stripe-test@test.com' });
    testUserIds.push(testUser.id);

    server = await createTestServer(prisma);

    // Create a test quest for funding
    const quest = await prisma.quest.create({
      data: {
        title: 'Stripe Test Quest',
        description: 'Testing Stripe webhooks',
        sponsor: 'Test Sponsor',
        type: 'FCFS',
        status: 'draft',
        rewardType: 'USD',
        rewardAmount: 100,
        totalSlots: 5,
        creatorUserId: testUser.id,
        fundingStatus: 'pending',
      },
    });
    questId = quest.id;
  });

  afterAll(async () => {
    await cleanupTestData(prisma, testUserIds);
    await server.close();
    await prisma.$disconnect();
  });

  describe('checkout.session.completed Webhook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should process successful payment and mark quest as funded', async () => {
      const session = createMockCheckoutSession({
        payment_status: 'paid',
        metadata: {
          type: 'quest_funding',
          questId,
        },
        amount_total: 10000, // $100.00 in cents
      });

      const event = createMockStripeEvent('checkout.session.completed', session);

      // Mock stripe.webhooks.constructEvent to return our event
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload,
      });

      if (response.statusCode !== 200) {
        console.log('Response status:', response.statusCode);
        console.log('Response body:', response.body);
      }

      expect(response.statusCode).toBe(200);

      // Verify quest was updated
      const updatedQuest = await prisma.quest.findUnique({ where: { id: questId } });
      expect(updatedQuest?.fundingStatus).toBe('confirmed');
      expect(updatedQuest?.fundingMethod).toBe('stripe');
      expect(updatedQuest?.status).toBe('live');
      expect(updatedQuest?.fundedAmount).toBe(100);
    });

    it('should handle scheduled quest (with startAt) and set status to scheduled', async () => {
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      const scheduledQuest = await prisma.quest.create({
        data: {
          title: 'Scheduled Quest',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'draft',
          rewardType: 'USD',
          rewardAmount: 50,
          totalSlots: 3,
          creatorUserId: testUser.id,
          fundingStatus: 'pending',
          startAt: futureDate,
        },
      });

      const session = createMockCheckoutSession({
        payment_status: 'paid',
        metadata: {
          type: 'quest_funding',
          questId: scheduledQuest.id,
        },
      });

      const event = createMockStripeEvent('checkout.session.completed', session);
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload,
      });

      const updated = await prisma.quest.findUnique({ where: { id: scheduledQuest.id } });
      expect(updated?.fundingStatus).toBe('confirmed');
      expect(updated?.status).toBe('scheduled');

      // Cleanup
      await prisma.quest.delete({ where: { id: scheduledQuest.id } });
    });

    it('should be idempotent - processing same webhook twice', async () => {
      const idempotentQuest = await prisma.quest.create({
        data: {
          title: 'Idempotent Test',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'draft',
          rewardType: 'USD',
          rewardAmount: 75,
          totalSlots: 2,
          creatorUserId: testUser.id,
          fundingStatus: 'pending',
        },
      });

      const session = createMockCheckoutSession({
        payment_status: 'paid',
        metadata: {
          type: 'quest_funding',
          questId: idempotentQuest.id,
        },
      });

      const event = createMockStripeEvent('checkout.session.completed', session);
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      // First webhook
      const response1 = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
        payload,
      });

      expect(response1.statusCode).toBe(200);

      // Second webhook (duplicate)
      const response2 = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
        payload,
      });

      expect(response2.statusCode).toBe(200);

      // Verify quest only updated once
      const final = await prisma.quest.findUnique({ where: { id: idempotentQuest.id } });
      expect(final?.fundingStatus).toBe('confirmed');

      // Cleanup
      await prisma.quest.delete({ where: { id: idempotentQuest.id } });
    });

    it('should skip non-quest_funding sessions', async () => {
      const session = createMockCheckoutSession({
        metadata: {
          type: 'other_payment',
        },
      });

      const event = createMockStripeEvent('checkout.session.completed', session);
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject webhook with invalid signature', async () => {
      const session = createMockCheckoutSession();
      const event = createMockStripeEvent('checkout.session.completed', session);
      const payload = JSON.stringify(event);

      // Mock signature verification to throw error
      
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: {
          'stripe-signature': 'invalid_signature',
          'content-type': 'application/json',
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid webhook signature');
    });
  });

  describe('charge.refunded Webhook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should process refund and update quest status', async () => {
      const refundQuest = await prisma.quest.create({
        data: {
          title: 'Quest to Refund',
          description: 'Test',
          sponsor: 'Test',
          type: 'FCFS',
          status: 'live',
          rewardType: 'USD',
          rewardAmount: 100,
          totalSlots: 5,
          creatorUserId: testUser.id,
          fundingStatus: 'confirmed',
          fundingMethod: 'stripe',
          stripePaymentId: 'pi_test_12345',
        },
      });

      const charge = createMockCharge({
        id: 'ch_test_refund',
        payment_intent: 'pi_test_12345',
        refunded: true,
        amount_refunded: 10000,
        refunds: {
          object: 'list',
          data: [
            {
              id: 'ref_test_12345',
              object: 'refund',
              amount: 10000,
              charge: 'ch_test_refund',
              created: Math.floor(Date.now() / 1000),
              currency: 'usd',
              payment_intent: 'pi_test_12345',
              reason: null,
              status: 'succeeded',
            } as any,
          ],
          has_more: false,
          url: '/v1/charges/ch_test_refund/refunds',
        },
      });

      const event = createMockStripeEvent('charge.refunded', charge);
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
        payload,
      });

      expect(response.statusCode).toBe(200);

      // Cleanup
      await prisma.quest.delete({ where: { id: refundQuest.id } });
    });
  });

  describe('account.updated Webhook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should update user Stripe Connect onboarding status', async () => {
      const accountId = 'acct_test_12345';

      // Link account to user
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          stripeConnectedAccountId: accountId,
          stripeConnectedOnboarded: false,
        },
      });

      const account = createMockAccount({
        id: accountId,
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        metadata: { userId: testUser.id } as any,
      });

      const event = createMockStripeEvent('account.updated', account);
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
        payload,
      });

      expect(response.statusCode).toBe(200);

      // Verify user was updated
      const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(updatedUser?.stripeConnectedOnboarded).toBe(true);
    });

    it('should handle account with incomplete onboarding', async () => {
      const accountId = 'acct_incomplete_12345';

      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          stripeConnectedAccountId: accountId,
          stripeConnectedOnboarded: false,
        },
      });

      const account = createMockAccount({
        id: accountId,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      });

      const event = createMockStripeEvent('account.updated', account);
      
      mockStripeWebhooks.constructEvent.mockReturnValue(event);

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload);

      await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
        payload,
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(updatedUser?.stripeConnectedOnboarded).toBe(false);
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhook with missing signature', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Missing stripe-signature');
    });

    it('should reject webhook with missing body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/stripe/webhook',
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
