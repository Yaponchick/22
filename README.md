.charts-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: flex-start;
  padding: 10px;
}

.chart-container {
  width: 500px;
  height: 300px;
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-container canvas {
  max-width: 100%;
  max-height: 100%;
  margin: 0 auto;
}

.no-data-message {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
  width: 100%;
}
