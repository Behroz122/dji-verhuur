const { createMollieClient } = require('@mollie/api-client');

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

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

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

    // Calculate price
    const pricePerHour = role === 'docent' ? 10 : 15;
    const totalAmount = (pricePerHour * parseInt(hours)).toFixed(2);
    const rolLabel = role === 'docent' ? 'Docent' : 'Leerling';
    const siteUrl = process.env.URL || 'https://kickndji.netlify.app';

    // Create Mollie payment
    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: totalAmount,
      },
      description: `DJI OSMO Pocket 3 — ${rolLabel} — ${hours} uur op ${date} om ${startTime}`,
      redirectUrl: `${siteUrl}?success=true`,
      cancelUrl: `${siteUrl}?cancelled=true`,
      webhookUrl: `${siteUrl}/.netlify/functions/mollie-webhook`,
      method: 'ideal',
      metadata: {
        naam: name,
        email: email,
        telefoon: phone || '',
        rol: role,
        datum: date,
        starttijd: startTime,
        aantal_uur: hours.toString(),
        totaalbedrag: totalAmount,
        client_reference_id: `${name}|${role}|${date}|${startTime}|${hours}h|${phone}`,
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: payment.getCheckoutUrl() }),
    };
  } catch (error) {
    console.error('Mollie error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
