import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@pipecat-ai/voice-ui-kit';
import { FullScreenContainer } from '@pipecat-ai/voice-ui-kit';

import { WebSocketApp } from './components/WebSocketApp';
import './index.css';

export const Main = () => {
  return (
    <ThemeProvider defaultTheme="terminal" disableStorage>
      <FullScreenContainer>
        <WebSocketApp />
      </FullScreenContainer>
    </ThemeProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
