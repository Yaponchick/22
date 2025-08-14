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
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: question.text,
              font: {
                size: window.innerWidth < 768 ? 12 : 14
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw as number;
                  const percent = Math.round((value / total) * 100);
                  return `${context.label}: ${value} (${percent}%)`;
                }
              }
            },
            legend: {
              position: 'bottom' as const,
              labels: {
                font: {
                  size: window.innerWidth < 768 ? 10 : 12
                }
              }
            }
          },
          scales: type === 'bar' ? {
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  size: window.innerWidth < 768 ? 10 : 12
                }
              }
            },
            x: {
              ticks: {
                font: {
                  size: window.innerWidth < 768 ? 10 : 12
                }
              }
            }
          } : undefined
        }
      });

      chartInstances.current.push(chart);
    });

    // Очистка при размонтировании
    return () => {
      chartInstances.current.forEach(chart => chart.destroy());
    };
  }, [questions]);

  if (!chartData.length) {
    return <div className="no-data-message">Нет данных для отображения графиков</div>;
  }

  return (
    <div className="charts-list">
      {chartData.map((item, index) => (
        <div
          key={index}
          className="chart-container"
          style={{
            height:
              item.type === 'bar'
                ? Math.max(300, item.labels.length * 30) // Динамическая высота для bar-чартов
                : 300
          }}
        >
          <canvas
            ref={el => (chartRefs.current[index] = el)}
            className="chart"
          />
        </div>
      ))}
    </div>

    {/* Встроенные стили (можно вынести в CSS-файл) */}
    <style jsx>{`
      .charts-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 100%;
        margin-top: 20px;
      }

      .chart-container {
        width: 100%;
        position: relative;
        border-radius: 8px;
        background: #f9f9f9;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .chart {
        width: 100% !important;
        height: 100% !important;
      }

      .no-data-message {
        text-align: center;
        color: #666;
        font-size: 16px;
        margin: 20px 0;
        padding: 20px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      @media (max-width: 768px) {
        .charts-list {
          gap: 16px;
        }
        .chart-container {
          padding: 12px;
        }
      }
    `}</style>
  );
};

export default GraphComponent;
