import React, { useState, useEffect, FC, useRef } from 'react';
import './Account.css';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import apiClient, { getUserSurveys } from '../../api/apiClient';
import ArrowDropDownFilled from '../../img/Account/ArrowDropDownFilled.png';
import DeleteFilled from '../../img/Account/DeleteFilled.png';
import LinkIcon from '../../img/Account/LinkIcon.png';
import LockFilled from '../../img/Account/LockFilled.png';
import BookIcon from '../../img/Account/BookIcon.png';
import ModalLink from '../../component/modal/modalLink';
import Star from './Star';

// Типы
interface ApiSurvey {
    id: number | string;
    title: string;
    isPublished: boolean;
    createdAt: string;
    link?: string;
}

interface Survey {
    id: string;
    title: string;
    link: string;
    isPublished: boolean;
    isClosed: boolean;
    createdAt: string;
}

interface SurveyCardProps {
    survey: Survey;
    isClosed: boolean;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onToggleLock: (id: string, isClosed: boolean) => void;
}

const AccountPage: FC = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [nickname, setNickname] = useState<string>('Гость');
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [currentLink, setCurrentLink] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchSurveys = async (): Promise<void> => {
            try {
                const apiSurveys: ApiSurvey[] = await getUserSurveys();
                const mappedSurveys: Survey[] = apiSurveys.map((s) => ({
                    id: String(s.id),
                    title: s.title,
                    link: s.link || `/survey/${s.id}`,
                    isPublished: s.isPublished,
                    isClosed: !s.isPublished,
                    createdAt: s.createdAt,
                }));
                setSurveys(mappedSurveys);
            } catch (error: any) {
                console.error('Не удалось загрузить анкеты:', error.response?.data || error.message);
            }
        };

        const fetchUserData = async (): Promise<void> => {
            try {
                const response = await apiClient.get('/User/current');
                const userData = response.data;
                setNickname(userData.nick || 'Гость');
            } catch (error: any) {
                console.error('Ошибка при загрузке данных пользователя:', error.response?.data || error.message);
                setNickname('Гость');
            } finally {
                setLoading(false);
            }
        };

        fetchSurveys();
        fetchUserData();
    }, []);

    const handleDelete = async (id: string): Promise<void> => {
        if (!id) return;

        try {
            await apiClient.delete(`/questionnaire/${id}`);
            setSurveys((prev) => prev.filter((survey) => survey.id !== id));
        } catch (error: any) {
            console.error('Ошибка при удалении анкеты:', error.response?.data || error.message);
            alert('Не удалось удалить анкету.');
        }
    };

    const handleEdit = (id: string): void => {
        navigate(`/edit-survey/${id}`);
        setOpenMenuId(null);

    };

    // const handleAnalisys = (id: string, link: string): void => {
    //     navigate(`/AnalysisPage/${surveys.id}`)
    // }

        const formatDate = (dateString: string) => {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return new Intl.DateTimeFormat('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        };

        // Фильтрация по названию и dropdown
        const filteredSurveys = surveys
            .filter((survey) =>
                survey.title.toLowerCase().includes(search.toLowerCase())
            )
            // dropdown
            .filter((survey) => {
                if (statusFilter === 'published') return survey.isPublished;
                if (statusFilter === 'draft') return !survey.isPublished;
                return true;
            });

        const openModal = (link: string | null) => {
            setCurrentLink(link);
            setIsModalOpen(true);
        };

        const closeModal = () => {
            setIsModalOpen(false);
            setCurrentLink(null);
        };

        if (loading) {
            return <div className="ac-page">Загрузка...</div>;
        }
        const handleTogglePublish = async (id: string, currentStatus: boolean): Promise<void> => {
            try {
                await apiClient.put(`/questionnaire/${id}/status`, { IsPublished: !currentStatus });
                // Обновляем состояние анкеты локально для мгновенного отклика
                setSurveys(prevSurveys =>
                    prevSurveys.map(s =>
                        s.id === id ? { ...s, isPublished: !currentStatus } : s
                    )
                );
            } catch (error: any) {
                console.error('Ошибка при изменении статуса анкеты:', error.response?.data || error.message);
                alert('Не удалось изменить статус анкеты.');
            }
        };
        return (
            <div className="list-ancet">
                <div className="ac-page">
                    {surveys.length !== 0 && (
                        <div>
                            {/* Кнопка создания анкеты */}
                            <button className="ButtonCreateQuest" onClick={() => navigate('/surveyPage')}>
                                Создать анкету
                            </button>

                            {/* Фильтры */}
                            <div className="filter-container">
                                <input
                                    type="text"
                                    placeholder="Поиск по названию"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Поиск по названию анкеты"
                                />
                                <div className="dropdown" style={{ width: '20%' }}>
                                    <button className="dropbtn" onClick={(e) => e.stopPropagation()}>
                                        {statusFilter === 'published'
                                            ? 'Опубликованные'
                                            : statusFilter === 'draft'
                                                ? 'Неопубликованные'
                                                : 'Все анкеты'
                                        }
                                        <img src={ArrowDropDownFilled} alt="dropdown" className="ArrowDropDownFilledIcon" />
                                    </button>
                                    <div className="dropdown-content">
                                        <a href="#" onClick={(e) => { e.preventDefault(); setStatusFilter('all'); }}>Все анкеты</a>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setStatusFilter('published'); }}>Опубликованные</a>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setStatusFilter('draft'); }}>Неопубликованные</a>
                                    </div>
                                </div>
                                <button className="StarButton" >
                                    <Star />
                                </button>
                            </div>

                            {/* Статус поиска */}
                            <div className="underFilter-container">
                                {search ? (
                                    <>
                                        Найдено {filteredSurveys.length} анкет по запросу "{search}"
                                    </>
                                ) : (
                                    <>
                                        {statusFilter === 'published' && 'Найдено опубликованных анкет: '}
                                        {statusFilter === 'draft' && 'Найдено неопубликованных анкет: '}
                                        {statusFilter === 'all' && 'Найдено анкет: '}
                                        {filteredSurveys.length}
                                    </>
                                )}
                                {(search || statusFilter !== 'all') && (
                                    <button className="throwFilter" onClick={() => { setSearch(''); setStatusFilter('all') }}>
                                        Сбросить фильтр
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {/* Основное содержимое */}
                    {filteredSurveys.length === 0 ? (
                        // Нет результатов
                        surveys.length === 0 ? (
                            // Нет анкет
                            <div className="lackOfQuestionnaires">
                                <div className="lackOfQuestionnaires-inner">
                                    <img src={BookIcon} alt="Нет анкет" className="BookIcon-icon" />
                                    <div className="lackOfQuestionnaires-text">У вас нет анкет</div>
                                    <button
                                        className="lackOfQuestionnaires-button"
                                        onClick={() => navigate('/surveyPage')}
                                    >
                                        Создать анкету
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Есть анкеты, но нет совпадений
                            <div className="lackOfQuestionnaires">
                                <div className="lackOfQuestionnaires-text">
                                    {search ? (
                                        <>
                                            Ничего не найдено по запросу: "{search}"
                                        </>
                                    ) : (
                                        <>
                                            {statusFilter === 'published' && 'Опубликованных анкет нет '}
                                            {statusFilter === 'draft' && 'Неопубликованных анкет нет '}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        // Таблица
                        <div className="table-container">
                            <table className="survey-table">
                                <thead>
                                    <tr>
                                        <th>Название</th>
                                        <th>Статус</th>
                                        <th>Дата</th>
                                        <th></th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSurveys.map((survey) => (
                                        <tr key={survey.id}>
                                            <td className="nameQuest">
                                                <div className="title-wrapper">
                                                    <div
                                                        className="survey-title-name"
                                                        title={survey.title}
                                                        onClick={() => navigate(`/AnalysisPage/${survey.id}`, {
                                                            state:{
                                                                link:currentLink
                                                            }
                                                        })}
                                                    >
                                                        {survey.title}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='status-badge-container'>
                                                <span className='status-badge' style={{ color: survey.isPublished ? 'green' : 'rgb(238, 85, 115)' }}>
                                                    {!survey.isPublished ? 'Не опубликована' : 'Опубликована'}
                                                </span>
                                            </td>
                                            <td> {formatDate(survey.createdAt)} </td>
                                            <td>
                                                <Star />
                                            </td>
                                            <td>
                                                <div className="dropdown">
                                                    <button className="action-btn">⋯</button>
                                                    <div className="dropdown-content">
                                                        <div className="context-button">
                                                            <button
                                                                className="menu-item"
                                                                onClick={() => handleTogglePublish(survey.id, survey.isPublished)
                                                                }
                                                            >
                                                                <img src={LockFilled} alt="icons-LockFilled" className="context-icon" />
                                                                {survey.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                                                            </button>
                                                            <button
                                                                className="menu-item"
                                                                onClick={() => openModal(survey.link)}
                                                                disabled={!survey.link}
                                                            >
                                                                <img src={LinkIcon} alt="icons-LinkIcon" className="context-iconLink" />

                                                                Поделиться
                                                            </button>
                                                            <button
                                                                className="menu-item danger"
                                                                onClick={() => handleDelete(survey.id)}
                                                            >
                                                                <img src={DeleteFilled} alt="icons-DeleteFilled" className="context-icon" />
                                                                Удалить
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <ModalLink
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    link={currentLink}
                />
            </div>
        );
    };

    export default AccountPage;
