import './LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <div className="spinner-circle"></div>
      </div>
      <div className="loading-text">Загрузка...</div>
    </div>
  );
};

export default LoadingSpinner;