import Midtrans from 'midtrans-client';
import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { logger } from '../../utils/logger';

// check payment status
export async function GET(request) {
  try {
    // Get order_id from query parameters
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      await logger.error('Missing order_id in query parameters');
      return NextResponse.json(
        { status: 'error', message: 'Missing order_id parameter' },
        { status: 400 },
      );
    }

    // Log the request for checking payment status
    await logger.info('Checking payment status', { orderId });

    // Initialize Midtrans core API for checking transaction status
    const coreApi = new Midtrans.CoreApi({
      isProduction: false,
      serverKey: process.env.SECRET,
      clientKey: process.env.NEXT_PUBLIC_CLIENT,
    });

    // Get transaction status from Midtrans
    const transactionStatus = await coreApi.transaction.status(orderId);

    // Log the transaction status
    await logger.info('Transaction status retrieved', {
      orderId,
      transactionStatus,
    });

    return NextResponse.json(
      {
        status: 'success',
        data: transactionStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    await logger.error('Error checking payment status', {
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
