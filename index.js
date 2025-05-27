const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

    if (!reference || !transactionstatus) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Update Firestore payment doc keyed by reference (bookId)
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
      raw: rest,
    };

    await db.collection('payments').doc(reference).set(paymentData, { merge: true });

    console.log('✅ Payment updated successfully for:', reference);
    res.status(200).json({ message: 'Payment updated successfully.' });
  } catch (err) {
    console.error('❌ Error handling callback:', err);
    res.status(500).json({ message: 'Error updating payment.' });
  }
});

app.get('/', (req, res) => {
  res.send('AzamPay Callback Server is Running ✅');
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
