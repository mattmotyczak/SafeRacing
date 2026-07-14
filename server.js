import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Genera una pool de coneccion a la DB por medio de neon
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Genera las preguntas de easy
app.get('/api/questions/easy', async (req, res) => {
  try {
    const query = `
      SELECT 
        q."ideasyquestion", q.question, q."photostring",
        a."ideasyanswer", a.answer, a."iscorrect"
      FROM easy_questions q
      JOIN easy_answers a ON q."ideasyquestion" = a."relatedtoquestion"
    `;
    const result = await pool.query(query);

    const questionsMap = {};

    result.rows.forEach(row => {
      const qId = row.ideasyquestion;

      if (!questionsMap[qId]) {
        questionsMap[qId] = {
          question: row.question,
          photoString: row.photoString,
          options: [],
          answer: -1
        };
      }

      const currentQ = questionsMap[qId];
      const optionIndex = currentQ.options.length;

      currentQ.options.push(row.answer);

      if (row.iscorrect) {
        currentQ.answer = optionIndex;
      }
    });

    res.json(Object.values(questionsMap));
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch easy questions' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
