import React from 'react';
import './Answers.css';
import { useAnswersLogic } from './useAnswersLogic';

import { Question, AnswerValue, ValidationErrors } from './useAnswersLogic';

const AnswersPage: React.FC = () => {
  const [
    {
      author,
      ansTitle,
      questions,
      answers,
      isLoading,
      apiError,
      validationErrors,
      isLoginModalOpen,
      isRegisterModalOpen,
    },
    {
      handleSubmit,
      handleInputChange,
      handleCheckboxChange,
      setLoginModalOpen,
      setRegisterModalOpen,
    },
  ] = useAnswersLogic();

  const renderQuestionInput = (question: Question) => {
    const hasError = !!validationErrors[question.id];
    const errorMessage = validationErrors[question.id];
    const questionType = parseInt(question.questionTypeId.toString(), 10);

    switch (questionType) {
      case 1:
        return (
          <div className={`otv-title ${hasError ? 'error' : ''}`}>
            <span>{question.text}</span>
            <input
              type="text"
              value={(answers[question.id] as string) || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              aria-invalid={hasError}
            />
            {hasError && <p className="inline-error">{errorMessage}</p>}
          </div>
        );

      case 2:
        return (
          <div className={`rad-title ${hasError ? 'error' : ''}`}>
            <span>{question.text}</span>
            {(question.options || []).map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => handleInputChange(question.id, option.id)}
                  aria-invalid={hasError}
                />
                {option.optionText}
              </label>
            ))}
            {hasError && <p className="inline-error">{errorMessage}</p>}
          </div>
        );

      case 3:
        return (
          <div className={`checkbox-title ${hasError ? 'error' : ''}`}>
            <span className="text-qw">{question.text}</span>
            {(question.options || []).map((option) => (
              <label key={option.id} className="custom-checkbox">
                <input
                  type="checkbox"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={((answers[question.id] as number[]) || []).includes(option.id)}
                  onChange={() => handleCheckboxChange(question.id, option.id)}
                  aria-invalid={hasError}
                />
                <span>{option.optionText}</span>
              </label>
            ))}
            {hasError && <p className="inline-error">{errorMessage}</p>}
          </div>
        );

      case 4:
        const divisions = question.divisions || 5;
        let currentValue = parseInt(answers[question.id] as string, 10);
        if (isNaN(currentValue) || currentValue < 1 || currentValue > divisions) {
          currentValue = Math.ceil(divisions / 2); // значение по умолчанию
        }

        return (
          <div className={`slider-title ${hasError ? 'error' : ''}`}>
            <div className="scale-title">
              <span className="text-slider">{question.text}</span>
              <div className="scale-endpoints">
                <p className="scale-endpoint-left">{question.leftScaleValue || 'Минимум'}</p>
                <p className="scale-endpoint-right">{question.rightScaleValue || 'Максимум'}</p>
              </div>

              <div
                className="scale-grid">
                {Array.from({ length: divisions }, (_, i) => {
                  const value = i + 1;
                  const isActive = currentValue === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`scale-button ${isActive ? 'active' : ''}`}
                      onClick={() => handleInputChange(question.id, value)}
                      aria-pressed={isActive}

                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
            {hasError && <p className="inline-error">{errorMessage}</p>}
          </div>
        );

      case 5:
        return (
          <div className={`select-title ${hasError ? 'error' : ''}`}>
            <span>{question.text}</span>
            <select
              value={(answers[question.id] as string) || ''}
              onChange={(e) => handleInputChange(question.id, parseInt(e.target.value, 10))}
              aria-invalid={hasError}
              className="dropdown-select"
            >
              <option value="" disabled>
                -- Выберите вариант --
              </option>
              {(question.options || []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.optionText}
                </option>
              ))}
            </select>
            {hasError && <p className="inline-error">{errorMessage}</p>}
          </div>
        );

      default:
        return <div key={question.id}>Неизвестный тип вопроса: {question.questionTypeId}</div>;
    }
  };

  if (isLoading && !questions.length && !apiError) {
    return <div className="loading-indicator">Загрузка анкеты...</div>;
  }

  if (apiError && !isLoading && questions.length === 0) {
    return (
      <div className="ans-page-vh">
        <div className="ans-page">
          <div className="error-message-answers">{apiError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ans-page-vh">
      <div className="ans-page">
        {apiError && <div className="error-message-answers api-error-top">{apiError}</div>}
        {questions.length > 0 && (
          <>
            <div className="answers-title">
              <span className="ans-title">{ansTitle}</span>
            </div>
            <div className='Test'>

              {questions.map((question) => (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  className={`question-block question-type-${question.questionTypeId}${validationErrors[question.id] ? ' has-error' : ''
                    }`}
                  role="group"
                >
                  {renderQuestionInput(question)}
                </div>
              ))}

            </div>
            <div className="ButtonSaveContainerAnswers">
              <button
                className="ButtonSaveAnswers"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Отправка...' : 'ОТПРАВИТЬ'}
              </button>
            </div>
          </>
        )}
        {!isLoading && questions.length === 0 && !apiError && (
          <div className="no-questions-message">В этой анкете пока нет вопросов.</div>
        )}

      </div>
    </div>

  );
};

export default AnswersPage;