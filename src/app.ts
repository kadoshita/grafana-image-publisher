import fastify from 'fastify';

interface GraphParam {
    host: string;
    panel: string;
    duration: number;
};

const server = fastify();

server.get('/', async (request, reply) => {
    return { status: 'OK' };
});

server.get('/graph/:host/:panel/:duration', async (request, reply) => {
    const params: GraphParam = request.params as GraphParam;
    console.log(params);
    return reply.status(200).send();
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