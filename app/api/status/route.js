import Midtrans from 'midtrans-client';
import { NextResponse } from 'next/server';
import { logger } from '../../utils/logger';


export async function GET(request) {
  try {
    const orderId = req.params.order_id;

    const coreApi = new Midtrans.CoreApi({
      isProduction: false,
      serverKey: process.env.SECRET,
      clientKey: process.env.NEXT_PUBLIC_CLIENT,
    });

    const transactionStatus = await coreApi.transaction.status(orderId);

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
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
