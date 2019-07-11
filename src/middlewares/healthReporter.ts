import Koa from 'koa';
import Komapi from '../lib/Komapi';

// Types
export type Observation =
  | {
      observedValue: string | number;
      observedUnit: string;
    }
  | {};
export type CheckResult = Observation & {
  status: 'fail' | 'warn' | 'pass';
  output?: string;
  componentId?: string;
  componentType?: string;
  node?: string | number;
  affectedEndpoints?: string[];
  time?: string;
  links?: {
    [key: string]: string;
  };
};
export interface HealthReporterOptions {
  checks: (
    ctx: Koa.ParameterizedContext,
  ) =>
    | Promise<{ status: CheckResult['status']; output?: CheckResult['output']; checks?: CheckResult[] }>
    | { status: CheckResult['status']; output?: CheckResult['output']; checks?: CheckResult[] };
}

// Exports
export default function createHealthReporter(options: Partial<HealthReporterOptions> = {}): Komapi.Middleware {
  return async function healthReporterMiddleware(ctx) {
    // See https://tools.ietf.org/html/draft-inadarei-api-health-check-03 for more information
    ctx.set('Content-Type', 'application/health+json');

    // Check if application is ready
    if (ctx.app.state !== Komapi.LifecycleState.STARTED) {
      ctx.status = 503;
      ctx.body = {
        status: 'fail',
        output:
          ctx.app.state === Komapi.LifecycleState.STARTING ? 'Application is not ready' : 'Application is stopping',
        serviceID: ctx.app.config.serviceId,
      };
    } else {
      const { status = 'pass', output = undefined, checks = undefined } = options.checks
        ? await options.checks(ctx)
        : {};
      ctx.body = {
        status,
        output,
        serviceID: ctx.app.config.serviceId,
        checks,
      };
      if (ctx.body.status === 'fail') ctx.status = 503;
    }
  };
}
