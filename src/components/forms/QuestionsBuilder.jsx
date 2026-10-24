/**
 * QuestionsBuilder — visual editor for quiz questions, in the API's shape:
 *   { text, points, explanation, options: [{ text, is_correct }] }
 * 2–6 answers per question; tap an answer's circle to mark it right.
 * Saving sends the whole list, which replaces the quiz's questions.
 */
import React from 'react';
import { FaPlus, FaTrashAlt, FaArrowUp, FaArrowDown, FaCheckCircle } from 'react-icons/fa';
import { createEmptyQuestion } from '../../utils/contentForm';
import styles from './Form.module.css';

const MAX_QUESTIONS = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const LETTERS = 'ABCDEF';

const QuestionsBuilder = ({ value, onChange, disabled }) => {
  const questions = Array.isArray(value) ? value : [];

  const updateQuestion = (index, patch) => onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const setOptionText = (qi, oi, text) =>
    updateQuestion(qi, { options: questions[qi].options.map((o, i) => (i === oi ? { ...o, text } : o)) });

  /** One right answer per question: marking one unmarks the others. */
  const markCorrect = (qi, oi) =>
    updateQuestion(qi, { options: questions[qi].options.map((o, i) => ({ ...o, is_correct: i === oi })) });

  const addOption = (qi) => {
    const q = questions[qi];
    if (q.options.length < MAX_OPTIONS) updateQuestion(qi, { options: [...q.options, { text: '', is_correct: false }] });
  };

  const removeOption = (qi, oi) => {
    const q = questions[qi];
    if (q.options.length <= MIN_OPTIONS) return;
    const options = q.options.filter((_, i) => i !== oi);
    // Keep one answer marked right after removing the marked one
    if (!options.some((o) => o.is_correct)) options[0] = { ...options[0], is_correct: true };
    updateQuestion(qi, { options });
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const next = questions.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className={styles.questions}>
      {questions.map((q, qi) => (
        <fieldset key={qi} className={styles.questionCard} disabled={disabled}>
          <legend className="sr-only">Question {qi + 1}</legend>

          <div className={styles.questionHead}>
            <span className={styles.questionLegend} aria-hidden="true">
              Question {qi + 1}
            </span>
            <div className={styles.questionTools}>
              <button type="button" onClick={() => move(qi, -1)} disabled={qi === 0} aria-label="Move question up">
                <FaArrowUp />
              </button>
              <button type="button" onClick={() => move(qi, 1)} disabled={qi === questions.length - 1} aria-label="Move question down">
                <FaArrowDown />
              </button>
              <button type="button" onClick={() => onChange(questions.filter((_, i) => i !== qi))} disabled={questions.length === 1} aria-label="Delete question">
                <FaTrashAlt />
              </button>
            </div>
          </div>

          <textarea
            className={styles.input}
            rows={2}
            placeholder="Type the question…"
            value={q.text}
            maxLength={1000}
            onChange={(e) => updateQuestion(qi, { text: e.target.value })}
            aria-label={`Question ${qi + 1} text`}
          />

          <p className={styles.optionsHint}>Tap the circle to mark the right answer.</p>
          <ul className={styles.options}>
            {q.options.map((option, oi) => (
              <li key={oi} className={`${styles.option} ${option.is_correct ? styles.optionCorrect : ''}`}>
                <button
                  type="button"
                  className={styles.correctToggle}
                  onClick={() => markCorrect(qi, oi)}
                  aria-pressed={option.is_correct}
                  aria-label={`Mark answer ${LETTERS[oi]} as right`}
                >
                  {option.is_correct ? <FaCheckCircle /> : LETTERS[oi]}
                </button>
                <input
                  className={styles.optionInput}
                  value={option.text}
                  maxLength={200}
                  placeholder={`Answer ${LETTERS[oi]}`}
                  onChange={(e) => setOptionText(qi, oi, e.target.value)}
                  aria-label={`Question ${qi + 1} answer ${LETTERS[oi]}`}
                />
                {q.options.length > MIN_OPTIONS && (
                  <button type="button" className={styles.optionRemove} onClick={() => removeOption(qi, oi)} aria-label={`Remove answer ${LETTERS[oi]}`}>
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {q.options.length < MAX_OPTIONS && (
            <button type="button" className={styles.linkButton} onClick={() => addOption(qi)}>
              <FaPlus aria-hidden="true" /> Add answer
            </button>
          )}

          <div className={styles.questionMeta}>
            <label className={styles.questionPoints}>
              Points
              <input
                type="number"
                min={1}
                step={1}
                className={styles.input}
                value={q.points}
                onChange={(e) => updateQuestion(qi, { points: e.target.value })}
              />
            </label>
            <textarea
              className={styles.input}
              rows={2}
              placeholder="Explanation shown after answering (optional)"
              value={q.explanation}
              maxLength={2000}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
              aria-label={`Question ${qi + 1} explanation`}
            />
          </div>
        </fieldset>
      ))}

      <button type="button" className={styles.addQuestion} onClick={() => onChange([...questions, createEmptyQuestion()])} disabled={disabled || questions.length >= MAX_QUESTIONS}>
        <FaPlus aria-hidden="true" /> Add question
        <small>
          {questions.length} / {MAX_QUESTIONS}
        </small>
      </button>
    </div>
  );
};

export default QuestionsBuilder;
