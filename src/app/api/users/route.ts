import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handler";

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users by role and status
 *     description: Retrieve users filtered by role and active status
 *     tags: [Users]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, GURUJI, COORDINATOR, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           specialization:
 *                             type: string
 *                 message:
 *                   type: string
 *                   example: "Users retrieved successfully"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const active = searchParams.get("active");

    // Build where clause
    const whereClause: any = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (active !== null) {
      whereClause.isActive = active === 'true';
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        specialization: true,
        phone: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return createSuccessResponse({
      users,
      total: users.length,
    }, "Users retrieved successfully", 200);

  } catch (error) {
    console.error("Get users error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}