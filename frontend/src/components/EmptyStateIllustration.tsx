import React from 'react';
import { Button } from 'antd-mobile';
import { AddOutline } from 'antd-mobile-icons';

interface EmptyStateIllustrationProps {
  message?: string;
  showAction?: boolean;
  onAction?: () => void;
}

const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({ 
  message = '暂无待处理工单，去派发新任务吧',
  showAction = true,
  onAction
}) => {
  const handleAction = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (onAction) {
      onAction();
    }
  }, [onAction]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
      {/* Minimal line-style empty list SVG */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="空状态图标">
        {/* Folder outline */}
        <path 
          d="M20 35C20 30 24 26 29 26H45L52 35H91C96 35 100 39 100 44V85C100 90 96 94 91 94H29C24 94 20 90 20 85V35Z" 
          stroke="#0033FF" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Checklist lines */}
        <line x1="35" y1="50" x2="85" y2="50" stroke="#0033FF" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="35" y1="62" x2="75" y2="62" stroke="#0033FF" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <line x1="35" y1="74" x2="65" y2="74" stroke="#0033FF" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
        
        {/* Checkmark circle */}
        <circle cx="32" cy="50" r="4" stroke="#0033FF" strokeWidth="2" fill="none"/>
        <path d="M30 50L31.5 51.5L34 49" stroke="#0033FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        
        {/* Empty circle */}
        <circle cx="32" cy="62" r="4" stroke="#0033FF" strokeWidth="2" fill="none" opacity="0.5"/>
        <circle cx="32" cy="74" r="4" stroke="#0033FF" strokeWidth="2" fill="none" opacity="0.3"/>
      </svg>
      
      <div style={{
        color: '#64748B',
        fontSize: '14px',
        marginTop: '16px',
        textAlign: 'center',
        lineHeight: '1.5',
        maxWidth: '240px',
      }}>
        {message}
      </div>
      
      {showAction && onAction && (
        <Button
          color="primary"
          fill="solid"
          size="large"
          onClick={handleAction}
          style={{
            marginTop: '24px',
            minWidth: '200px',
            '--background-color': '#0033FF',
            '--border-color': '#0033FF',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          <AddOutline style={{ marginRight: '6px', fontSize: '18px' }} />
          新建工单
        </Button>
      )}
    </div>
  );
};

export default EmptyStateIllustration;
