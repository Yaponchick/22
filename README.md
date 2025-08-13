import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from '../../api/apiClient';
import ExcelJS from 'exceljs';
import "./Analysis.css";

interface Questionnaire {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
}

interface Question {
    id?: string;
    text: string;
    type: string;
    options?: { optionText: string }[];
    answers?: Answer[];
}

interface Answer {
    userId?: string;
    userName?: string;
    isAnonymous?: boolean;
    selectedOptionText?: string;
    text?: string;
    createdAt: string;
}

interface Attempt {
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

interface AnswerGroup {
    questionRealId?: string;
    questionText: string;
    questionType: string;
    answerTexts: string[];
    firstAnswerTime: number;
}

interface UserAttempts {
    userId: string;
    userName: string;
    isAnonymous: boolean;
    attempts: Attempt[];
    firstAttemptTime: number;
    lastAttemptTime: number;
}

const LoadingSpinner: React.FC = () => {
    return (
        <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p>Загрузка данных...</p>
        </div>
    );
};

const questionTypeTranslations: Record<string, string> = {
    radio: 'Один из списка',
    checkbox: 'Несколько из списка',
    select: 'Выпадающий список',
    scale: 'Шкала',
    text: 'Текстовый ответ',
    default: 'Неизвестный тип'
};

const translateQuestionType = (type: string): string => {
    return questionTypeTranslations[type] || questionTypeTranslations.default;
};

const AnalysisPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
    const [expandedAttempts, setExpandedAttempts] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchQuestionnaire = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/questionnaire/${id}`);
                setQuestionnaire(response.data);
            } catch (error) {
                console.error("Ошибка загрузки анкеты:", error);
                alert("Не удалось загрузить данные анкеты. Пожалуйста, попробуйте позже.");
                navigate("/account");
            } finally {
                setLoading(false);
            }
        };
        fetchQuestionnaire();
    }, [id, navigate]);

    const allAttempts = useMemo<Attempt[]>(() => {
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
    }, [questionnaire]);

    const groupAttemptsByUser = (attemptsToGroup: Attempt[]): UserAttempts[] => {
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

    const toggleUserAttempts = (userId: string) => {
        setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const toggleAttemptDetails = (attemptId: string) => {
        setExpandedAttempts(prev => ({ ...prev, [attemptId]: !prev[attemptId] }));
    };

    const sanitizeFilename = (name: string): string => {
        return name.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
    };

    const handleExportToExcel = async () => {
        if (!questionnaire || !allAttempts || allAttempts.length === 0) {
            alert("Нет данных для экспорта.");
            return;
        }

        setIsExporting(true);

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'AnketaApp';
            workbook.created = new Date();
            workbook.modified = new Date();

            // --- Логика создания листа с графиками удалена ---

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

            // Лист с открытыми ответами
            const ws_open_answers = workbook.addWorksheet("Открытые ответы");
            ws_open_answers.columns = [
                { header: 'ID Попытки', key: 'attemptId', width: 20 },
                { header: 'ID Пользователя', key: 'userId', width: 15 },
                { header: 'Имя Пользователя', key: 'userName', width: 25 },
                { header: 'Аноним', key: 'isAnonymous', width: 10 },
                { header: 'Вопрос', key: 'questionText', width: 50 },
                { header: 'Ответ', key: 'answerText', width: 60 },
                { header: 'Время ответа', key: 'answerTime', width: 20, style: { numFmt: 'dd/mm/yyyy hh:mm:ss' } }
            ];
            ws_open_answers.getRow(1).font = { bold: true };

            let hasOpenAnswers = false;
            allAttempts.forEach(attempt => {
                attempt.groupedAnswers.forEach(answerGroup => {
                    if (answerGroup.questionType === 'text') {
                        answerGroup.answerTexts.forEach(text => {
                            hasOpenAnswers = true;
                            ws_open_answers.addRow({
                                attemptId: attempt.attemptId.substring(0, 15) + '...',
                                userId: attempt.userId,
                                userName: attempt.userName,
                                isAnonymous: attempt.isAnonymous ? "Да" : "Нет",
                                questionText: answerGroup.questionText,
                                answerText: text,
                                answerTime: new Date(answerGroup.firstAnswerTime)
                            });
                        });
                    }
                });
            });

            if (!hasOpenAnswers) ws_open_answers.addRow({ questionText: "Нет открытых ответов." });
            ws_open_answers.eachRow({ includeEmpty: false }, function (row) {
                row.alignment = { vertical: 'top', wrapText: true };
            });

            // Лист со всеми ответами
            const ws_all_answers = workbook.addWorksheet("Все ответы");
            ws_all_answers.columns = [
                { header: 'Номер Попытки', key: 'attemptNumber', width: 15 },
                { header: 'Имя Пользователя', key: 'userName', width: 25 },
                { header: 'Текст Вопроса', key: 'questionText', width: 50 },
                { header: 'Тип Вопроса', key: 'questionType', width: 15 },
                { header: 'Текст Ответа', key: 'answerText', width: 60 },
                { header: 'Время Ответа', key: 'answerTime', width: 20, style: { numFmt: 'dd/mm/yyyy hh:mm:ss' } }
            ];
            ws_all_answers.getRow(1).font = { bold: true };

            const sortedAttempts = [...allAttempts].sort((a, b) => {
                const nameA = (a.userName || '').toLowerCase();
                const nameB = (b.userName || '').toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return a.attemptNumber - b.attemptNumber;
            });

            const colorPalette = ['FFFFE0B3', 'FFADD8E6', 'FF90EE90', 'FFFFB6C1', 'FFE6E6FA', 'FFFFFACD', 'FFF0E68C', 'FFB0E0E6'];
            const userColorMap = new Map<string, string>();
            let colorIndex = -1;
            let currentUser: string | null = null;
            let hasAnyAnswers = false;

            sortedAttempts.forEach((attempt, index) => {
                if (attempt.userName !== currentUser) {
                    if (index > 0) {
                        ws_all_answers.addRow([]);
                    }
                    currentUser = attempt.userName;
                    if (!userColorMap.has(currentUser)) {
                        colorIndex = (colorIndex + 1) % colorPalette.length;
                        userColorMap.set(currentUser, colorPalette[colorIndex]);
                    }
                }

                const userColor = userColorMap.get(currentUser);

                attempt.groupedAnswers.forEach(answerGroup => {
                    answerGroup.answerTexts.forEach(text => {
                        hasAnyAnswers = true;
                        const rowData = {
                            attemptNumber: attempt.attemptNumber,
                            userName: attempt.userName,
                            questionText: answerGroup.questionText,
                            questionType: translateQuestionType(answerGroup.questionType),
                            answerText: text,
                            answerTime: new Date(answerGroup.firstAnswerTime)
                        };

                        ws_all_answers.addRow(rowData);
                        const addedRow = ws_all_answers.lastRow;

                        if (addedRow && userColor) {
                            addedRow.eachCell({ includeEmpty: true }, cell => {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: userColor }
                                };
                            });
                        }
                    });
                });
            });

            if (!hasAnyAnswers) ws_all_answers.addRow({ questionText: "Нет ответов для отображения." });

            ws_all_answers.eachRow({ includeEmpty: true }, function (row, rowNumber) {
                if (rowNumber > 1 && Array.isArray(row.values) && (row.values as any[]).some(v => v !== null && v !== undefined && v !== '')) {
                    row.alignment = { vertical: 'top', wrapText: true };
                }
            });

            // Сохранение файла
            const buffer = await workbook.xlsx.writeBuffer();
            const filename = sanitizeFilename(`Анализ_Данных_${questionnaire.title || `Анкета_${id}`}.xlsx`);
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

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
            alert("Произошла ошибка при формировании Excel файла. Пожалуйста, проверьте консоль разработчика для деталей.");
        } finally {
            setIsExporting(false);
        }
    };

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

    const usersWithGroupedAttempts = groupAttemptsByUser(allAttempts);
    const totalAttemptsCount = allAttempts.length;

    return (
        <div className="analysis-page-vh">
            <div className="analysis-page">

                <h1 className="analysis-title">{questionnaire.title || "Анализ ответов"}</h1>
                <p className="analysis-description">{questionnaire.description || "Просмотрите ответы пользователей и общую статистику"}</p>

                <div className="global-analysis-action">
                    <button
                        className="btn btn-export-excel"
                        onClick={handleExportToExcel}
                        disabled={totalAttemptsCount === 0 || isExporting || loading}
                    >
                        {isExporting ? 'Экспорт...' : 'Скачать в Excel'}
                    </button>
                </div>

                <div className="detailed-answers-section">
                    <h2 className="detailed-answers-title">Детальные ответы по пользователям</h2>
                    <div className="users-container">
                        {usersWithGroupedAttempts?.length > 0 ? (
                            usersWithGroupedAttempts.map((user) => {
                                const isUserExpanded = !!expandedUsers[user.userId];
                                const lastActivityTime = new Date(user.lastAttemptTime).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <div key={user.userId} className={`user-block ${isUserExpanded ? "expanded" : ""}`}>
                                        <div
                                            className="user-header"
                                            onClick={() => toggleUserAttempts(user.userId)}
                                            role="button"
                                            tabIndex={0}
                                            aria-expanded={isUserExpanded}
                                        >
                                            <h3 className="user-name">
                                                {user.userName} {user.isAnonymous ? '(Аноним)' : ''}
                                            </h3>
                                            <span className="toggle-icon" aria-hidden="true"></span>
                                        </div>
                                        <div
                                            id={`user-attempts-${user.userId}`}
                                            className="user-attempts-wrapper"
                                            style={{
                                                maxHeight: isUserExpanded ? '3000px' : '0',
                                                opacity: isUserExpanded ? 1 : 0,
                                                paddingTop: isUserExpanded ? '20px' : '0',
                                                paddingBottom: isUserExpanded ? '0px' : '0',
                                                transition: 'max-height 0.6s ease-in-out, opacity 0.5s 0.1s ease-out, padding 0.6s ease-in-out'
                                            }}
                                        >
                                            <div className="user-attempts-list">
                                                {user.attempts.map((attempt) => {
                                                    const isAttemptExpanded = !!expandedAttempts[attempt.attemptId];
                                                    return (
                                                        <div key={attempt.attemptId} className={`attempt-item ${isAttemptExpanded ? "expanded" : ""}`}>
                                                            <div
                                                                className="attempt-item-header"
                                                                onClick={() => toggleAttemptDetails(attempt.attemptId)}
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-expanded={isAttemptExpanded}
                                                                aria-controls={`attempt-details-${attempt.attemptId}`}
                                                            >
                                                                <span className="attempt-item-title">
                                                                    Ответ {attempt.attemptNumber}
                                                                    <small className="attempt-item-time">
                                                                        ({attempt.startTime.toLocaleString('ru-RU', {
                                                                            day: '2-digit',
                                                                            month: '2-digit',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })})
                                                                    </small>
                                                                </span>
                                                                <span className="toggle-icon" aria-hidden="true"></span>
                                                            </div>
                                                            <div
                                                                id={`attempt-details-${attempt.attemptId}`}
                                                                className="attempt-answers-wrapper"
                                                                style={{
                                                                    maxHeight: isAttemptExpanded ? '2000px' : '0',
                                                                    opacity: isAttemptExpanded ? 1 : 0,
                                                                    padding: isAttemptExpanded ? '15px 15px 15px 15px' : '0 15px',
                                                                    transition: 'max-height 0.5s ease-in-out, opacity 0.4s 0.1s ease-out, padding 0.5s ease-in-out'
                                                                }}
                                                            >
                                                                <div className="attempt-answers">
                                                                    {attempt.groupedAnswers.map((answerGroup, idx) => (
                                                                        <div key={`${answerGroup.questionText}-${idx}`} className="answer-item">
                                                                            <p className="answer-question">{answerGroup.questionText}</p>
                                                                            <div className="answer-texts-container">
                                                                                {answerGroup.answerTexts?.length > 0
                                                                                    ? (answerGroup.answerTexts.map((text, textIdx) => (
                                                                                        <p key={textIdx} className="answer-text-item">
                                                                                            {text || '(пустой ответ)'}
                                                                                        </p>
                                                                                    )))
                                                                                    : (<p className="answer-text-item no-answer">(Нет ответа)</p>)
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="user-footer">
                                                <small className="user-last-answered">
                                                    Последняя активность пользователя: {lastActivityTime}
                                                </small>
                                            </div>
                                        </div>





                                        <div className="table-container" key={user.userId}>
                                            <table className="survey-table">
                                                <thead>
                                                    <tr>
                                                        <th>Фамилия И.О.</th>
                                                        <th>Дата</th>
                                                        <th>Вопрос</th>
                                                        <th></th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <div onClick={() => toggleUserAttempts(user.userId)}>
                                                                {user.userName}
                                                            </div>
                                                        </td>
                                                        <td >
                                                            {lastActivityTime}
                                                        </td>
                                                        <td>
                                                            {/* {questionText} */}

                                                        </td>
                                                        <td>

                                                        </td>
                                                        <td>

                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                );
                            })
                        ) : (
                            <div className="no-answers-block"><p>Пока нет ни одного ответа на эту анкету.</p></div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalysisPage;
