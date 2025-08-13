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
                            <th key={q.id || q.text} style={{ minWidth: '180px' }}>
                                {q.text}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {usersWithGroupedAttempts.map((user) => {
                        // У пользователя может быть только одна попытка
                        const attempt = user.attempts[0]; // Берём первую (и единственную) попытку
                        if (!attempt) return null;

                        // Создаём карту: текст вопроса → ответ
                        const answerMap = new Map<string, string>();
                        attempt.groupedAnswers.forEach((ag) => {
                            answerMap.set(ag.questionText, ag.answerTexts.join(', ') || '(нет ответа)');
                        });

                        // Форматируем дату: день.месяц.год
                        const activityDate = new Date(attempt.startTime).toLocaleDateString('ru-RU');

                        return (
                            <tr key={user.userId}>
                                <td>{user.userName} {user.isAnonymous ? '(Аноним)' : ''}</td>
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
