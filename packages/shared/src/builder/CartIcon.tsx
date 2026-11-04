import React from 'react';
import { CreditCard, Package, ShoppingBag, ShoppingCart, Store } from 'lucide-react';
import { resolveCartIconType } from './cartPolicy';

export interface CartIconProps {
  iconType?: string | null;
  className?: string;
  size?: number;
}

export const CartIcon: React.FC<CartIconProps> = ({ iconType, className, size }) => {
  const icon = resolveCartIconType(iconType);
  const Icon =
    icon === 'ShoppingCart'
      ? ShoppingCart
      : icon === 'Package'
        ? Package
        : icon === 'Store'
          ? Store
          : icon === 'CreditCard'
            ? CreditCard
            : ShoppingBag;

  return <Icon className={className} size={size} aria-hidden="true" data-cart-icon={icon} />;
};
