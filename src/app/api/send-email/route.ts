import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger'; // Assume a shared logger if exists, else use console

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, system, payload, forceFail = false } = await request.json();

    // Mock email sending - in production, integrate with SMTP/Resend/SendGrid etc.
    // For demo, simulate success unless forceFail
    if (forceFail) {
      logger.warn(`Mock email failure triggered for ${system}: invalid recipient ${to}`);
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    // Simulate async send delay
    await new Promise(resolve => setTimeout(resolve, 500));

    logger.info(`Mock email sent to ${to} for system ${system}`, { subject, system, payloadSize: JSON.stringify(payload).length });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    logger.error('Email send error:', { error: (error as Error).message, system: request.body?.system });
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}