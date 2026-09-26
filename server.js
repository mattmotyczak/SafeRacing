import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Pinned SSL strategy: the pool ssl option is the single source of truth.
// Any sslmode parameter in DATABASE_URL is stripped first to avoid dual-source
// SSL configuration ambiguity.
const connectionString = (process.env.DATABASE_URL || '')
  .replace(/([?&])sslmode=[^&#]*(?=&|#|$)/gi, '$1')
  .replace(/[?&]$/, '');

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Mode -> table mapping for the unified question endpoint.
const MODE_CONFIG = {
  easy: {
    questionsTable: 'easy_questions',
    answersTable: 'easy_answers',
    questionIdColumn: 'ideasyquestion',
    answerIdColumn: 'ideasyanswer'
  },
  hard: {
    questionsTable: 'hard_questions',
    answersTable: 'hard_answers',
    questionIdColumn: 'idhardquestion',
    answerIdColumn: 'idhardanswer'
  }
};

// Groups joined question/answer rows into the unified question contract:
// { question, options[], answer, photoString }.
// The answer index is deterministic because callers ORDER BY the answer PK.
function groupQuestions(rows) {
  const questionsMap = {};

  rows.forEach(row => {
    const questionId = row.id;

    if (!questionsMap[questionId]) {
      questionsMap[questionId] = {
        question: row.question,
        photoString: row.photostring,
        options: [],
        answer: -1
      };
    }

    const currentQuestion = questionsMap[questionId];
    const optionIndex = currentQuestion.options.length;

    currentQuestion.options.push(row.answer);

    if (row.iscorrect) {
      currentQuestion.answer = optionIndex;
    }
  });

  return Object.values(questionsMap);
}

async function sendQuestions(mode, res) {
  const config = MODE_CONFIG[mode];

  if (!config) {
    res.status(400).json({ error: `Invalid mode '${mode}'. Allowed modes: easy, hard` });
    return;
  }

  const { questionsTable, answersTable, questionIdColumn, answerIdColumn } = config;

  const query = `
    SELECT
      q.${questionIdColumn} AS id,
      q.question,
      q.photostring,
      a.answer,
      a.iscorrect
    FROM ${questionsTable} q
    JOIN ${answersTable} a ON q.${questionIdColumn} = a.relatedtoquestion
    ORDER BY a.${answerIdColumn}
  `;

  try {
    const result = await pool.query(query);
    res.json(groupQuestions(result.rows));
  } catch (err) {
    console.error(`Database error (mode=${mode}):`, err);
    res.status(500).json({ error: `Failed to fetch ${mode} questions` });
  }
}

// Transitional alias: old easy route kept until the unified route is verified.
app.get('/api/questions/easy', async (req, res) => {
  await sendQuestions('easy', res);
});

// Unified mode-validated question endpoint.
app.get('/api/questions/:mode', async (req, res) => {
  await sendQuestions(req.params.mode, res);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});