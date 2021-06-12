import fastify from 'fastify';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

import configJson from './config.json';

dotenv.config();

interface RequestParam {
    orgId: number;
    from: number;
    to: number;
    panelId: number;
    width: number;
    height: number;
    tz: string;
    'var-Host': string;
}
interface GraphParam {
    host: string;
    panel: string;
    duration: number;
};

interface Config {
    grafana: {
        url: string;
        dashboardId: string;
        dashboardName: string;
        orgId: number;
        panels: [
            {
                name: string,
                id: number
            }
        ];
    };
};

const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;

const config: Config = configJson as Config;

const getGrafanaGraph = async (params: GraphParam) => {
    const to = (new Date()).getTime();
    const from = to - (params.duration * 1000);
    const reqParams: RequestParam = {
        orgId: config.grafana.orgId,
        from: from,
        to: to,
        panelId: config.grafana.panels.find(p => p.name === params.panel)?.id || 1,
        width: 2000,
        height: 500,
        tz: 'Asia/Tokyo',
        'var-Host': params.host
    };
    const url = new URL(`${config.grafana.url}/${config.grafana.dashboardId}/${config.grafana.dashboardName}`);
    const sp = new URLSearchParams();
    const obj = Object(reqParams);
    Object.keys(obj).forEach(k => sp.append(k, obj[k]));
    url.search = sp.toString();

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${GRAFANA_API_KEY}`
        }
    });
    return res.buffer();
};

const server = fastify();

server.get('/', async (request, reply) => {
    return { status: 'OK' };
});

server.get('/graph/:host/:panel/:duration', async (request, reply) => {
    const params: GraphParam = request.params as GraphParam;
    const data = await getGrafanaGraph(params);
    return reply.type('image/png').send(data);
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