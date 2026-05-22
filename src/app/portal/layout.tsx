type PortalLayoutProps = {
  children: React.ReactNode;
};

export default function PortalLayout({ children }: PortalLayoutProps) {
  return <div className="min-h-screen bg-[#172035]">{children}</div>;
}

