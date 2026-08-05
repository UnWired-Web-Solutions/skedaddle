import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import PrintReport from "./pages/PrintReport";
import TriggerReport from "./pages/TriggerReport";
import Home from "./pages/Home";
import LocationDetail from "./pages/LocationDetail";
import Login from "./pages/Login";
import Network from "./pages/Network";
import NotFound from "./pages/NotFound";
import Resources from "./pages/Resources";
import Tools from "./pages/Tools";
import GbpImageGenerator from "./pages/GbpImageGenerator";
import Analytics from "./pages/Analytics";
import SalesforceConnect from "./pages/SalesforceConnect";
import ProposalGenerator from "./pages/ProposalGenerator";
import { Redirect, Route, Switch } from "wouter";

// Protected route — redirects to /login if not authenticated
function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (adminOnly && user?.role !== "admin") return <Redirect to="/" />;
  return <Component />;
}
function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/network">
        <ProtectedRoute component={Network} />
      </Route>
      <Route path="/tools">
        <ProtectedRoute component={Tools} />
      </Route>
      <Route path="/resources">
        <ProtectedRoute component={Resources} adminOnly />
      </Route>
      <Route path="/location/:id">
        <ProtectedRoute component={LocationDetail} />
      </Route>
      <Route path="/dashboard/:id">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/report/:id">
        <ProtectedRoute component={PrintReport} />
      </Route>
      <Route path="/trigger/:id">
        <ProtectedRoute component={TriggerReport} />
      </Route>
      <Route path="/gbp-images">
        <ProtectedRoute component={GbpImageGenerator} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} />
      </Route>
      <Route path="/salesforce">
        <ProtectedRoute component={SalesforceConnect} adminOnly />
      </Route>
      <Route path="/proposals">
        <ProtectedRoute component={ProposalGenerator} adminOnly />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
