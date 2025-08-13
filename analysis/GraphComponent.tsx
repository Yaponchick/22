import React, { useEffect, useRef } from 'react';
import { Chart, registerables, ChartType } from 'chart.js';

Chart.register(...registerables);

interface GraphProps {
  questions: {
    id?: string;
    text: string;
    type: string;
    options?: { optionText: string }[];
    answers?: {
      userId?: string;
      selectedOptionText?: string;
      text?: string;
      createdAt: string;
    }[];
  }[];
}

const GraphComponent: React.FC<GraphProps> = ({ questions }) => {
  const chartRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const chartInstances = useRef<Chart[]>([]);

  // Фильтрация и подготовка данных
  const chartData = questions
    .filter(q => ['radio', 'checkbox', 'select', 'scale'].includes(q.type) && q.answers?.length)
    .map(question => {
      // Подсчет ответов (исключая пустые)
      const answerCounts = question.answers!
        .map(a => a.selectedOptionText || a.text)
        .filter((answer): answer is string => !!answer)
        .reduce((acc, answer) => {
          acc[answer] = (acc[answer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      return {
        question,
        labels: Object.keys(answerCounts),
        data: Object.values(answerCounts),
        type: (question.type === 'checkbox' ? 'bar' : 'pie') as ChartType
      };
    });

  useEffect(() => {
    // Очистка предыдущих графиков
    chartInstances.current.forEach(chart => chart.destroy());
    chartInstances.current = [];

    // Создание новых графиков
    chartData.forEach(({ question, labels, data, type }, index) => {
      const canvas = chartRefs.current[index];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const total = data.reduce((sum, val) => sum + val, 0);
      const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC24A', '#EA80FC', '#00ACC1', '#FF5722'
      ].slice(0, labels.length);

      const chart = new Chart(ctx, {
        type,
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: question.text,
              font: { size: 14 }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw as number;
                  const percent = Math.round((value / total) * 100);
                  return `${context.label}: ${value} (${percent}%)`;
                }
              }
            }
          },
          scales: type === 'bar' ? { y: { beginAtZero: true } } : undefined
        }
      });

      chartInstances.current.push(chart);
    });

    return () => {
      chartInstances.current.forEach(chart => chart.destroy());
    };
  }, [questions]);

  if (!chartData.length) {
    return <div className="no-data-message">Нет данных для отображения графиков</div>;
  }

  return (
    <div className="charts-grid">
      {chartData.map((_, index) => (
        <div key={index} className="chart-container">
          <canvas 
            ref={el => chartRefs.current[index] = el}
            className="chart"
          />
        </div>
      ))}
    </div>
  );
};

export default GraphComponent;