import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../api/AuthContext';
import { useContext } from 'react';

// Типы
interface Author {
  firstName: string;
  lastName: string;
}

interface Option {
  id: number;
  optionText: string;
  order: number;
}

export interface Question {
  id: number;
  text: string;
  questionTypeId: number;
  options?: Option[];
  leftScaleValue?: string;
  rightScaleValue?: string;
  divisions?: number;
}

interface QuestionnaireData {
  title: string;
  questions: Question[];
  author: Author;
}

export type AnswerValue = string | number | number[] | null;

export interface ValidationErrors {
  [key: number]: string;
}

interface AnswersLogicState {
  author: Author;
  ansTitle: string;
  questions: Question[];
  answers: { [key: number]: AnswerValue };
  isLoading: boolean;
  apiError: string;
  validationErrors: ValidationErrors;
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
}

interface AnswersLogicActions {
  handleSubmit: () => void;
  handleInputChange: (questionId: number, value: AnswerValue) => void;
  handleCheckboxChange: (questionId: number, optionId: number) => void;
  setLoginModalOpen: (open: boolean) => void;
  setRegisterModalOpen: (open: boolean) => void;
  submitAnswers: () => Promise<void>;
  validateAnswers: () => boolean;
}

export const useAnswersLogic = (): [AnswersLogicState, AnswersLogicActions] => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [author, setAuthor] = useState<Author>({ firstName: '', lastName: '' });
  const [ansTitle, setAnsTitle] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: AnswerValue }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isLoginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      setIsLoading(true);
      setApiError('');
      setValidationErrors({});
      try {
        const response = await axios.get<QuestionnaireData>(
          `https://localhost:7109/questionnaire/access/${id}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          }
        );

        const { title, questions: fetchedQuestions, author: fetchedAuthor } = response.data;

        if (!fetchedQuestions || !Array.isArray(fetchedQuestions)) {
          console.error('Данные вопросов отсутствуют или имеют неверный формат:', response.data);
          setApiError('Не удалось загрузить структуру анкеты.');
          return;
        }

        setAuthor(fetchedAuthor || { firstName: '', lastName: '' });

        const processedQuestions = fetchedQuestions.map((q) => {
          if (q.questionTypeId === 4) {
            const parts = q.text.split('|');
            if (parts.length < 4) {
              return {
                ...q,
                text: parts[0] || q.text,
                leftScaleValue: 'Min',
                rightScaleValue: 'Max',
                divisions: 5,
              };
            }
            return {
              ...q,
              text: parts[0] || '',
              leftScaleValue: parts[1] || '',
              rightScaleValue: parts[2] || '',
              divisions: parseInt(parts[3], 10) || 5,
            };
          }
          return q;
        });

        setAnsTitle(title);
        setQuestions(processedQuestions);

        const initialAnswers: { [key: number]: AnswerValue } = {};
        processedQuestions.forEach((q) => {
          if (q.questionTypeId === 3) {
            initialAnswers[q.id] = [];
          } else if (q.questionTypeId === 4) {
            const divisions = q.divisions || 5;
            initialAnswers[q.id] = Math.ceil(divisions / 2);
          } else {
            initialAnswers[q.id] = '';
          }
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        console.error('Ошибка при загрузке анкеты:', err.response?.data || err.message);
        if (err.response?.status === 404) {
          setApiError('Анкета закрыта или была удалена');

        } else if (err.response?.status === 401 || err.response?.status === 403) {
          setApiError('Доступ запрещен. Возможно, вам нужно войти в систему.');
        } else {
          setApiError('Произошла ошибка при загрузке анкеты.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchQuestionnaire();
  }, [id]);

  const validateAnswers = (): boolean => {
    const errors: ValidationErrors = {};
    let firstErrorId: number | null = null;

    for (const question of questions) {
      const answer = answers[question.id];
      let isEmpty = false;
      let errorMsg = 'Пожалуйста, ответьте на этот вопрос';
      const questionType = parseInt(question.questionTypeId.toString(), 10);

      switch (questionType) {
        case 1:
          isEmpty = !answer || !String(answer).trim();
          errorMsg = 'Пожалуйста, заполните это поле';
          break;
        case 2:
          isEmpty = answer === '' || answer === null || answer === undefined;
          errorMsg = 'Пожалуйста, выберите один вариант';
          break;
        case 3:
          isEmpty = !Array.isArray(answer) || answer.length === 0;
          errorMsg = 'Пожалуйста, выберите хотя бы один вариант';
          break;
        case 4:
          isEmpty = isNaN(parseInt(answer as string, 10));
          errorMsg = 'Пожалуйста, выберите значение на шкале';
          break;
        case 5:
          isEmpty = answer === '' || answer === null || answer === undefined;
          errorMsg = 'Пожалуйста, выберите один вариант из списка';
          break;
        default:
          break;
      }

      if (isEmpty) {
        errors[question.id] = errorMsg;
        if (firstErrorId === null) firstErrorId = question.id;
      }
    }

    setValidationErrors(errors);

    if (firstErrorId !== null) {
      const element = document.getElementById(`question-${firstErrorId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(errors).length === 0;
  };

  const submitAnswers = async () => {
    setApiError('');
    setValidationErrors({});
    if (!validateAnswers()) return;
    setIsLoading(true);

    try {
      for (const question of questions) {
        const answer = answers[question.id];
        let payload: { [key: string]: any } | null = null;
        const questionType = parseInt(question.questionTypeId.toString(), 10);

        switch (questionType) {
          case 1:
            payload = { AnswerText: String(answer).trim() };
            break;
          case 2:
            const selectedSingle = question.options?.find((opt) => opt.id === parseInt(answer as string, 10));
            if (!selectedSingle) throw new Error(`Invalid option for question ${question.id}`);
            payload = { AnswerClose: selectedSingle.order };
            break;
          case 3:
            if (!Array.isArray(answer)) throw new Error(`Invalid answer format for question ${question.id}`);
            const orders = answer
              .map((id) => question.options?.find((opt) => opt.id === id)?.order)
              .filter((order): order is number => order !== undefined);
            if (orders.length !== answer.length) throw new Error(`Invalid options in multi-select for ${question.id}`);
            payload = { AnswerMultiple: orders };
            break;
          case 4:
            const scaleValue = parseInt(answer as string, 10);
            if (isNaN(scaleValue) || scaleValue < 1 || scaleValue > (question.divisions || 5))
              throw new Error(`Invalid scale value for question ${question.id}`);
            payload = { AnswerScale: scaleValue };
            break;
          case 5:
            const dropdownValue = parseInt(answer as string, 10);
            if (isNaN(dropdownValue) || answer === '') throw new Error(`No option selected for dropdown ${question.id}`);
            payload = { AnswerClose: dropdownValue };
            break;
          default:
            continue;
        }

        if (payload) {
          await axios.post(
            `https://localhost:7109/questionnaire/access/${id}/questions/${question.id}/answer`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }

      navigate('/Thanks', { state: { questionnaireId: id } });
    } catch (err: any) {
      console.error('Ошибка при отправке ответов:', err);
      if (err.response?.status === 404) {
        setApiError('Не удалось отправить ответ. Возможно, анкета была закрыта или удалена.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setApiError('Ошибка прав доступа при отправке ответов.');
      } else {
        setApiError('Произошла непредвиденная ошибка при отправке ответов.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    submitAnswers();
  };

  const handleInputChange = (questionId: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (validationErrors[questionId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (questionId: number, optionId: number) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as number[]) || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
    if (validationErrors[questionId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  return [
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
      submitAnswers,
      validateAnswers,
      handleInputChange,
      handleCheckboxChange,
      setLoginModalOpen,
      setRegisterModalOpen,
    },
  ];
};
