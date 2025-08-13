.Type-Switcher-inner {
    display: flex;
    font-family: Geologica;
    font-weight: 500;
    margin-bottom: 20px;
    border-bottom: 1px solid rgb(71, 0, 17);
    color: rgba(0, 71, 70, 1);
}


.InnerMenuIcon {
    width: 18px;
    height: 14px;

}

.Switch-button-inner {
    background-color: rgb(255, 255, 255);

    height: 42px;
    border-radius: 0;
    flex: 1;
    width: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
}

.Switch-button-inner.active {
    background-color: rgba(155, 155, 155, 1);
    color: white;
}

.Switch-button-inner.active .InnerMenuIcon {
    filter: invert(1) brightness(1.2);
    fill: currentColor;


}
<div className="ButtonMenuContainer-inner">
                            <div className="Type-Switcher-inner">
                                <button className={`Switch-button-inner 
                                    ${createTypeAnalysis === 'diagram' ? 'active' : ''}`}
                                    onClick={() => setCreateTypeAnalysis('diagram')}
                                >
                                    <img src={DiagrammIcon} alt="icons-diagram-question" className="InnerMenuIcon" />
                                    ДИАГРАММЫ
                                </button>
                                <button className={`Switch-button-inner
                                    ${createTypeAnalysis === 'AnalysisAnswers' ? 'active' : ''}`}
                                    onClick={() => setCreateTypeAnalysis('AnalysisAnswers')}
                                >
                                    <img src={AnswersIcon} alt="icons-answers-question" className="InnerMenuIcon" />
                                    ОТВЕТЫ
                                </button>
                            </div>

                            <button className="publishButton-inner" type="button" >СКАЧАТЬ XLS</button>
                        </div>
