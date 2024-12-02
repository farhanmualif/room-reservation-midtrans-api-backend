import Midtrans from 'midtrans-client';
import { NextResponse } from 'next/server';

let snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.SECRET,
  clientKey: process.env.NEXT_PUBLIC_CLIENT,
});

export async function POST(request) {
  const { order_id, gross_amount, idPacket, items, customer_details } =
    await request.json();

  const parameter = {
    transaction_details: {
      order_id: order_id,
      gross_amount: gross_amount,
    },
    credit_card: {
      secure: true,
    },
    item_details: Array.isArray(items)
      ? items.map((item) => {
          return {
            id: item.id,
            price: item.price,
            quantity: item.quantity,
            name: item.name,
          };
        })
      : {
          id: items.id,
          price: items.price,
          quantity: items.quantity,
          name: items.name,
        },
    customer_details: {
      first_name: customer_details.first_name,
      last_name: customer_details.last_name,
      email: customer_details.email,
      phone: customer_details.phone,
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({
      status: 'success',
      transactionId: transaction.transaction_id,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { error: 'Failed to create transaction token' },
      { status: 500 },
    );
  }
}
