import React from 'react';

interface LogoProps {
  size?: number;
  theme?: 'light' | 'dark'; // light 用于深色背景(白图)，dark 用于白色背景(蓝图)
  showText?: boolean;
  layout?: 'vertical' | 'horizontal';
}

const Logo: React.FC<LogoProps> = ({ 
  size = 40, 
  theme = 'dark', 
  showText = true,
  layout = 'horizontal' // 默认横排
}) => {
  const iconColor = theme === 'light' ? '#ffffff' : '#0033FF';
  const textColor = theme === 'light' ? '#ffffff' : '#001529';
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: layout === 'horizontal' ? 'row' : 'column',
      alignItems: 'center', 
      gap: layout === 'horizontal' ? '12px' : '8px'
    }}>
      {/* Simplified "匠" character icon */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer square frame */}
        <rect 
          x="10" y="10" width="80" height="80" rx="8" 
          stroke={iconColor}
          strokeWidth="4"
          fill="none"
        />
        
        {/* "匠" character - simplified */}
        {/* Top horizontal stroke */}
        <line x1="25" y1="30" x2="75" y2="30" stroke={iconColor} strokeWidth="4" strokeLinecap="round"/>
        
        {/* Middle vertical/horizontal strokes forming the box */}
        <line x1="35" y1="30" x2="35" y2="70" stroke={iconColor} strokeWidth="4" strokeLinecap="round"/>
        <line x1="35" y1="50" x2="65" y2="50" stroke={iconColor} strokeWidth="4" strokeLinecap="round"/>
        <line x1="65" y1="30" x2="65" y2="70" stroke={iconColor} strokeWidth="4" strokeLinecap="round"/>
        
        {/* Bottom stroke */}
        <line x1="25" y1="70" x2="75" y2="70" stroke={iconColor} strokeWidth="4" strokeLinecap="round"/>
        
        {/* Small accent - dot/circle */}
        <circle cx="50" cy="20" r="3" fill={iconColor}/>
      </svg>
      
      {showText && (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: layout === 'horizontal' ? 'flex-start' : 'center',
          gap: '2px',
        }}>
          <span style={{ 
            fontSize: layout === 'horizontal' ? Math.max(18, size * 0.5) : Math.max(16, size * 0.45), 
            fontWeight: 700,
            color: textColor,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            letterSpacing: layout === 'horizontal' ? '0.5px' : '1px',
            lineHeight: 1.2
          }}>
            JobMaster
          </span>
          <span style={{ 
            fontSize: layout === 'horizontal' ? Math.max(12, size * 0.35) : Math.max(14, size * 0.4), 
            fontWeight: 400,
            color: textColor,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            letterSpacing: layout === 'horizontal' ? '2px' : '1px',
            lineHeight: 1.2,
            opacity: 0.8
          }}>
            工单匠
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
