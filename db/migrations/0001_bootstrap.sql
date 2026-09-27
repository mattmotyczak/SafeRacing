-- db/migrations/0001_bootstrap.sql
-- SafeRacing bootstrap migration. Creates the full schema and seeds it, so it
-- runs green against an empty database as well as against the live instance.
--
-- 1. Creates all four tables (easy_questions / easy_answers /
--    hard_questions / hard_answers).
-- 2. Seeds the 5 easy questions + 20 answers verbatim from the local db_easy
--    array in src/App.tsx (non-destructive on existing easy data).
-- 3. Seeds the 5 hard questions + 20 answers verbatim from the local db_hard
--    array in src/App.tsx.
--
-- Idempotency: re-running this migration must produce identical state. DDL is
-- CREATE TABLE IF NOT EXISTS, so it is a no-op wherever the table already
-- exists. There is no unique constraint on the question text, so every insert
-- is guarded by a WHERE NOT EXISTS subquery (ON CONFLICT cannot be used
-- without a unique constraint).
--
-- Column names are lowercase and unquoted throughout: Postgres folds
-- unquoted identifiers to lowercase, and the live easy_* tables were created
-- that way. neondb_guide.txt shows a quoted CamelCase variant that was never
-- executed against this database — do not copy it.

-- ---------------------------------------------------------------------------
-- Schema: easy tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS easy_questions (
  ideasyquestion SERIAL PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  photostring TEXT
);

CREATE TABLE IF NOT EXISTS easy_answers (
  ideasyanswer SERIAL PRIMARY KEY,
  answer VARCHAR(255) NOT NULL,
  iscorrect BOOLEAN NOT NULL,
  relatedtoquestion INTEGER NOT NULL REFERENCES easy_questions(ideasyquestion)
);

-- ---------------------------------------------------------------------------
-- Schema: hard tables (same shape as the easy tables above)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hard_questions (
  idhardquestion SERIAL PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  photostring TEXT
);

CREATE TABLE IF NOT EXISTS hard_answers (
  idhardanswer SERIAL PRIMARY KEY,
  answer VARCHAR(255) NOT NULL,
  iscorrect BOOLEAN NOT NULL,
  relatedtoquestion INTEGER NOT NULL REFERENCES hard_questions(idhardquestion)
);

-- ---------------------------------------------------------------------------
-- Easy seed (verbatim from db_easy, including option order)
-- ---------------------------------------------------------------------------
--
-- The leading ordinal on every VALUES row is load-bearing, not decoration.
-- SERIAL assigns nextval() to each row as it reaches the insert, and
-- INSERT ... SELECT gives no ordering guarantee, so without ORDER BY the
-- primary keys -- and therefore the option order that server.js reconstructs
-- via ORDER BY <answer pk> -- land in whatever order the planner happens to
-- emit the scan. Pinning the order keeps a freshly seeded database identical
-- to the offline fallback in src/App.tsx.

INSERT INTO easy_questions (question, photostring)
SELECT v.question, NULL
FROM (VALUES
  (1, '¿Qué significa la bandera roja?'),
  (2, '¿Cuál es el color de la bandera de salida?'),
  (3, '¿Qué debe hacer un piloto ante bandera amarilla?'),
  (4, '¿Dónde se detienen los autos para cambiar llantas?'),
  (5, '¿Cuántos pilotos hay en un auto de F1?')
) AS v(ord, question)
WHERE NOT EXISTS (
  SELECT 1 FROM easy_questions e WHERE e.question = v.question
)
ORDER BY v.ord;

INSERT INTO easy_answers (answer, iscorrect, relatedtoquestion)
SELECT v.answer, v.iscorrect, q.ideasyquestion
FROM (VALUES
  ( 1, '¿Qué significa la bandera roja?', 'Peligro, detener carrera', TRUE),
  ( 2, '¿Qué significa la bandera roja?', 'Última vuelta', FALSE),
  ( 3, '¿Qué significa la bandera roja?', 'Entrada a pits', FALSE),
  ( 4, '¿Qué significa la bandera roja?', 'Carrera terminada', FALSE),
  ( 5, '¿Cuál es el color de la bandera de salida?', 'Roja', FALSE),
  ( 6, '¿Cuál es el color de la bandera de salida?', 'Verde', TRUE),
  ( 7, '¿Cuál es el color de la bandera de salida?', 'Cuadros', FALSE),
  ( 8, '¿Cuál es el color de la bandera de salida?', 'Amarilla', FALSE),
  ( 9, '¿Qué debe hacer un piloto ante bandera amarilla?', 'Acelerando', FALSE),
  (10, '¿Qué debe hacer un piloto ante bandera amarilla?', 'Reducir velocidad y no rebasar', TRUE),
  (11, '¿Qué debe hacer un piloto ante bandera amarilla?', 'Ir a pits', FALSE),
  (12, '¿Qué debe hacer un piloto ante bandera amarilla?', 'Detener el auto inmediatamente', FALSE),
  (13, '¿Dónde se detienen los autos para cambiar llantas?', 'En la pista', FALSE),
  (14, '¿Dónde se detienen los autos para cambiar llantas?', 'En el garaje', FALSE),
  (15, '¿Dónde se detienen los autos para cambiar llantas?', 'En los pits', TRUE),
  (16, '¿Dónde se detienen los autos para cambiar llantas?', 'En la meta', FALSE),
  (17, '¿Cuántos pilotos hay en un auto de F1?', 'Dos', FALSE),
  (18, '¿Cuántos pilotos hay en un auto de F1?', 'Uno', TRUE),
  (19, '¿Cuántos pilotos hay en un auto de F1?', 'Cuatro', FALSE),
  (20, '¿Cuántos pilotos hay en un auto de F1?', 'Tres', FALSE)
) AS v(ord, question, answer, iscorrect)
JOIN easy_questions q ON q.question = v.question
WHERE NOT EXISTS (
  SELECT 1 FROM easy_answers ea
  WHERE ea.answer = v.answer AND ea.relatedtoquestion = q.ideasyquestion
)
ORDER BY v.ord;

-- ---------------------------------------------------------------------------
-- Hard seed (verbatim from db_hard, including option order)
-- ---------------------------------------------------------------------------

INSERT INTO hard_questions (question, photostring)
SELECT v.question, NULL
FROM (VALUES
  (1, '¿Cuál es el límite de velocidad en el Pit Lane (estándar)?'),
  (2, '¿Qué sistema permite reducir la carga aerodinámica en rectas?'),
  (3, '¿Cuántos puntos recibe el ganador de un GP?'),
  (4, '¿Qué neumático es el más blando en la gama actual?'),
  (5, '¿Quién ostenta el récord de más campeonatos del mundo?')
) AS v(ord, question)
WHERE NOT EXISTS (
  SELECT 1 FROM hard_questions h WHERE h.question = v.question
)
ORDER BY v.ord;

INSERT INTO hard_answers (answer, iscorrect, relatedtoquestion)
SELECT v.answer, v.iscorrect, q.idhardquestion
FROM (VALUES
  ( 1, '¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '60 km/h', FALSE),
  ( 2, '¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '80 km/h', TRUE),
  ( 3, '¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '100 km/h', FALSE),
  ( 4, '¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '50 km/h', FALSE),
  ( 5, '¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'ERS', FALSE),
  ( 6, '¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'KERS', FALSE),
  ( 7, '¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'DRS', TRUE),
  ( 8, '¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'DAS', FALSE),
  ( 9, '¿Cuántos puntos recibe el ganador de un GP?', '20', FALSE),
  (10, '¿Cuántos puntos recibe el ganador de un GP?', '15', FALSE),
  (11, '¿Cuántos puntos recibe el ganador de un GP?', '25', TRUE),
  (12, '¿Cuántos puntos recibe el ganador de un GP?', '10', FALSE),
  (13, '¿Qué neumático es el más blando en la gama actual?', 'C1', FALSE),
  (14, '¿Qué neumático es el más blando en la gama actual?', 'C3', FALSE),
  (15, '¿Qué neumático es el más blando en la gama actual?', 'C5', TRUE),
  (16, '¿Qué neumático es el más blando en la gama actual?', 'C2', FALSE),
  (17, '¿Quién ostenta el récord de más campeonatos del mundo?', 'Hamilton / Schumacher', TRUE),
  (18, '¿Quién ostenta el récord de más campeonatos del mundo?', 'Vettel', FALSE),
  (19, '¿Quién ostenta el récord de más campeonatos del mundo?', 'Senna', FALSE),
  (20, '¿Quién ostenta el récord de más campeonatos del mundo?', 'Prost', FALSE)
) AS v(ord, question, answer, iscorrect)
JOIN hard_questions q ON q.question = v.question
WHERE NOT EXISTS (
  SELECT 1 FROM hard_answers ha
  WHERE ha.answer = v.answer AND ha.relatedtoquestion = q.idhardquestion
)
ORDER BY v.ord;
