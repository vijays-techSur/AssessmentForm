// Dashboard root layout — no AuthGuard here so /dashboard/login is publicly accessible.
// AuthGuard is applied in the (protected) route group layout which wraps all other dashboard pages.
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
