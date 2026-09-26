-- db/migrations/0001_bootstrap.sql
-- SafeRacing bootstrap migration.
--
-- 1. Creates the hard mirror-schema tables (hard_questions / hard_answers).
-- 2. Remediation seed: re-seeds the 5 easy questions + 20 answers verbatim
--    from the local db_easy array in src/App.tsx (non-destructive on existing
--    easy_questions / easy_answers data).
-- 3. Seeds the 5 hard questions + 20 answers verbatim from the local db_hard
--    array in src/App.tsx.
--
-- Idempotency: re-running this migration must produce identical state. There
-- is no unique constraint on the question text, so every insert is guarded by
-- a WHERE NOT EXISTS subquery (ON CONFLICT cannot be used without a unique
-- constraint).

-- ---------------------------------------------------------------------------
-- Schema: hard mirror tables (same shape as the live easy tables)
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
-- Easy remediation seed (verbatim from db_easy)
-- ---------------------------------------------------------------------------

INSERT INTO easy_questions (question, photostring)
SELECT v.question, NULL
FROM (VALUES
  ('¿Qué significa la bandera roja?'),
  ('¿Cuál es el color de la bandera de salida?'),
  ('¿Qué debe hacer un piloto ante bandera amarilla?'),
  ('¿Dónde se detienen los autos para cambiar llantas?'),
  ('¿Cuántos pilotos hay en un auto de F1?')
) AS v(question)
WHERE NOT EXISTS (
  SELECT 1 FROM easy_questions e WHERE e.question = v.question
);

INSERT INTO easy_answers (answer, iscorrect, relatedtoquestion)
SELECT v.answer, v.iscorrect, q.ideasyquestion
FROM (VALUES
  ('¿Qué significa la bandera roja?', 'Peligro, detener carrera', TRUE),
  ('¿Qué significa la bandera roja?', 'Última vuelta', FALSE),
  ('¿Qué significa la bandera roja?', 'Entrada a pits', FALSE),
  ('¿Qué significa la bandera roja?', 'Carrera terminada', FALSE),
  ('¿Cuál es el color de la bandera de salida?', 'Roja', FALSE),
  ('¿Cuál es el color de la bandera de salida?', 'Verde', TRUE),
  ('¿Cuál es el color de la bandera de salida?', 'Cuadros', FALSE),
  ('¿Cuál es el color de la bandera de salida?', 'Amarilla', FALSE),
  ('¿Qué debe hacer un piloto ante bandera amarilla?', 'Acelerando', FALSE),
  ('¿Qué debe hacer un piloto ante bandera amarilla?', 'Reducir velocidad y no rebasar', TRUE),
  ('¿Qué debe hacer un piloto ante bandera amarilla?', 'Ir a pits', FALSE),
  ('¿Qué debe hacer un piloto ante bandera amarilla?', 'Detener el auto inmediatamente', FALSE),
  ('¿Dónde se detienen los autos para cambiar llantas?', 'En la pista', FALSE),
  ('¿Dónde se detienen los autos para cambiar llantas?', 'En el garaje', FALSE),
  ('¿Dónde se detienen los autos para cambiar llantas?', 'En los pits', TRUE),
  ('¿Dónde se detienen los autos para cambiar llantas?', 'En la meta', FALSE),
  ('¿Cuántos pilotos hay en un auto de F1?', 'Dos', FALSE),
  ('¿Cuántos pilotos hay en un auto de F1?', 'Uno', TRUE),
  ('¿Cuántos pilotos hay en un auto de F1?', 'Cuatro', FALSE),
  ('¿Cuántos pilotos hay en un auto de F1?', 'Tres', FALSE)
) AS v(question, answer, iscorrect)
JOIN easy_questions q ON q.question = v.question
WHERE NOT EXISTS (
  SELECT 1 FROM easy_answers ea
  WHERE ea.answer = v.answer AND ea.relatedtoquestion = q.ideasyquestion
);

-- ---------------------------------------------------------------------------
-- Hard seed (verbatim from db_hard)
-- ---------------------------------------------------------------------------

INSERT INTO hard_questions (question, photostring)
SELECT v.question, NULL
FROM (VALUES
  ('¿Cuál es el límite de velocidad en el Pit Lane (estándar)?'),
  ('¿Qué sistema permite reducir la carga aerodinámica en rectas?'),
  ('¿Cuántos puntos recibe el ganador de un GP?'),
  ('¿Qué neumático es el más blando en la gama actual?'),
  ('¿Quién ostenta el récord de más campeonatos del mundo?')
) AS v(question)
WHERE NOT EXISTS (
  SELECT 1 FROM hard_questions h WHERE h.question = v.question
);

INSERT INTO hard_answers (answer, iscorrect, relatedtoquestion)
SELECT v.answer, v.iscorrect, q.idhardquestion
FROM (VALUES
  ('¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '60 km/h', FALSE),
  ('¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '80 km/h', TRUE),
  ('¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '100 km/h', FALSE),
  ('¿Cuál es el límite de velocidad en el Pit Lane (estándar)?', '50 km/h', FALSE),
  ('¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'ERS', FALSE),
  ('¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'KERS', FALSE),
  ('¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'DRS', TRUE),
  ('¿Qué sistema permite reducir la carga aerodinámica en rectas?', 'DAS', FALSE),
  ('¿Cuántos puntos recibe el ganador de un GP?', '20', FALSE),
  ('¿Cuántos puntos recibe el ganador de un GP?', '15', FALSE),
  ('¿Cuántos puntos recibe el ganador de un GP?', '25', TRUE),
  ('¿Cuántos puntos recibe el ganador de un GP?', '10', FALSE),
  ('¿Qué neumático es el más blando en la gama actual?', 'C1', FALSE),
  ('¿Qué neumático es el más blando en la gama actual?', 'C3', FALSE),
  ('¿Qué neumático es el más blando en la gama actual?', 'C5', TRUE),
  ('¿Qué neumático es el más blando en la gama actual?', 'C2', FALSE),
  ('¿Quién ostenta el récord de más campeonatos del mundo?', 'Hamilton / Schumacher', TRUE),
  ('¿Quién ostenta el récord de más campeonatos del mundo?', 'Vettel', FALSE),
  ('¿Quién ostenta el récord de más campeonatos del mundo?', 'Senna', FALSE),
  ('¿Quién ostenta el récord de más campeonatos del mundo?', 'Prost', FALSE)
) AS v(question, answer, iscorrect)
JOIN hard_questions q ON q.question = v.question
WHERE NOT EXISTS (
  SELECT 1 FROM hard_answers ha
  WHERE ha.answer = v.answer AND ha.relatedtoquestion = q.idhardquestion
);