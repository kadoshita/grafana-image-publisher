import fastify from 'fastify';

const server = fastify();

server.get('/', async (request, reply) => {
    return { status: 'OK' };
});

const start = async () => {
    try {
        await server.listen(3000, '0.0.0.0');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();