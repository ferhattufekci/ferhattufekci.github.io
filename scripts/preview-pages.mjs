import { createPagesServer } from './lib/pages-preview.mjs';

const server = createPagesServer();
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Static preview: http://127.0.0.1:' + server.address().port));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
