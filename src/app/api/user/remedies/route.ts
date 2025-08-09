import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const remedies = await prisma.remedyDocument.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        consultationSession: {
          include: {
            guruji: true
          }
        }
      }
    });

    const formattedRemedies = remedies.map(remedy => ({
      id: remedy.id,
      templateName: remedy.template.name,
      gurujiName: remedy.consultationSession.guruji.name || 'Unknown',
      consultationDate: remedy.consultationSession.createdAt.toISOString().split('T')[0],
      status: 'ACTIVE', // Default status since RemedyDocument doesn't have status
      customInstructions: remedy.customInstructions || '',
      customDosage: remedy.customDosage || '',
      customDuration: remedy.customDuration || '',
      pdfUrl: remedy.pdfUrl || '',
      emailSent: remedy.emailSent,
      smsSent: remedy.smsSent,
      deliveredAt: remedy.deliveredAt?.toISOString() || '',
      createdAt: remedy.createdAt.toISOString().split('T')[0],
    }));

    return NextResponse.json({ remedies: formattedRemedies });
  } catch (error) {
    console.error('Error fetching user remedies:', error);
    return NextResponse.json({ error: 'Failed to fetch remedies' }, { status: 500 });
  }
} 