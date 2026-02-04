import './ErrorState.css';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  showBackButton?: boolean;
}

const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  const handleRetry = () => {
    if (onRetry) onRetry();
    else window.location.reload();
  };
  return (
    <div className="error-state text">
      <h4>Произошла ошибка</h4>
      <p>{message}</p>
      
      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={handleRetry}>
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;