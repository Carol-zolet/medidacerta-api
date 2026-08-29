import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RespostaErroPadronizada {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];
    if (isHttpException) {
      const resposta = exception.getResponse();
      if (typeof resposta === 'string') {
        message = resposta;
      } else {
        const resposta_obj = resposta as { message?: string | string[] };
        message = resposta_obj.message ?? exception.message;
      }
    } else {
      // Nunca expõe stack trace ou detalhes internos de erros inesperados ao cliente.
      message = 'Erro interno do servidor';
    }

    if (!isHttpException || statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const corpo: RespostaErroPadronizada = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(corpo);
  }
}
