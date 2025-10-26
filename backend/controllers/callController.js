const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get call history
const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const calls = await prisma.call.findMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 50
    });

    res.json({ calls });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
};

// Create call record
const createCall = async (req, res) => {
  try {
    const { receiverId, callType } = req.body;
    const callerId = req.user.id;

    if (!receiverId || !callType) {
      return res.status(400).json({ error: 'Receiver and call type are required' });
    }

    const call = await prisma.call.create({
      data: {
        callerId,
        receiverId,
        callType,
        status: 'initiated'
      },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        }
      }
    });

    res.status(201).json({ call });
  } catch (error) {
    console.error('Create call error:', error);
    res.status(500).json({ error: 'Failed to create call record' });
  }
};

// Update call status
const updateCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, duration, endedAt } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (duration !== undefined) updateData.duration = duration;
    if (endedAt) updateData.endedAt = new Date(endedAt);

    const call = await prisma.call.update({
      where: { id: callId },
      data: updateData,
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        }
      }
    });

    res.json({ call });
  } catch (error) {
    console.error('Update call error:', error);
    res.status(500).json({ error: 'Failed to update call' });
  }
};

module.exports = { 
  getCallHistory, 
  createCall, 
  updateCall 
};

