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

// Initialize Firebase Admin
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

// Callback endpoint for AzamPay
app.post('/azam-callback', async (req, res) => {
  console.log('🔔 Received AzamPay Callback:', req.body);

  try {
    const { referenceId, status, amount, ...rest } = req.body;

    if (!referenceId || !status) {
      console.warn('❌ Missing referenceId or status in callback');
      return res.status(400).json({ message: 'Missing referenceId or status' });
    }

    const paymentData = {
      referenceId,
      status,
      amount: parseFloat(amount || 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: rest, // store any extra fields just in case
    };

    await db.collection('payments').doc(referenceId).set(paymentData, { merge: true });

    console.log('✅ Payment updated successfully for:', referenceId);
    res.status(200).json({ message: 'Payment updated successfully.' });
  } catch (err) {
    console.error('❌ Error handling callback:', err);
    res.status(500).json({ message: 'Error updating payment.' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('AzamPay Callback Server is Running ✅');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
