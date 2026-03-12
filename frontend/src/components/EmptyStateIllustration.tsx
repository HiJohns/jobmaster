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
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
    }}>
      {/* Maintenance themed SVG illustration */}
      <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background soft glow */}
        <circle cx="100" cy="80" r="60" fill="url(#bgGradient)" opacity="0.6"/>
        
        {/* Main character - friendly maintenance worker */}
        <g transform="translate(60, 40)">
          {/* Body/overall */}
          <rect x="25" y="50" width="30" height="40" rx="6" fill="#3B82F6"/>
          <rect x="30" y="55" width="20" height="30" rx="2" fill="#60A5FA"/>
          
          {/* Head */}
          <circle cx="40" cy="35" r="18" fill="#FED7AA"/>
          
          {/* Hard hat */}
          <path d="M20 30C20 20 28 12 40 12C52 12 60 20 60 30L65 32L15 32L20 30Z" fill="#F59E0B"/>
          <rect x="18" y="30" width="44" height="6" rx="2" fill="#FBBF24"/>
          
          {/* Face - friendly expression */}
          <circle cx="34" cy="36" r="2" fill="#374151"/>
          <circle cx="46" cy="36" r="2" fill="#374151"/>
          <path d="M35 44C35 44 38 47 40 47C42 47 45 44 45 44" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
          
          {/* Arms holding tools */}
          <rect x="10" y="55" width="12" height="25" rx="6" fill="#FED7AA"/>
          <rect x="58" y="55" width="12" height="25" rx="6" fill="#FED7AA"/>
          
          {/* Wrench in right hand */}
          <g transform="translate(5, 75) rotate(-30)">
            <rect x="0" y="0" width="8" height="20" rx="2" fill="#9CA3AF"/>
            <path d="M-4 20C-4 16 -2 14 0 14H8C10 14 12 16 12 20V22C12 26 8 28 4 28C0 28 -4 26 -4 22V20Z" fill="#6B7280"/>
          </g>
          
          {/* Toolbox on ground */}
          <rect x="55" y="95" width="35" height="25" rx="4" fill="#DC2626"/>
          <rect x="58" y="98" width="29" height="19" rx="2" fill="#EF4444"/>
          <rect x="65" y="90" width="15" height="8" rx="2" fill="#991B1B"/>
          
          {/* Floating sparkles */}
          <path d="M10 20L11 23L14 24L11 25L10 28L9 25L6 24L9 23L10 20Z" fill="#FCD34D"/>
          <path d="M75 25L76 28L79 29L76 30L75 33L74 30L71 29L74 28L75 25Z" fill="#60A5FA"/>
        </g>
        
        <defs>
          <radialGradient id="bgGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 80) rotate(90) scale(60)">
            <stop stopColor="#DBEAFE"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>
      
      <div style={{
        color: '#64748B',
        fontSize: '15px',
        marginTop: '24px',
        textAlign: 'center',
        lineHeight: '1.6',
        maxWidth: '280px',
      }}>
        {message}
      </div>
      
      {showAction && onAction && (
        <Button
          color="primary"
          fill="solid"
          size="middle"
          onClick={onAction}
          style={{
            marginTop: '20px',
            '--background-color': '#0033FF',
            borderRadius: '8px',
          }}
        >
          <AddOutline style={{ marginRight: '4px' }} />
          派发新任务
        </Button>
      )}
    </div>
  );
};

export default EmptyStateIllustration;
