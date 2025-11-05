import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-primary mb-4">
        Welcome to Crudibase
      </h1>
      <p className="text-lg text-slate-600 mb-8">
        Explore Wikibase knowledge graphs with ease
      </p>
      <div className="flex gap-4">
        <Link to="/login" className="btn-primary">
          Sign In
        </Link>
        <Link to="/register" className="btn-secondary">
          Get Started
        </Link>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Sign In</h2>
        <p className="text-slate-600">Login form coming soon...</p>
        <Link to="/" className="text-primary mt-4 inline-block">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Create Account</h2>
        <p className="text-slate-600">Registration form coming soon...</p>
        <Link to="/" className="text-primary mt-4 inline-block">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
      <p className="text-xl text-slate-600 mb-8">Page not found</p>
      <Link to="/" className="btn-primary">
        Go Home
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
