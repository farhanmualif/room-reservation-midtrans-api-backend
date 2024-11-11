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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.SECRET,
  clientKey: process.env.NEXT_PUBLIC_CLIENT,
});

export async function POST(request) {
  try {
    const body = await request.json();
    await logger.info('Received webhook notification', {
      orderId: body.order_id,
      timestamp: new Date().toISOString(),
    });

    // Verify notification signature
    const signatureKey = process.env.SECRET;
    const notification = new Midtrans.CoreApi({
      isProduction: false,
      serverKey: signatureKey,
      clientKey: process.env.NEXT_PUBLIC_CLIENT,
    });

    try {
      const notificationJson =
        await notification.transaction.notification(body);
      await logger.info('Notification verification successful', {
        notificationData: notificationJson,
      });

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

      await logger.transaction('Processing payment status update', {
        orderId,
        oldStatus: transactionStatus,
        newStatus: paymentStatus,
        fraudStatus,
      });

      // Update Firestore
      const orderRef = doc(db, 'order', orderId);
      await updateDoc(orderRef, {
        PaymentStatus: paymentStatus,
      });

      await logger.info('Payment status updated successfully', {
        orderId,
        paymentStatus,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          status: 'success',
          message: 'Payment status updated successfully',
        },
        {
          status: 200,
        },
      );
    } catch (error) {
      await logger.error('Error processing notification', {
        error: error.message,
        stack: error.stack,
        body: body,
      });

      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid notification signature',
        },
        {
          status: 403,
        },
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
      {
        status: 500,
      },
    );
  }
}
