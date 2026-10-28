import ThemeToggle from './ThemeToggle';

interface TopBarProps {
  storeName: string;
}

export default function TopBar({ storeName }: TopBarProps) {
  return (
    <header className="topbar">
      <span className="topbar-brand">
        <span className="topbar-logo" aria-hidden="true">
          S
        </span>
        ShopDesk
      </span>
      <div className="topbar-actions">
        <span className="topbar-store">{storeName}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
