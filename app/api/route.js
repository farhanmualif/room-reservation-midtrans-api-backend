import Midtrans from 'midtrans-client';
import { NextResponse } from 'next/server';

let snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.SECRET,
  clientKey: process.env.NEXT_PUBLIC_CLIENT,
});

export async function POST(request) {
  const { order_id, gross_amount, idPacket } = await request.json();

  let parameter = {
    transaction_details: {
      order_id,
      idPacket,
      gross_amount,
    },
  };

  try {
    // Get token to midtrans via snap
    const token = await snap.createTransactionToken(parameter);
    console.log(token);

    // return token
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.error('Failed to create transaction token', {
      status: 500,
    });
  }
}
