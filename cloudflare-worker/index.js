/**
 * Cloudflare Worker for Onramper Webhooks
 * 
 * Instructions:
 * 1. Paste this code into your Cloudflare Worker "worker.js" or "index.js" file via the web editor or CLI.
 * 2. In your Cloudflare Worker Settings -> Variables:
 *    - Add a Secret Variable: name="ONRAMPER_WEBHOOK_SECRET", value="<your-secret-from-onramper>"
 *    - Add D1 Database Binding: name="DB", value="<your-d1-database>"
 * 3. CORS is configurable: update `corsHeaders` below to match your allowed origins/methods/headers.
 * 4. Save and Deploy your Worker.
 */

/**
 * Verifies the HMAC SHA-256 signature using the Web Crypto API
 */
async function verifySignature(signature, secret, bodyText) {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(bodyText)
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return signature === hashHex;
}

// You can manually customize these CORS headers for your own deployment needs.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Onramper-Webhook-Signature',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const walletAddress = url.searchParams.get('walletAddress');

      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'Database not configured' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      try {
        let result;
        if (walletAddress) {
          result = await env.DB.prepare('SELECT * FROM webhook_events WHERE LOWER(walletAddress) = LOWER(?) ORDER BY statusDate DESC').bind(walletAddress).all();
        } else {
          return new Response(JSON.stringify({ error: 'Missing walletAddress parameter' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        if (result && result.results) {
          return new Response(JSON.stringify(result.results), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        } else {
          return new Response(JSON.stringify([]), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      } catch (dbError) {
        return new Response(JSON.stringify({ error: 'Database query failed', details: dbError.message }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const signatureHeader = request.headers.get('X-Onramper-Webhook-Signature');
      
      if (!signatureHeader) {
        return new Response('Missing signature header', { status: 401, headers: corsHeaders });
      }

      const rawBody = await request.text();
      let isValid = false;

      if (!env.ONRAMPER_WEBHOOK_SECRET) {
          console.error("Missing ONRAMPER_WEBHOOK_SECRET environment variable.");
          return new Response('Server configuration error', { status: 500, headers: corsHeaders });
      }
      isValid = await verifySignature(
        signatureHeader, 
        env.ONRAMPER_WEBHOOK_SECRET, 
        rawBody
      );

      if (!isValid) {
        console.error("Invalid webhook signature.");
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }

      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (parseError) {
        console.error("Failed to parse JSON body");
        return new Response('Bad Request: Invalid JSON', { status: 400, headers: corsHeaders });
      }

      console.log(`Received webhook for transaction: ${payload.transactionId}, status: ${payload.status}`);

      // --- SAVE TO D1 DATABASE ---
      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO webhook_events (
              transactionId, country, inAmount, onramp, onrampTransactionId, outAmount, 
              paymentMethod, partnerContext, sourceCurrency, status, statusReason, statusDate, 
              targetCurrency, transactionType, transactionHash, walletAddress, isRecurringPayment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(transactionId) DO UPDATE SET 
              status=excluded.status, 
              outAmount=excluded.outAmount, 
              statusReason=excluded.statusReason,
              transactionHash=excluded.transactionHash,
              statusDate=excluded.statusDate;`
          ).bind(
            payload.transactionId,
            payload.country,
            payload.inAmount,
            payload.onramp,
            payload.onrampTransactionId,
            payload.outAmount,
            payload.paymentMethod || null,
            payload.partnerContext || null,
            payload.sourceCurrency,
            payload.status,
            payload.statusReason || null,
            payload.statusDate,
            payload.targetCurrency,
            payload.transactionType,
            payload.transactionHash || null,
            payload.walletAddress || null,
            payload.isRecurringPayment ? 1 : 0
          ).run();
          console.log(`Successfully stored/updated transaction ${payload.transactionId} in D1.`);
        } catch (dbError) {
          console.error(`Failed to store transaction in D1 DB: ${dbError}`);
        }
      } else {
        console.warn("D1 Database binding 'DB' not found. Skipping database insertion.");
      }

      return new Response('Webhook processed successfully', { status: 200, headers: corsHeaders });

    } catch (error) {
      console.error('Webhook overarching error:', error);
      return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
    }
  },
};
