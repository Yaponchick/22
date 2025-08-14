import React, { FC, ChangeEvent, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useSurvey } from './useSurvey';

import QuestionComponent, { QuestionType } from './Question';
import './createStyle.css';
import '../../component/ButtonMenu/ButtonMenuComponent'

import ModalLink from '../../component/modal/modalLink';

import OpenQuest from '../../img/SurveyPage/OpenQuestion.png';
import CloseQuest from '../../img/SurveyPage/CloseQuestion.png';
import MultiQuest from '../../img/SurveyPage/MultiQuestion.png';
import ShkalaQuest from '../../img/SurveyPage/ShkalaQuestion.png';
import InfoOutlined from '../../img/SurveyPage/InfoOutlined.png';
import TickIcon from '../../img/SurveyPage/TickIcon.png';
import SendIcon from '../../img/SurveyPage/SendIcon.png';
import DeleteAnketaIcon from '../../img/SurveyPage/DeleteAnketaIcon.png';
import EyeIcon from '../../img/SurveyPage/EyeIcon.png';
import StatisticIcon from '../../img/SurveyPage/StatisticIcon.png';

const SurveyPage: FC = () => {
    const {
        questions,
        title,
        setTitle,
        error,
        questionErrors,
        deleteError,
        isLoading,
        dropdownsOpen,
        setDropdownsOpen,
        handleSaveClick,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleDragEnd,
        handleDragLeave,
        handleAddFirstQuestion,
        addNewQuestion,
        deleteQuestion,
        moveQuestion,
        setQuestionRef,
        handleOptionSelect,
        addAnswer,
        deleteAnswer,
        handleAnswerChange,
        handleQuestionTextChange,
        handleScaleChange,
        isModalOpen,
        confirmSave,
        cancelSave,
    } = useSurvey();

    interface LocationState {
        link: string;
    }

    const notDeletedQuestions = questions.filter(q => !q.isDeleting);
    const [createType, setCreateType] = useState('anketa');
    const [isModalOpenLink, setIsModalOpenLink] = useState<boolean>(false);
    const location = useLocation();
    const stateLink = (location.state as LocationState | null)?.link;
    const [publishedLink, setPublishedLink] = useState<string | null>(null);

    // Получаем ID последнего вопроса
    const lastQuestionId = notDeletedQuestions.length > 0
        ? notDeletedQuestions[notDeletedQuestions.length - 1].uniqueId
        : 'placeholder';

    function linkModal() {
        setIsModalOpenLink(true);
    }

    return (
        <div className="survey-page-vh">
            
            <div className="survey-page"    >
                <div className="ButtonMenuContainer" style={{maxWidth: '800px'}}>
                    <div className="Type-Switcher">
                        <button className={`Switch-button-create 
                        ${createType === 'anketa' ? 'active' : ''}`}
                            onClick={() => setCreateType('anketa')}
                        >
                            <img src={EyeIcon} alt="icons-eye-question" className="TickIconEyeStatistics" />
                            Анкета
                        </button>
                        <button disabled className={`Switch-button-create
                        ${createType === 'analysis' ? 'active' : ''}`}
                            onClick={() => setCreateType('analysis')}
                        >
                            <img src={StatisticIcon} alt="icons-statistic-question" className="TickIconEyeStatistics" />
                            Статистика
                        </button>
                    </div>

                    <button onClick={handleSaveClick} className="publishButton" type="button" disabled={isLoading}>
                        {isLoading ? 'Публикация...' : 'Опубликовать'}
                    </button>
                    
                    <button disabled={!publishedLink} onClick={linkModal} className="ButtonSendIcon" type="button">
                        <img src={SendIcon} alt="icons-tick-question" className="TickIcon" />
                    </button>
                    <button disabled onClick={handleSaveClick} className="ButtonSendIcon" type="button">
                        <img src={DeleteAnketaIcon} alt="icons-tick-question" className="TickIcon" />
                    </button>
                </div>

                <form >
                    {createType === 'anketa' && (
                        <div className="survey-title">
                            <input
                                type="text"
                                placeholder="Название анкеты"
                                value={title}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                                maxLength={250}
                                aria-label="Название анкеты"
                            />
                            {error && <p className="error-message-create">{error}</p>}
                        </div>
                    )}

                    {createType === 'anketa' && questions.map((question) => (
                        <QuestionComponent
                            key={question.uniqueId}
                            question={question}
                            questionErrors={questionErrors}
                            deleteError={deleteError}
                            dropdownsOpen={dropdownsOpen}
                            onDropdownToggle={(id) => setDropdownsOpen(prev => ({ ...prev, [id]: !prev[id] }))}
                            onOptionSelect={handleOptionSelect}
                            onTextChange={handleQuestionTextChange}
                            onAnswerChange={handleAnswerChange}
                            onAddAnswer={addAnswer}
                            onDeleteAnswer={deleteAnswer}
                            onScaleChange={handleScaleChange}
                            onAddNew={addNewQuestion}
                            onMove={moveQuestion}
                            onDelete={deleteQuestion}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            onDragLeave={handleDragLeave}
                            setQuestionRef={setQuestionRef}
                            isOnlyQuestion={notDeletedQuestions.length <= 0}
                            isLastQuestion={question.displayId === notDeletedQuestions.length}
                            canAddMoreQuestions={notDeletedQuestions.length < 10}
                        />
                    ))}
                {isModalOpenLink && (
                    <ModalLink
                        isOpen={isModalOpenLink}
                        onClose={() => setIsModalOpenLink(false)}
                        link = {publishedLink || stateLink || 'https://ссылкиНет.ru'}
                    />
                )}
                    {notDeletedQuestions.length < 10 && createType === 'anketa' && (
                        <div className="add-question-placeholder">
                            <span className="add-question-title">Добавить новый вопрос</span>
                            <div className="question-type-buttons">
                                <div className="q-type-btn" onClick={() => addNewQuestion(lastQuestionId, 'Открытый')}>
                                    <span><img src={OpenQuest} alt="icons-open-question" className="q-type-icon-box" /></span>
                                    <span className="q-type-label">Открытый</span>
                                    <span className='tooltip'>
                                        <button className='tooltip-toggle' type='button'>
                                            <img src={InfoOutlined} alt="icons-info" className="q-type-info" />
                                        </button>
                                        <span className='tooltip-text'>Если нужен ответ <br /> в свободной форме</span>
                                    </span>
                                </div>
                                <div className="q-type-btn" onClick={() => addNewQuestion(lastQuestionId, 'Закрытый')}>
                                    <span><img src={CloseQuest} alt="icons-close-question" className="q-type-icon-box" /></span>
                                    <span className="q-type-label">Закрытый</span>
                                    <span className='tooltip'>
                                        <button className='tooltip-toggle' type='button'>
                                            <img src={InfoOutlined} alt="icons-info" className="q-type-info" />
                                        </button>
                                        <span className='tooltip-text'>Если нужно выбрать <br /> один вариант ответа</span>
                                    </span>
                                </div>
                                <div className="q-type-btn" onClick={() => addNewQuestion(lastQuestionId, 'Множественный выбор')}>
                                    <span><img src={MultiQuest} alt="icons-multi-question" className="q-type-icon-box" /></span>
                                    <span className="q-type-label">Несколько</span>
                                    <span className='tooltip'>
                                        <button className='tooltip-toggle' type='button'>
                                            <img src={InfoOutlined} alt="icons-info" className="q-type-info" />
                                        </button>
                                        <span className='tooltip-text'>Если нужно выбрать <br /> один или несколько <br /> вариантов ответа</span>
                                    </span>
                                </div>
                                <div className="q-type-btn" onClick={() => addNewQuestion(lastQuestionId, 'Шкала')}>
                                    <span><img src={ShkalaQuest} alt="icons-shkala-question" className="q-type-icon-box" /></span>
                                    <span className="q-type-label">Шкала</span>
                                    <span className='tooltip'>
                                        <button className='tooltip-toggle' type='button'>
                                            <img src={InfoOutlined} alt="icons-info" className="q-type-info" />
                                        </button>
                                        <span className='tooltip-text'>Если нужно оценить <br /> высказывание по шкале</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                    )}
                    {createType === 'anketa' && (
                        <div className="ButtonSaveContainer">
                            <button onClick={handleSaveClick} className="ButtonSave" type="button" disabled={isLoading}>
                                <img src={TickIcon} alt="icons-tick-question" className="TickIcon" />
                                {isLoading ? 'Отправка...' : 'СОХРАНИТЬ'}
                            </button>
                        </div>
                    )}
                </form>

                {isModalOpen && (
                    <div className='modal'>
                        <div className='modal-content'>
                            <div className='modal-text'>
                                <div style={{ fontSize: '20px', marginBottom: '20px' }}>Анкета создана!<br /> </div>
                                Чтобы анкета стала доступной для <br />
                                прохождения, её необходимо опубликовать
                            </div>
                            <div className='button-modal'>
                                <button className='notPublishButton' onClick={cancelSave}>Не публиковать</button>
                                {/* <button className='PublishButton' onClick={confirmSave}>Опубликовать</button> */}
                                <button
                                    className='PublishButton'
                                    onClick={async () => {
                                        const link = await confirmSave();
                                        if (link) {
                                            setPublishedLink(link);
                                            setIsModalOpenLink(true);
                                        }
                                    }}
                                >
                                    Опубликовать
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurveyPage;
