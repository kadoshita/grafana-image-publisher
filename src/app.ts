import fastify from 'fastify';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as minio from 'minio';
import { URLSearchParams } from 'url';
import fs from 'fs';
import path from 'path';

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
    ts: number;
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
    minio: {
        url: string;
        bucket: string;
    };
};

const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';

const configJson = fs.readFileSync(path.join(__dirname, '../config.json'), { encoding: 'utf-8' });

const config: Config = JSON.parse(configJson) as Config;

const minioClient = new minio.Client({
    endPoint: config.minio.url,
    port: 443,
    useSSL: true,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY
});

const getImageFromMinio = (param: GraphParam): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        minioClient.getObject(config.minio.bucket || '', `${param.host}/${param.panel}/${param.ts}/${param.duration}`, (err, res) => {
            if (err) {
                return reject(err);
            }
            const data: any[] = [];
            res.on('data', chunk => {
                data.push(chunk);
            });
            res.on('end', () => {
                const buf = Buffer.concat(data);
                resolve(buf);
            });
        });
    });
};

const getGrafanaGraph = async (params: GraphParam) => {
    const to = params.ts;

    try {
        const data = await getImageFromMinio(params);
        if (data.length > 0) {
            return new Promise((resolve, reject) => {
                resolve(data);
            });
        }
    } catch (err) {
        console.info(`${err.code} create new file: ${err.resource}`);
    }


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
    if (!res.ok) {
        return new Promise((resolve, reject) => {
            reject('cannot get grafana image');
        });
    }
    const buf = await res.buffer();

    await minioClient.putObject(config.minio.bucket || '', `${params.host}/${params.panel}/${params.ts}/${params.duration}`, buf, { 'Content-Type': 'image/png' });
    return new Promise((resolve, reject) => {
        resolve(buf);
    });
};

const server = fastify();

server.get('/', async (request, reply) => {
    return { status: 'OK' };
});

server.get('/graph/:host/:panel/:ts/:duration', async (request, reply) => {
    const params: GraphParam = request.params as GraphParam;
    try {
        const data = await getGrafanaGraph(params);
        return reply.type('image/png').send(data);
    } catch (error) {
        return reply.status(404).send();
    }

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