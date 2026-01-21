import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/Index';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Toaster position="top-right" />
        <AppRoutes />
      </ErrorBoundary>
    </Router>
  );
};

export default App;