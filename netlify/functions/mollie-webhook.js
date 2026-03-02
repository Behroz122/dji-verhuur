const { createMollieClient } = require('@mollie/api-client');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

    // Mollie sends the payment ID in the body
    const params = new URLSearchParams(event.body);
    const paymentId = params.get('id');

    if (!paymentId) {
      return { statusCode: 400, body: 'Missing payment ID' };
    }

    // Fetch the payment details from Mollie
    const payment = await mollieClient.payments.get(paymentId);

    console.log('Payment status:', payment.status);
    console.log('Payment metadata:', JSON.stringify(payment.metadata));

    // If you want to forward to Zapier webhook, uncomment and add ZAPIER_WEBHOOK_URL env var:
    // if (payment.status === 'paid' && process.env.ZAPIER_WEBHOOK_URL) {
    //   await fetch(process.env.ZAPIER_WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       payment_id: payment.id,
    //       status: payment.status,
    //       amount: payment.amount.value,
    //       description: payment.description,
    //       ...payment.metadata,
    //     }),
    //   });
    // }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 500, body: error.message };
  }
};
