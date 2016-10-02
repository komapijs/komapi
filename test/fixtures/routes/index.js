// Exports
export default (router) => {
    router.get('/', ctx => ctx.send({ status: 'index' }));
    return router;
};
