import { Questionnaire, Question, Answer, Attempt, AnswerGroup, UserAttempts } from "./types"; // типы нужно вынести в отдельный файл
import apiClient from '../../api/apiClient';
import ExcelJS from 'exceljs';

export const questionTypeTranslations: Record<string, string> = {
    radio: 'Один из списка',
    checkbox: 'Несколько из списка',
    select: 'Выпадающий список',
    scale: 'Шкала',
    text: 'Текстовый ответ',
    default: 'Неизвестный тип'
};

export const translateQuestionType = (type: string): string => {
    return questionTypeTranslations[type] || questionTypeTranslations.default;
};

export const sanitizeFilename = (name: string): string => {
    return name.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
};

export const fetchQuestionnaireData = async (id: string) => {
    try {
        const response = await apiClient.get(`/questionnaire/${id}`);
        return response.data;
    } catch (error) {
        console.error("Ошибка загрузки анкеты:", error);
        throw new Error("Не удалось загрузить данные анкеты");
    }
};

export const processQuestionnaireAnswers = (questionnaire: Questionnaire): Attempt[] => {
    if (!questionnaire?.questions) return [];
    
    let allAnswersRaw: {
        userId: string;
        userName: string;
        isAnonymous: boolean;
        questionId: string;
        questionRealId?: string;
        questionText: string;
        questionType: string;
        answerText: string;
        createdAt: Date;
    }[] = [];

    questionnaire.questions.forEach((question) => {
        const questionIdentifier = question.id ?? question.text;
        const questionType = question.type || 'unknown';
        
        if (question.answers?.length) {
            question.answers.forEach((answer) => {
                let currentAnswerText = answer.selectedOptionText ?? answer.text;
                if (currentAnswerText === null || currentAnswerText === undefined || String(currentAnswerText).trim() === '') {
                    return;
                }
                
                currentAnswerText = String(currentAnswerText);
                allAnswersRaw.push({
                    userId: answer.userId || `anonymous_${Date.now()}_${Math.random()}`,
                    userName: answer.isAnonymous ? "Анонимный пользователь" : (answer.userName || "Пользователь"),
                    isAnonymous: !!answer.isAnonymous,
                    questionId: questionIdentifier,
                    questionRealId: question.id,
                    questionText: question.text,
                    questionType: questionType,
                    answerText: currentAnswerText,
                    createdAt: new Date(answer.createdAt),
                });
            });
        }
    });

    if (allAnswersRaw.length === 0) return [];

    allAnswersRaw.sort((a, b) => {
        if (a.userId < b.userId) return -1;
        if (a.userId > b.userId) return 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const attempts: Attempt[] = [];
    let currentAttempt: Attempt | null = null;
    let questionsAnsweredInCurrentAttempt = new Set<string>();

    allAnswersRaw.forEach((answer) => {
        let startNewAttempt = false;
        const isCheckbox = answer.questionType === 'checkbox';

        if (!currentAttempt || answer.userId !== currentAttempt.userId) {
            startNewAttempt = true;
        } else {
            const alreadyAnswered = questionsAnsweredInCurrentAttempt.has(answer.questionId);
            if (alreadyAnswered && !isCheckbox) {
                startNewAttempt = true;
            }
        }

        if (startNewAttempt) {
            currentAttempt = {
                attemptId: `${answer.userId}-${answer.createdAt.getTime()}-${Math.random().toString(16).slice(2)}`,
                userId: answer.userId,
                userName: answer.userName,
                isAnonymous: answer.isAnonymous,
                startTime: answer.createdAt,
                answers: {},
                groupedAnswers: [],
                lastAnswerTimestamp: answer.createdAt.getTime(),
                attemptNumber: 0
            };
            attempts.push(currentAttempt);
            questionsAnsweredInCurrentAttempt = new Set();
        }

        if (currentAttempt) {
            questionsAnsweredInCurrentAttempt.add(answer.questionId);
            const questionId = answer.questionId;

            if (!currentAttempt.answers[questionId]) {
                currentAttempt.answers[questionId] = {
                    questionRealId: answer.questionRealId,
                    questionText: answer.questionText,
                    questionType: answer.questionType,
                    answerTexts: [answer.answerText],
                    firstAnswerTime: answer.createdAt.getTime()
                };
            } else {
                if (!currentAttempt.answers[questionId].answerTexts.includes(answer.answerText)) {
                    currentAttempt.answers[questionId].answerTexts.push(answer.answerText);
                }
            }

            currentAttempt.lastAnswerTimestamp = Math.max(
                currentAttempt.lastAnswerTimestamp,
                answer.createdAt.getTime()
            );
        }
    });

    const finalUserAttemptCounts: Record<string, number> = {};

    attempts.forEach(attempt => {
        attempt.groupedAnswers = Object.values(attempt.answers)
            .sort((a, b) => a.firstAnswerTime - b.firstAnswerTime);

        if (!finalUserAttemptCounts[attempt.userId]) {
            finalUserAttemptCounts[attempt.userId] = 0;
        }
        finalUserAttemptCounts[attempt.userId]++;
        attempt.attemptNumber = finalUserAttemptCounts[attempt.userId];
    });

    return attempts;
};

export const groupAttemptsByUser = (attemptsToGroup: Attempt[]): UserAttempts[] => {
    if (!attemptsToGroup || attemptsToGroup.length === 0) return [];
    const usersData: Record<string, UserAttempts> = {};

    attemptsToGroup.forEach(attempt => {
        if (!usersData[attempt.userId]) {
            usersData[attempt.userId] = {
                userId: attempt.userId,
                userName: attempt.userName,
                isAnonymous: attempt.isAnonymous,
                attempts: [],
                firstAttemptTime: attempt.startTime.getTime(),
                lastAttemptTime: attempt.lastAnswerTimestamp
            };
        }
        usersData[attempt.userId].attempts.push(attempt);
        usersData[attempt.userId].firstAttemptTime = Math.min(
            usersData[attempt.userId].firstAttemptTime,
            attempt.startTime.getTime()
        );
        usersData[attempt.userId].lastAttemptTime = Math.max(
            usersData[attempt.userId].lastAttemptTime,
            attempt.lastAnswerTimestamp
        );
    });

    let usersArray = Object.values(usersData);
    usersArray.sort((a, b) => b.lastAttemptTime - a.lastAttemptTime);
    usersArray.forEach(user => {
        user.attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);
    });

    return usersArray;
};

export const exportToExcel = async (questionnaire: Questionnaire, allAttempts: Attempt[], id: string) => {
    if (!questionnaire || !allAttempts || allAttempts.length === 0) {
        throw new Error("Нет данных для экспорта");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AnketaApp';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Лист с вопросами
    const ws_questions = workbook.addWorksheet("Вопросы и опции");
    ws_questions.columns = [
        { header: 'Текст вопроса', key: 'text', width: 60 },
        { header: 'Тип вопроса', key: 'type', width: 20 },
        { header: 'Варианты / Детали шкалы', key: 'options', width: 70 }
    ];
    ws_questions.getRow(1).font = { bold: true };

    questionnaire.questions.forEach(q => {
        let optionsText = "";
        const choiceTypes = ["radio", "checkbox", "select"];

        if (choiceTypes.includes(q.type)) {
            optionsText = q.options?.map(o => o.optionText).join(", ") || "Нет опций";
        } else if (q.type === "scale") {
            const scaleAnswer = q.answers?.find(a => a.text?.includes('|'));
            const scaleParts = scaleAnswer?.text?.split('|') || q.text?.split('|');
            optionsText = scaleParts?.length >= 3 ?
                `Лево: ${scaleParts[1] || "?"} | Право: ${scaleParts[2] || "?"} | Делений: ${scaleParts[3] || "?"}` :
                "(Детали шкалы не найдены)";
        } else if (q.type === "text") {
            optionsText = "(Открытый ответ)";
        } else {
            optionsText = `(Тип: ${q.type})`;
        }

        ws_questions.addRow({
            text: q.text,
            type: translateQuestionType(q.type),
            options: optionsText
        });
    });

    ws_questions.eachRow({ includeEmpty: false }, function (row) {
        row.alignment = { vertical: 'top', wrapText: true };
    });

    // ... остальная логика экспорта в Excel (аналогично вашему коду)

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = sanitizeFilename(`Анализ_Данных_${questionnaire.title || `Анкета_${id}`}.xlsx`);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    return { blob, filename };
};














import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    fetchQuestionnaireData, 
    processQuestionnaireAnswers, 
    groupAttemptsByUser, 
    exportToExcel,
    translateQuestionType,
    questionTypeTranslations
} from "./AnalysisLogic";
import "./analysis.css";
import GraphComponent from "./GraphComponent";
import ButtonMenuComponent from '../../component/ButtonMenu/ButtonMenuComponent';
import ModalLink from '../../component/modal/modalLink';
import SendIcon from '../../img/SurveyPage/SendIcon.png';
import DeleteAnketaIcon from '../../img/SurveyPage/DeleteAnketaIcon.png';
import EyeIcon from '../../img/SurveyPage/EyeIcon.png';
import StatisticIcon from '../../img/SurveyPage/StatisticIcon.png';
import DiagrammIcon from '../../img/analysis/DiagrammIcon.png';
import AnswersIcon from '../../img/analysis/AnswersIcon.png';
import { Questionnaire, Attempt, UserAttempts } from "./types";

const LoadingSpinner: React.FC = () => {
    return (
        <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p>Загрузка данных...</p>
        </div>
    );
};

const AnalysisPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
    const [expandedAttempts, setExpandedAttempts] = useState<Record<string, boolean>>({});
    const [createType, setCreateType] = useState('anketa');
    const [createTypeAnalysis, setCreateTypeAnalysis] = useState('diagram');
    const [isModalOpenLink, setIsModalOpenLink] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [publishedLink, setPublishedLink] = useState<string | null>(null);
    const [currentLink, setCurrentLink] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchQuestionnaireData(id!);
                setQuestionnaire(data);
            } catch (error) {
                alert("Не удалось загрузить данные анкеты. Пожалуйста, попробуйте позже.");
                navigate("/account");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const allAttempts = useMemo<Attempt[]>(() => {
        if (!questionnaire) return [];
        return processQuestionnaireAnswers(questionnaire);
    }, [questionnaire]);

    const usersWithGroupedAttempts = useMemo<UserAttempts[]>(() => {
        return groupAttemptsByUser(allAttempts);
    }, [allAttempts]);

    const toggleUserAttempts = (userId: string) => {
        setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const toggleAttemptDetails = (attemptId: string) => {
        setExpandedAttempts(prev => ({ ...prev, [attemptId]: !prev[attemptId] }));
    };

    const handleExportToExcel = async () => {
        if (!questionnaire || !allAttempts || allAttempts.length === 0) {
            alert("Нет данных для экспорта.");
            return;
        }

        setIsExporting(true);
        try {
            const { blob, filename } = await exportToExcel(questionnaire, allAttempts, id!);
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Ошибка при экспорте в Excel:", error);
            alert("Произошла ошибка при формировании Excel файла.");
        } finally {
            setIsExporting(false);
        }
    };

    const filteredUsers = usersWithGroupedAttempts.filter((user) =>
        user.userName.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );

    if (loading) {
        return <div className="analysis-page"><LoadingSpinner /></div>;
    }

    if (!questionnaire || !Array.isArray(questionnaire.questions)) {
        return (
            <div className="analysis-page error-page">
                <h1 className="analysis-title error-title">Ошибка</h1>
                <p className="error-message">Анкета не найдена или в ней нет вопросов.</p>
                <button onClick={() => navigate("/account")} className="btn btn-back">Вернуться</button>
            </div>
        );
    }

    return (
        <div className="analysis-page-vh">
            <div className="analysis-page-contaier">
                <ButtonMenuComponent
                    createType={createType}
                    setCreateType={setCreateType}
                    isLoading={true}
                    publishedLink={publishedLink}
                    linkModal={() => setIsModalOpenLink(true)}
                    width={'1200px'}
                />

                <div className="analysis-title-container">
                    <div className="analysis-title"> {questionnaire.title || "Анализ ответов"} </div>
                </div>

                {createType === 'analysis' ? (
                    <div className="analysis-page">
                        <div className="ButtonMenuContainer-inner">
                            <div className="Type-Switcher-inner">
                                <button className={`Switch-button-inner ${createTypeAnalysis === 'diagram' ? 'active' : ''}`}
                                    onClick={() => setCreateTypeAnalysis('diagram')}>
                                    <img src={DiagrammIcon} alt="icons-diagram-question" className="InnerMenuIcon" />
                                    ДИАГРАММЫ
                                </button>
                                <button className={`Switch-button-inner ${createTypeAnalysis === 'AnalysisAnswers' ? 'active' : ''}`}
                                    onClick={() => setCreateTypeAnalysis('AnalysisAnswers')}>
                                    <img src={AnswersIcon} alt="icons-answers-question" className="InnerMenuIcon" />
                                    ОТВЕТЫ
                                </button>
                            </div>
                            <button className="publishButton-inner" type="button" onClick={handleExportToExcel}>
                                {isExporting ? 'ЭКСПОРТ...' : 'СКАЧАТЬ XLS'}
                            </button>
                        </div>

                        {createTypeAnalysis === 'AnalysisAnswers' ? (
                            <div className="detailed-answers-section">
                                <div className="searchTermInput">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Поиск по имени"
                                    />
                                </div>

                                {filteredUsers.length > 0 ? (
                                    <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                                        <table className="survey-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ minWidth: '130px' }}>Фамилия И.О.</th>
                                                    <th style={{ minWidth: '130px' }}>Дата</th>
                                                    {questionnaire.questions.map((q) => (
                                                        <th key={q.id || q.text} style={{ minWidth: '180px' }}>
                                                            {q.text}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user) => {
                                                    const attempt = user.attempts[0];
                                                    if (!attempt) return null;

                                                    const answerMap = new Map<string, string>();
                                                    attempt.groupedAnswers.forEach((ag) => {
                                                        answerMap.set(ag.questionText, ag.answerTexts.join(', ') || '(нет ответа)');
                                                    });

                                                    const activityDate = new Date(attempt.startTime).toLocaleString('ru-RU');

                                                    return (
                                                        <tr key={user.userId}>
                                                            <td>{user.userName}</td>
                                                            <td>{activityDate}</td>
                                                            {questionnaire.questions.map((q) => (
                                                                <td key={`${user.userId}-${q.id || q.text}`}>
                                                                    {answerMap.get(q.text) || '(нет ответа)'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="no-answers">Нет данных для отображения — пока никто не ответил на анкету.</p>
                                )}
                            </div>
                        ) : (
                            <GraphComponent questions={questionnaire.questions} />
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default AnalysisPage;






export interface Questionnaire {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
}

export interface Question {
    id?: string;
    text: string;
    type: string;
    options?: { optionText: string }[];
    answers?: Answer[];
}

export interface Answer {
    userId?: string;
    userName?: string;
    isAnonymous?: boolean;
    selectedOptionText?: string;
    text?: string;
    createdAt: string;
}

export interface Attempt {
    attemptId: string;
    userId: string;
    userName: string;
    isAnonymous: boolean;
    startTime: Date;
    answers: Record<string, AnswerGroup>;
    groupedAnswers: AnswerGroup[];
    lastAnswerTimestamp: number;
    attemptNumber: number;
}

export interface AnswerGroup {
    questionRealId?: string;
    questionText: string;
    questionType: string;
    answerTexts: string[];
    firstAnswerTime: number;
}

export interface UserAttempts {
    userId: string;
    userName: string;
    isAnonymous: boolean;
    attempts: Attempt[];
    firstAttemptTime: number;
    lastAttemptTime: number;
}

