import { NavLink } from 'react-router-dom';
import { getStockAlerts } from '../lib/stockAlerts';
import { useProducts } from '../store/ProductsContext';
import Icon, { type IconName } from './Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/customers', label: 'Customers', icon: 'customers' },
  { to: '/discounts', label: 'Discounts', icon: 'discounts' },
];

export default function Sidebar() {
  const { products } = useProducts();
  const alertCount = getStockAlerts(products).length;

  return (
    <nav className="sidebar" aria-label="Main">
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
            >
              <span className="sidebar-label">
                <Icon name={item.icon} />
                {item.label}
              </span>
              {item.to === '/products' && alertCount > 0 && (
                <span className="nav-badge" title={`${alertCount} products need restocking`}>
                  {alertCount}
                  <span className="visually-hidden"> low stock alerts</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
