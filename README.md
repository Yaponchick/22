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
