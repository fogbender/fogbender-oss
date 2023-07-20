import { ErrorBoundary } from "react-error-boundary";
import { MetaProvider, Title } from "reactjs-meta";

import { ErrorPageFallback } from "./shared/ErrorPageFallback";
import AppBody from "./ui/AppBody";

const App = () => {
  return (
    <MetaProvider>
      <Title>Fogbender | Customer support for B2B</Title>
      <ErrorBoundary FallbackComponent={ErrorPageFallback}>
        <AppBody />
      </ErrorBoundary>
    </MetaProvider>
  );
};

export default App;
