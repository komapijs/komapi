// Dependencies
import Router from 'koa-router';

// Init
const router = new Router();
router.get('/', ctx => ctx.send({ status: 'ok' }));

// Exports
export default router;
