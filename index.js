// index.js

const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.CLIENT_CERT_URL,
  }),
});

const db = admin.firestore();

/**
 * AzamPay callback endpoint to receive payment updates.
 * Expects JSON payload from AzamPay with payment info.
 */
app.post('/azam-callback', async (req, res) => {
  console.log('🔔 Received AzamPay Callback:', req.body);

  try {
    const {
      amount,
      fspReferenceId,
      message,
      msisdn,
      operator,
      reference,
      submerchantAcc,
      transactionstatus,
      utilityref,
      ...rest
    } = req.body;

    // Validate required fields
    if (!reference || !transactionstatus) {
      return res.status(400).json({ message: 'Missing required fields: reference or transactionstatus' });
    }

    console.log('Transaction Status:', transactionstatus);
    console.log('Payment reference:', reference);

    // You can choose to handle only successful payments here or save all statuses
    if (transactionstatus !== 'SUCCESS') {
      console.warn(`Payment status is not SUCCESS. Status: ${transactionstatus}`);
      // Optionally respond but still store info for record-keeping
    }

    // Prepare data to store/update in Firestore
    const paymentData = {
      amount: parseFloat(amount || 0),
      fspReferenceId: fspReferenceId || null,
      message: message || '',
      msisdn: msisdn || '',
      operator: operator || '',
      reference,
      submerchantAcc: submerchantAcc || null,
      transactionstatus,
      utilityref: utilityref || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: rest, // store any extra fields for debugging
    };

    // Store or merge the payment data in 'payments' collection, document keyed by 'reference'
    await db.collection('payments').doc(reference).set(paymentData, { merge: true });

    console.log('✅ Payment updated successfully for:', reference);
    return res.status(200).json({ message: 'Payment updated successfully.' });
  } catch (error) {
    console.error('❌ Error handling callback:', error);
    return res.status(500).json({ message: 'Internal server error while updating payment.' });
  }
});

app.get('/', (req, res) => {
  res.send('AzamPay Callback Server is Running ✅');
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
