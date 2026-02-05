export const sendTestSMSSchema = {
  tags: ['Notifications'],
  description: 'Send a test SMS message',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['phoneNumber', 'message'],
    properties: {
      phoneNumber: { type: 'string', description: 'Recipient phone number (with country code)' },
      message: { type: 'string', maxLength: 160, description: 'SMS message (max 160 characters)' },
    },
  },
  response: {
    200: {
      description: 'SMS sent successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
  },
};

export const sendCheckInNotificationSchema = {
  tags: ['Notifications'],
  description: 'Send check-in notification to parent/guardian',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'phoneNumber'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      phoneNumber: { type: 'string', description: 'Guardian phone number' },
      checkInTime: { type: 'string', description: 'Check-in time' },
      temperature: { type: 'number', description: 'Temperature reading' },
    },
  },
  response: {
    200: {
      description: 'Notification sent successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const checkBalanceSchema = {
  tags: ['Notifications'],
  description: 'Check Arkesel SMS balance',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'SMS balance information',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            balance: { type: 'number' },
            currency: { type: 'string' },
          },
        },
      },
    },
  },
};

export const uploadPhotoSchema = {
  tags: ['File Uploads'],
  description: 'Upload a single photo to ImageKit',
  security: [{ bearerAuth: [] }],
  consumes: ['multipart/form-data'],
  // Note: body validation is handled by @fastify/multipart, not JSON schema
  response: {
    200: {
      description: 'Photo uploaded successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            fileUrl: { type: 'string', description: 'Photo URL' },
            fileId: { type: 'string', description: 'ImageKit file ID' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  },
};

export const getPresignedUrlSchema = {
  tags: ['File Uploads'],
  description: 'Get presigned URL for direct upload to S3',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['fileName', 'fileType'],
    properties: {
      fileName: { type: 'string', description: 'File name' },
      fileType: { type: 'string', description: 'File MIME type' },
      folder: { type: 'string', description: 'S3 folder path' },
    },
  },
  response: {
    200: {
      description: 'Presigned URL generated',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            uploadUrl: { type: 'string', description: 'Presigned upload URL' },
            fileUrl: { type: 'string', description: 'Final file URL' },
            key: { type: 'string', description: 'S3 key' },
          },
        },
      },
    },
  },
};
