import Stripe from 'stripe';
import db from './db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function createCheckoutSession(userId, userEmail) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: userEmail,
    line_items: [{
      price_data: {
        currency: 'inr',
        product_data: {
          name: 'BreakText AI Pro (50,000 Words)',
          description: 'One-time upgrade for 50,000 words & Turnitin bypass'
        },
        unit_amount: 10000,
        },
      quantity: 1
    }],
    success_url: `${process.env.APP_URL || 'http://localhost:5173'}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}`,
    metadata: { userId: userId.toString() }
  });
  return session.url;
}

export async function verifyAndUpgradeSession(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if ((session.payment_status === 'paid' || session.status === 'complete') && session.metadata?.userId) {
      db.prepare(`
        UPDATE users 
        SET tier = 'pro', words_limit = 50000, stripe_customer_id = ? 
        WHERE id = ?
      `).run(session.customer ? session.customer.toString() : 'cus_test', session.metadata.userId);
      return true;
    }
  } catch (err) {
    console.error('[Stripe Session Verification Error]:', err.message);
  }
  return false;
}

export function handleWebhook(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      db.prepare(`
        UPDATE users 
        SET tier = 'pro', words_limit = 50000, stripe_customer_id = ? 
        WHERE id = ?
      `).run(session.customer ? session.customer.toString() : 'cus_test', userId);
    }
  }
}