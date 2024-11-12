import Midtrans from 'midtrans-client';
import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { logger } from '../../utils/logger';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASURENMENT_ID,
};

// Initialize Firebase only once
let app;
let db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  if (!/already exists/.test(error.message)) {
    logger.error('Firebase initialization error', { error: error.message });
  }
}

// Initialize Midtrans only once
const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.SECRET,
  clientKey: process.env.NEXT_PUBLIC_CLIENT,
});

export async function POST(request) {
  try {
    // Validate request content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await logger.error('Invalid content type', { contentType });
      return NextResponse.json(
        { status: 'error', message: 'Invalid content type' },
        { status: 400 },
      );
    }

    // Get request body and validate
    const rawBody = await request.text();
    if (!rawBody) {
      await logger.error('Empty request body');
      return NextResponse.json(
        { status: 'error', message: 'Empty request body' },
        { status: 400 },
      );
    }

    // Parse JSON body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      await logger.error('Invalid JSON body', {
        error: error.message,
        rawBody,
      });
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON format' },
        { status: 400 },
      );
    }

    // Log the incoming webhook
    await logger.info('Received webhook notification', {
      orderId: body.order_id,
      transactionStatus: body.transaction_status,
    });

    // Verify notification signature
    const notification = new Midtrans.CoreApi({
      isProduction: false,
      serverKey: process.env.SECRET,
      clientKey: process.env.NEXT_PUBLIC_CLIENT,
    });

    try {
      const notificationJson =
        await notification.transaction.notification(body);

      if (!notificationJson || !notificationJson.order_id) {
        throw new Error('Invalid notification response');
      }

      const orderId = notificationJson.order_id;
      const transactionStatus = notificationJson.transaction_status;
      const fraudStatus = notificationJson.fraud_status;

      let paymentStatus;

      if (transactionStatus == 'capture') {
        if (fraudStatus == 'challenge') {
          paymentStatus = 'challenge';
        } else if (fraudStatus == 'accept') {
          paymentStatus = 'success';
        }
      } else if (transactionStatus == 'settlement') {
        paymentStatus = 'success';
      } else if (
        transactionStatus == 'cancel' ||
        transactionStatus == 'deny' ||
        transactionStatus == 'expire'
      ) {
        paymentStatus = 'failed';
      } else if (transactionStatus == 'pending') {
        paymentStatus = 'pending';
      }

      // Validate orderId before updating Firestore
      if (!orderId || typeof orderId !== 'string') {
        throw new Error('Invalid order ID');
      }

      // Update Firestore with retries
      const maxRetries = 3;
      let lastError = null;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const orderRef = doc(db, 'order', orderId);
          await updateDoc(orderRef, {
            PaymentStatus: paymentStatus,
          });

          await logger.info('Payment status updated successfully', {
            orderId,
            paymentStatus,
            attempt: i + 1,
          });

          return NextResponse.json(
            {
              status: 'success',
              message: 'Payment status updated successfully',
            },
            { status: 200 },
          );
        } catch (error) {
          lastError = error;
          await logger.warning(`Retry attempt ${i + 1} failed`, {
            error: error.message,
            orderId,
          });

          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }

      // If all retries failed
      throw lastError || new Error('Failed to update payment status');
    } catch (error) {
      await logger.error('Error processing notification', {
        error: error.message,
        body: body,
      });

      return NextResponse.json(
        {
          status: 'error',
          message: 'Error processing notification',
        },
        { status: 403 },
      );
    }
  } catch (error) {
    await logger.error('Error handling webhook', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
