/** Centered, chrome-less layout for the login / MFA screens. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-h1 font-bold tracking-tight text-brand-primary">eQMS</span>
          <p className="text-body text-muted-foreground">Pharmaceutical Quality Management</p>
        </div>
        {children}
        <footer className="mt-8 border-t border-border pt-3 text-center text-body text-foreground">
          <p>
            © 2026 <span className="text-brand-secondary">eQMS Quality Management Software</span>
          </p>
          <p>- All Rights Reserved</p>
        </footer>
      </div>
    </div>
  );
}
