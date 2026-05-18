const http = require('http');
const tests = [
  { path: '/api/signup', email: 'test-user@example.com', password: 'senha123' },
  { path: '/api/login', email: 'test-user@example.com', password: 'senha123' },
];

(async () => {
  for (const test of tests) {
    const data = JSON.stringify({ email: test.email, password: test.password });
    const options = {
      hostname: '127.0.0.1',
      port: 8080,
      path: test.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    await new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          console.log('===', test.path, 'status', res.statusCode);
          console.log(body);
          resolve();
        });
      });
      req.on('error', (err) => {
        console.error('ERROR', err.message);
        resolve();
      });
      req.write(data);
      req.end();
    });
  }
})();
