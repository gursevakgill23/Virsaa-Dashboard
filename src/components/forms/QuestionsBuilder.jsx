/**
 * QuestionsBuilder — visual editor for quiz questions.
 * Each question has text, 2–6 options, one correct option and an optional
 * explanation shown to students after they answer.
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

  /** Immutably updates one question. */
  const updateQuestion = (index, patch) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const updateOption = (qIndex, oIndex, text) =>
    updateQuestion(qIndex, {
      options: questions[qIndex].options.map((o, i) => (i === oIndex ? text : o)),
    });

  const addOption = (qIndex) => {
    const q = questions[qIndex];
    if (q.options.length < MAX_OPTIONS) updateQuestion(qIndex, { options: [...q.options, ''] });
  };

  const removeOption = (qIndex, oIndex) => {
    const q = questions[qIndex];
    if (q.options.length <= MIN_OPTIONS) return;
    const options = q.options.filter((_, i) => i !== oIndex);
    // Keep the correct answer pointing at the same option after removal.
    let correct = q.correct_option;
    if (oIndex === correct) correct = 0;
    else if (oIndex < correct) correct -= 1;
    updateQuestion(qIndex, { options, correct_option: correct });
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index) => onChange(questions.filter((_, i) => i !== index));

  const add = () => {
    if (questions.length < MAX_QUESTIONS) onChange([...questions, createEmptyQuestion()]);
  };

  return (
    <div className={styles.questions}>
      {questions.map((q, qIndex) => (
        <fieldset key={qIndex} className={styles.questionCard} disabled={disabled}>
          <legend className="sr-only">Question {qIndex + 1}</legend>

          <div className={styles.questionHead}>
            <span className={styles.questionLegend} aria-hidden="true">
              Question {qIndex + 1}
            </span>
            <div className={styles.questionTools}>
              <button type="button" onClick={() => move(qIndex, -1)} disabled={qIndex === 0} aria-label="Move question up">
                <FaArrowUp />
              </button>
              <button
                type="button"
                onClick={() => move(qIndex, 1)}
                disabled={qIndex === questions.length - 1}
                aria-label="Move question down"
              >
                <FaArrowDown />
              </button>
              <button type="button" onClick={() => remove(qIndex)} disabled={questions.length === 1} aria-label="Delete question">
                <FaTrashAlt />
              </button>
            </div>
          </div>

          <textarea
            className={styles.input}
            rows={2}
            placeholder="Type the question…"
            value={q.question}
            maxLength={1000}
            onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
            aria-label={`Question ${qIndex + 1} text`}
          />

          <p className={styles.optionsHint}>Tap the circle to mark the correct answer.</p>
          <ul className={styles.options}>
            {q.options.map((option, oIndex) => {
              const isCorrect = q.correct_option === oIndex;
              return (
                <li key={oIndex} className={`${styles.option} ${isCorrect ? styles.optionCorrect : ''}`}>
                  <button
                    type="button"
                    className={styles.correctToggle}
                    onClick={() => updateQuestion(qIndex, { correct_option: oIndex })}
                    aria-pressed={isCorrect}
                    aria-label={`Mark option ${LETTERS[oIndex]} as correct`}
                  >
                    {isCorrect ? <FaCheckCircle /> : LETTERS[oIndex]}
                  </button>
                  <input
                    className={styles.optionInput}
                    value={option}
                    maxLength={300}
                    placeholder={`Option ${LETTERS[oIndex]}`}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    aria-label={`Question ${qIndex + 1} option ${LETTERS[oIndex]}`}
                  />
                  {q.options.length > MIN_OPTIONS && (
                    <button
                      type="button"
                      className={styles.optionRemove}
                      onClick={() => removeOption(qIndex, oIndex)}
                      aria-label={`Remove option ${LETTERS[oIndex]}`}
                    >
                      <FaTimesSmall />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {q.options.length < MAX_OPTIONS && (
            <button type="button" className={styles.linkButton} onClick={() => addOption(qIndex)}>
              <FaPlus aria-hidden="true" /> Add option
            </button>
          )}

          <textarea
            className={styles.input}
            rows={2}
            placeholder="Explanation shown after answering (optional)"
            value={q.explanation}
            maxLength={2000}
            onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
            aria-label={`Question ${qIndex + 1} explanation`}
          />
        </fieldset>
      ))}

      <button type="button" className={styles.addQuestion} onClick={add} disabled={disabled || questions.length >= MAX_QUESTIONS}>
        <FaPlus aria-hidden="true" /> Add question
        <small>
          {questions.length} / {MAX_QUESTIONS}
        </small>
      </button>
    </div>
  );
};

/** Small "×" glyph so the remove button stays compact. */
const FaTimesSmall = () => <span aria-hidden="true">×</span>;

export default QuestionsBuilder;
