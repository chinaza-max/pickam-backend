import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      
      // If the error response is already normalized (e.g. forwarded from a downstream service)
      if (
        typeof resContent === 'object' &&
        resContent !== null &&
        'success' in resContent &&
        'error' in resContent
      ) {
        const forwarded = resContent as Record<string, any>;
        const forwardedMessage =
          forwarded.message ||
          (typeof forwarded.error === 'object' && forwarded.error !== null ? forwarded.error.message : null) ||
          (typeof forwarded.error === 'string' ? forwarded.error : null) ||
          'Internal server error';

        return response.status(status).json({
          ...forwarded,
          message: Array.isArray(forwardedMessage) ? forwardedMessage.join(', ') : forwardedMessage,
        });
      }

      if (typeof resContent === 'object' && resContent !== null) {
        message = (resContent as any).message || JSON.stringify(resContent);
        errorDetails = (resContent as any).error || null;
      } else {
        message = exception.message;
      }
    } else if (exception && exception.code) {
      // Prisma error checking
      if (exception.code.startsWith('P2')) {
        status = HttpStatus.BAD_REQUEST;
        message = `Database transaction error: ${exception.meta?.target || exception.code}`;
      } else {
        message = exception.message || 'Database error occurred';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const finalMessage = Array.isArray(message) ? message.join(', ') : message;

    response.status(status).json({
      success: false,
      data: null,
      message: finalMessage,
      error: {
        statusCode: status,
        message: finalMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
