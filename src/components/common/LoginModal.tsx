import React from 'react';
import { LoginModal as AuthLoginModal } from '../auth/LoginModal';

export const LoginModal: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen = false,
  onClose = () => {},
}) => {
  return <AuthLoginModal isOpen={isOpen} onClose={onClose} />;
};
