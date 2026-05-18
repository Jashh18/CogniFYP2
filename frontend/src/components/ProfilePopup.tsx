import { useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import './ProfilePopup.css';

interface ProfilePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
    const { user, logout } = useAuth();
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="profile-popup" ref={popupRef}>
            <div className="profile-header">
                <div className="profile-glow"></div>
                <div className="profile-avatar">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-info">
                    <div className="profile-name">{user?.full_name || 'User'}</div>
                    <div className="profile-email">{user?.email || ''}</div>
                    <div className="profile-role">{(user as any)?.roles || (user as any)?.role || 'student'}</div>
                </div>
            </div>
            <div className="profile-actions">
                <button
                    className="btn btn-danger w-100"
                    onClick={() => {
                        onClose();
                        logout();
                    }}
                >
                    <svg style={{ marginRight: '8px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    );
}
