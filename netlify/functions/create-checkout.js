const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const data = JSON.parse(event.body);
    const { name, email, phone, role, date, startTime, hours } = data;

    // Validate required fields
    if (!name || !email || !role || !date || !startTime || !hours) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Alle verplichte velden moeten ingevuld zijn.' }),
      };
    }

    // Calculate price in cents
    const pricePerHour = role === 'docent' ? 1000 : 1500; // €10 or €15 in cents
    const totalAmount = pricePerHour * parseInt(hours);
    const rolLabel = role === 'docent' ? 'Docent' : 'Leerling';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      mode: 'payment',
      customer_email: email,
      client_reference_id: `${name}|${role}|${date}|${startTime}|${hours}h|${phone}`,
      metadata: {
        naam: name,
        email: email,
        telefoon: phone || '',
        rol: role,
        datum: date,
        starttijd: startTime,
        aantal_uur: hours.toString(),
        totaalbedrag: (totalAmount / 100).toFixed(2),
      },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: pricePerHour,
            product_data: {
              name: `DJI OSMO Pocket 3 — ${rolLabel}`,
              description: `Verhuur ${hours} uur op ${date} vanaf ${startTime}`,
            },
          },
          quantity: parseInt(hours),
        },
      ],
      success_url: `${process.env.URL || 'https://kickndji.netlify.app'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'https://kickndji.netlify.app'}?cancelled=true`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
