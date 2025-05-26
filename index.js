const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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
    client_x509_cert_url: process.env.CLIENT_CERT_URL
  }),
});

const db = admin.firestore();
app.use(bodyParser.json());

app.post('/azam-callback', async (req, res) => {
  try {
    const { referenceId, status, amount } = req.body;

    if (!referenceId || !status) {
      return res.status(400).json({ message: 'Missing referenceId or status' });
    }

    await db.collection('payments').doc(referenceId).set({
      status,
      amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.status(200).json({ message: 'Payment updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating payment.' });
  }
});

app.get('/', (req, res) => {
  res.send('AzamPay Callback Server is Running');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
