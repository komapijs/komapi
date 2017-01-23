// Exports
module.exports = (router) => {
  router.get('/', ctx => ctx.send({ status: 'es5' }));
  return router;
};
