import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast, getErrorMessage } from './components/Toast';
import App from './App';
import './index.css';

// The mutation object's position in the callback args differs between TanStack versions, so find it by shape.
const findMutation = (args: unknown[]) =>
  args.find((a: any) => a && typeof a === 'object' && 'options' in a && 'state' in a) as any;

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, ...rest) => {
      // Mutations that show their own inline error opt out with meta: { silent: true }
      if (findMutation(rest)?.meta?.silent) return;
      toast.error(getErrorMessage(error));
    },
    onSuccess: (_data, ...rest) => {
      const msg = findMutation(rest)?.meta?.successMessage;
      if (typeof msg === 'string') toast.success(msg);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
