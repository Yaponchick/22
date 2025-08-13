<div className="detailed-answers-section">
    <h2 className="detailed-answers-title">Ответы пользователей (таблица)</h2>

    {usersWithGroupedAttempts.length > 0 ? (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="survey-table">
                <thead>
                    <tr>
                        <th>ФИО</th>
                        <th>Дата</th>
                        {questionnaire.questions.map((q) => (
                            <th key={q.id || q.text} style={{ minWidth: '200px' }}>
                                {q.text}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {usersWithGroupedAttempts.map((user) => {
                        // Берём последнюю попытку (или можно брать первую, или объединить — зависит от логики)
                        const latestAttempt = user.attempts.reduce((prev, current) =>
                            prev.lastAnswerTimestamp > current.lastAnswerTimestamp ? prev : current
                        );

                        // Создаём мапу ответов по тексту вопроса
                        const answerMap = new Map<string, string>();
                        latestAttempt.groupedAnswers.forEach((ag) => {
                            // Объединяем ответы через запятую (для checkbox)
                            answerMap.set(ag.questionText, ag.answerTexts.join(', ') || '(нет ответа)');
                        });

                        // Форматируем дату последнего ответа
                        const lastActivityDate = new Date(user.lastAttemptTime).toLocaleDateString('ru-RU');

                        return (
                            <tr key={user.userId}>
                                <td>{user.userName} {user.isAnonymous ? '(Аноним)' : ''}</td>
                                <td>{lastActivityDate}</td>
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
        <p>Нет данных для отображения.</p>
    )}
</div>
