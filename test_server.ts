import express from 'express';
const app = express();
app.get('/api/test', (req, res) => res.json({ success: true }));
app.get(/.*/, (req, res) => res.send('HTML'));
app.listen(8081, () => console.log('started'));
