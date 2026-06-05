'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Erro crítico da aplicação
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Ocorreu um erro inesperado. Por favor, tente novamente.
          </p>
          {error.digest && (
            <p style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
