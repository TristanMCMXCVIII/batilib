import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const reply = ctx.getResponse<FastifyReply>();

        const isHttp = exception instanceof HttpException;
        const status = isHttp
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        if (!isHttp) {
            this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
        }

        const body = isHttp
            ? exception.getResponse()
            : { statusCode: 500, message: 'Erreur interne du serveur' };

        reply.status(status).send(body);
    }
}
