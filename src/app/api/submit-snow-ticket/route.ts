import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const { system, payload, userEmail, description, forceFail } = await request.json();

    // Comprehensive logging of all inputs at the start
    console.log('SNOW ticket submission received:', {
      system,
      userEmail,
      description: description ? description.substring(0, 200) + (description.length > 200 ? '...' : '') : 'N/A',
      payloadKeys: payload ? Object.keys(payload) : 'No payload',
      payloadSize: payload ? JSON.stringify(payload).length : 0,
      forceFail,
      timestamp: new Date().toISOString()
    });

    // Configurable failure systems
    const failureSystems = process.env.MOCK_FAILURE_SYSTEMS?.split(',') || ['ping-federate'];

    if (forceFail || !userEmail || userEmail.includes('invalid')) {
      console.error(`Mock SNOW ticket submission failed (forced): system=${system}, user=${userEmail}, description_preview="${description?.substring(0, 100)}...", payload_size=${JSON.stringify(payload).length}`);
      return NextResponse.json({ error: 'Invalid request for ticket submission' }, { status: 400 });
    }

    if (failureSystems.includes(system)) {
      // Simulate failure for specified systems like ping-federate
      console.error(`Mock SNOW ticket submission failed: system=${system}, user=${userEmail}, description_preview="${description?.substring(0, 100)}...", reason="Mock failure scenario", payload_size=${JSON.stringify(payload).length}`);
      return NextResponse.json({ error: `Ticket creation failed for ${system} (mock failure scenario)` }, { status: 500 });
    }

    // Success case, especially for ping-directory
    const ticketId = randomUUID().slice(0, 8).toUpperCase();
    const ticketNumber = `INC-${ticketId}`;
    const timestamp = new Date().toISOString();
    
    // Mock ticket data using the provided description
    const mockTicketData = {
      ticketNumber,
      status: 'new',
      priority: 'medium',
      assignedTo: userEmail,
      description: description || `Access issue in ${system}. Payload attached.`,
      createdAt: timestamp,
      system,
      userEmail,
      payload: payload ? { ...payload, _truncated: JSON.stringify(payload).length > 10000 } : null, // include full payload if small
    };

    // Detailed success logging with full details (truncate large payloads for logs)
    const logPayload = JSON.stringify(payload).length > 5000 
      ? { ...payload, _truncated: true, size: JSON.stringify(payload).length } 
      : payload;
    
    console.log('Mock SNOW ticket created successfully:', {
      ...mockTicketData,
      description: description ? description.substring(0, 500) + (description.length > 500 ? '...' : '') : 'N/A',
      payload: logPayload,
      fullDescriptionLength: description?.length || 0
    });

    return NextResponse.json({ ticketNumber, timestamp, message: 'Ticket submitted successfully', ...mockTicketData });
  } catch (error) {
    console.error('SNOW ticket submission error:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      system: await request.json().then(body => body.system).catch(() => 'unknown'),
      userEmail: await request.json().then(body => body.userEmail).catch(() => 'unknown'),
      description_preview: await request.json().then(body => (body.description || '').substring(0, 100) + '...').catch(() => 'N/A')
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}