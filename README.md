import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from 'react-router-dom';
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
    const location = useLocation();
    const [surveyLink, setSurveyLink] = useState <string |null>( location.state?.link || null);
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
    function linkModal() {
        setIsModalOpenLink(true);
    }
    return (
        <div className="analysis-page-vh">
            <div className="analysis-page-contaier">
                <ButtonMenuComponent
                    createType={createType}
                    setCreateType={setCreateType}
                    isLoading={true}
                    publishedLink={surveyLink}
                    linkModal={linkModal}
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
            {isModalOpenLink && (
                <ModalLink
                    isOpen={isModalOpenLink}
                    onClose={() => setIsModalOpenLink(false)}
                    link={publishedLink || surveyLink || 'https://ссылкиНет.ru'}
                />
            )}
        </div>
    );
};

export default AnalysisPage;
