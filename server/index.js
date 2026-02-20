import express from 'express';
import cors from 'cors';
import scoresRouter from './routes/scores.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:8080';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/scores', scoresRouter);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
