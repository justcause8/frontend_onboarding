import './ErrorState.css';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  showBackButton?: boolean;
}

const ErrorState = ({ message, onRetry, showBackButton = true }: ErrorStateProps) => {
  const handleRetry = () => {
    if (onRetry) onRetry();
    else window.location.reload();
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="error-state">
      <h4>Произошла ошибка</h4>
      <p>{message}</p>
      
      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={handleRetry}>
            Попробовать снова
          </button>
        )}
        
        {showBackButton && (
          <button className="btn btn-secondary" onClick={handleBack}>
            Назад
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;